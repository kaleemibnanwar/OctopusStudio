import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import fsExtra from "fs-extra";
import { generateCuteAppName } from "../../lib/utils";
import { normalizePath } from "../../../shared/normalizePath";
import { isPathIgnoredByGitIgnore } from "./gitignore_utils";

// Directories to exclude when scanning files
const EXCLUDED_DIRS = ["node_modules", ".git", ".next"];

/**
 * Recursively gets all files in a directory, excluding node_modules and .git
 * @param dir The directory to scan
 * @param baseDir The base directory for calculating relative paths
 * @returns Array of file paths relative to the base directory
 */
export function getFilesRecursively(dir: string, baseDir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const dirents = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];

  for (const dirent of dirents) {
    const res = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      // For directories, concat the results of recursive call
      // Exclude specified directories
      if (!EXCLUDED_DIRS.includes(dirent.name)) {
        files.push(...getFilesRecursively(res, baseDir));
      }
    } else {
      // For files, add the relative path
      files.push(normalizePath(path.relative(baseDir, res)));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

// Electron's patched `fs` module virtualizes any `.asar` path as a directory
// (so packaged app code can `readdir`/`readFile` into it), which breaks
// `fs.copyFile` on it. If a source tree being imported happens to contain a
// `.asar` (e.g. a previously-built Electron app), treat it as the single
// opaque file it actually is on disk, using Electron's unpatched `original-fs`
// to bypass the asar virtualization.
async function copyFileHandlingAsar(srcPath: string, destPath: string) {
  if (srcPath.endsWith(".asar") && process.versions.electron) {
    const originalFs = require("original-fs") as typeof import("node:fs");
    await originalFs.promises.copyFile(srcPath, destPath);
    return;
  }
  await fsPromises.copyFile(srcPath, destPath);
}

export async function copyDirectoryRecursive(
  source: string,
  destination: string,
  // Root of the copy, so nested recursive calls still resolve .gitignore
  // patterns (which are relative to the project root) correctly. Callers
  // never pass this — it's set once we recurse.
  rootSource: string = source,
) {
  await fsPromises.mkdir(destination, { recursive: true });
  const entries = await fsPromises.readdir(source, { withFileTypes: true });
  // Why do we sort? This ensures stable ordering of files across platforms
  // which is helpful for tests (and has no practical downsides).
  entries.sort();

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    // `.asar` files report as directories under Electron's patched `fs`
    // (see copyFileHandlingAsar above), so exclude them from the recursion
    // even though `isDirectory()` says otherwise.
    const isRealDirectory = entry.isDirectory() && !entry.name.endsWith(".asar");

    // Exclude node_modules outright: it's regenerable and can be huge.
    if (entry.name === "node_modules") {
      continue;
    }
    // Respect the source project's own .gitignore (but never skip .git
    // itself, which isn't subject to it). Real-world projects routinely
    // gitignore multi-gigabyte content — Python venvs, downloaded model
    // weights, build output — that would otherwise get copied file-by-file
    // and turn what should be an instant import into a copy that runs for
    // hours and looks like the app is just doing nothing.
    if (
      entry.name !== ".git" &&
      (await isPathIgnoredByGitIgnore({
        basePath: rootSource,
        filePath: srcPath,
        isDirectory: isRealDirectory,
      }))
    ) {
      continue;
    }

    if (isRealDirectory) {
      await copyDirectoryRecursive(srcPath, destPath, rootSource);
    } else {
      await copyFileHandlingAsar(srcPath, destPath);
    }
  }
}

export async function writeMigrationFile(
  appPath: string,
  queryContent: string,
  queryDescription?: string,
): Promise<string> {
  const migrationsDir = path.join(appPath, "supabase", "migrations");
  await fsExtra.ensureDir(migrationsDir);

  const files = await fsExtra.readdir(migrationsDir);
  const migrationNumbers = files
    .map((file) => {
      const match = file.match(/^(\d{4})_/);
      return match ? parseInt(match[1], 10) : -1;
    })
    .filter((num) => num !== -1);

  const nextMigrationNumber =
    migrationNumbers.length > 0 ? Math.max(...migrationNumbers) + 1 : 0;
  const paddedNumber = String(nextMigrationNumber).padStart(4, "0");

  let description = "migration";
  if (queryDescription) {
    description = queryDescription.toLowerCase().replace(/[\s\W-]+/g, "_");
  } else {
    description = generateCuteAppName().replace(/-/g, "_");
  }

  const migrationFileName = `${paddedNumber}_${description}.sql`;
  const migrationFilePath = path.join(migrationsDir, migrationFileName);

  await fsExtra.writeFile(migrationFilePath, queryContent);
  return normalizePath(path.relative(appPath, migrationFilePath));
}

export async function fileExists(filePath: string) {
  return fsPromises
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}
