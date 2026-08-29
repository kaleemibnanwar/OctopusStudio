import fs from "node:fs";
import path from "node:path";
import { BrowserWindow, dialog } from "electron";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getChatProjectRootPath } from "@/paths/paths";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { createTypedHandler } from "./base";
import {
  chatProjectContracts,
  type ChatProjectFileNode,
} from "../types/chat_project";

// Directories that are never shown in a chat project's read-only preview.
const SKIPPED_DIRS = new Set([
  ".git",
  ".github",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".cache",
  ".octopusStudio",
]);

// Cap the walk so a runaway docs folder can't hang the renderer.
const MAX_DEPTH = 8;
const MAX_ENTRIES = 4000;
// Files larger than this are refused in the preview (read-only, not executed).
const MAX_FILE_BYTES = 512 * 1024;
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mdx"]);

const DEFAULT_README = `# Chat project

This is a codeless workspace. Use the chat to ask for notes, plans, and
documents — they'll be written here as Markdown files and rendered in this
preview pane.

## What you can do here

- Ask the assistant to draft, edit, or summarize documents.
- View the project's files and folders in the tree on the left.
- Open any \`.md\` file to render it (read-only). Other files open as text.
`;

/**
 * Resolve the on-disk root directory for a chat project. If the user selected a
 * custom `directory` on the project, that is used as the workspace root (for
 * context and for reading/writing Markdown docs). Otherwise it falls back to a
 * per-project folder under the app's user data directory.
 */
async function getProjectRoot(projectId: number): Promise<string> {
  const project = await db.query.apps.findFirst({
    where: eq(apps.id, projectId),
    columns: { directory: true },
  });
  return getChatProjectRootPath(project?.directory ?? null, projectId);
}

/** Only expose chat projects (never a coding app) through this preview. */
async function assertChatProject(projectId: number): Promise<void> {
  const project = await db.query.apps.findFirst({
    where: eq(apps.id, projectId),
    columns: { type: true },
  });
  if (!project || project.type !== "chat") {
    throw new OctopusStudioError(
      "Chat project not found",
      OctopusStudioErrorKind.NotFound,
    );
  }
}

/**
 * Resolve a user-supplied relative path inside the project root, refusing any
 * path that escapes it (path-traversal guard). This is a read-only boundary.
 */
function resolveInsideRoot(root: string, relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized.includes("\0") || normalized.split("/").includes("..")) {
    throw new OctopusStudioError(
      "Invalid file path",
      OctopusStudioErrorKind.Validation,
    );
  }
  const target = path.resolve(root, normalized);
  const rootResolved = path.resolve(root);
  if (target !== rootResolved && !target.startsWith(rootResolved + path.sep)) {
    throw new OctopusStudioError(
      "Invalid file path",
      OctopusStudioErrorKind.Validation,
    );
  }
  return target;
}

function walk(
  root: string,
  dir: string,
  relativeDir: string,
  nodes: ChatProjectFileNode[],
  depth: number,
): void {
  if (depth > MAX_DEPTH || nodes.length >= MAX_ENTRIES) {
    return;
  }
  let names: fs.Dirent[];
  try {
    names = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  names.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) {
      return a.isDirectory() ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (const entry of names) {
    if (nodes.length >= MAX_ENTRIES) {
      return;
    }
    const name = entry.name;
    const relativePath = relativeDir ? `${relativeDir}/${name}` : name;
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(name)) {
        continue;
      }
      nodes.push({ name, path: relativePath, type: "dir" });
      walk(root, path.join(dir, name), relativePath, nodes, depth + 1);
      continue;
    }
    if (!entry.isFile()) {
      continue; // skip symlinks and sockets — read-only and safe
    }
    let size: number | undefined;
    try {
      size = fs.statSync(path.join(dir, name)).size;
    } catch {
      size = undefined;
    }
    const ext = path.extname(name).toLowerCase();
    nodes.push({
      name,
      path: relativePath,
      type: "file",
      size,
      isMarkdown: MARKDOWN_EXTENSIONS.has(ext),
    });
  }
}

function seedIfEmpty(root: string): void {
  fs.mkdirSync(root, { recursive: true });
  let hasVisibleFile = false;
  try {
    hasVisibleFile = fs
      .readdirSync(root)
      .some((name) => !SKIPPED_DIRS.has(name));
  } catch {
    return;
  }
  if (!hasVisibleFile) {
    fs.writeFileSync(path.join(root, "README.md"), DEFAULT_README, "utf8");
  }
}

export function registerChatProjectHandlers() {
  createTypedHandler(chatProjectContracts.listFiles, async (_, projectId) => {
    await assertChatProject(projectId);
    const root = await getProjectRoot(projectId);
    seedIfEmpty(root);
    const nodes: ChatProjectFileNode[] = [];
    walk(root, root, "", nodes, 0);
    return nodes;
  });

  createTypedHandler(chatProjectContracts.pickDirectory, async (event) => {
    // Pass the originating window so the native dialog opens as a modal sheet
    // attached to it. Without a parent, opening the picker steals focus and can
    // dismiss the React dialog behind it (and the app loses its place).
    const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const options: Electron.OpenDialogOptions = {
      title: "Select chat project directory",
      properties: ["openDirectory", "createDirectory"],
      message:
        "Choose a folder for this codeless project to read and write Markdown documents.",
    };
    const { filePaths, canceled } = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    if (canceled || filePaths.length === 0) {
      return { path: null, canceled: true };
    }
    return { path: filePaths[0], canceled: false };
  });

  createTypedHandler(
    chatProjectContracts.setDirectory,
    async (_, { projectId, directory }) => {
      await assertChatProject(projectId);
      if (directory) {
        if (!path.isAbsolute(directory)) {
          throw new OctopusStudioError(
            "Directory path must be absolute",
            OctopusStudioErrorKind.Validation,
          );
        }
        if (
          !fs.existsSync(directory) ||
          !fs.statSync(directory).isDirectory()
        ) {
          throw new OctopusStudioError(
            "Selected path is not a directory",
            OctopusStudioErrorKind.Validation,
          );
        }
      }
      await db
        .update(apps)
        .set({ directory: directory ? path.resolve(directory) : null })
        .where(eq(apps.id, projectId));
    },
  );

  createTypedHandler(
    chatProjectContracts.readFile,
    async (_, { projectId, path: relativePath }) => {
      await assertChatProject(projectId);
      const root = await getProjectRoot(projectId);
      const target = resolveInsideRoot(root, relativePath);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(target);
      } catch {
        throw new OctopusStudioError(
          "File not found",
          OctopusStudioErrorKind.NotFound,
        );
      }
      if (!stat.isFile()) {
        throw new OctopusStudioError(
          "Not a file",
          OctopusStudioErrorKind.Validation,
        );
      }
      if (stat.size > MAX_FILE_BYTES) {
        throw new OctopusStudioError(
          "This file is too large to preview",
          OctopusStudioErrorKind.Validation,
        );
      }
      const content = fs.readFileSync(target, "utf8");
      const ext = path.extname(target).toLowerCase();
      return { content, isMarkdown: MARKDOWN_EXTENSIONS.has(ext) };
    },
  );

  createTypedHandler(
    chatProjectContracts.writeFile,
    async (_, { projectId, path: relativePath, content }) => {
      await assertChatProject(projectId);
      const root = await getProjectRoot(projectId);
      seedIfEmpty(root);
      const target = resolveInsideRoot(root, relativePath);
      if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
        throw new OctopusStudioError(
          "This file is too large to save",
          OctopusStudioErrorKind.Validation,
        );
      }
      try {
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
          throw new OctopusStudioError(
            "Cannot write to a folder",
            OctopusStudioErrorKind.Validation,
          );
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, "utf8");
      } catch (error) {
        if (error instanceof OctopusStudioError) throw error;
        throw new OctopusStudioError(
          "Could not save the file",
          OctopusStudioErrorKind.Conflict,
        );
      }
      const ext = path.extname(target).toLowerCase();
      return {
        content,
        isMarkdown: MARKDOWN_EXTENSIONS.has(ext),
      };
    },
  );
}
