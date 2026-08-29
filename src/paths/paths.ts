import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { IS_TEST_BUILD } from "../ipc/utils/test_utils";
import { readSettings } from "../main/settings";

// Cached result of getOctopusStudioAppsBaseDirectory
let cachedBaseDirectory: string | null = null;
let cachedCustomFolderSetting: string | null | undefined;
// Whether `octopus-studio-apps` has been created
let defaultDirCreated = false;
// Whether the `octopus-studio-projects` base directory has been created
let projectsDirCreated = false;

/**
 * Gets the default path of the base octopus-studio-apps directory (without a specific app subdirectory)
 */
export function getDefaultOctopusStudioAppsDirectory(): string {
  if (IS_TEST_BUILD) {
    const electron = getElectron();
    return path.join(
      electron!.app.getPath("userData"),
      "octopusstudio-projects/apps",
    );
  }
  return path.join(os.homedir(), "octopusstudio-projects/apps");
}

/**
 * Gets the base directory where auto-created chat (codeless) project folders
 * live, creating it on first use. This is the chat-project sibling of the
 * octopus-studio-apps base directory (e.g. `~/octopus-studio-projects`), used when a chat project
 * is created without the user picking an explicit workspace folder.
 */
export function getOctopusStudioProjectsBaseDirectory(): string {
  const base = IS_TEST_BUILD
    ? path.join(
        getElectron()!.app.getPath("userData"),
        "octopusstudio-projects/general",
      )
    : path.join(os.homedir(), "octopusstudio-projects/general");
  if (!projectsDirCreated) {
    try {
      fs.mkdirSync(base, { recursive: true });
      projectsDirCreated = true;
    } catch {
      // Fall through; callers surface a toast if the folder can't be created.
    }
  }
  return base;
}

/**
 * Gets the default path of the base octopus-studio-apps directory (without a specific app subdirectory),
 * but creates the directory the first time that this function is called
 */
function resolveDefaultOctopusStudioAppsDirectory(): string {
  const defaultDir = getDefaultOctopusStudioAppsDirectory();
  if (!defaultDirCreated) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
      defaultDirCreated = true;
    } catch {
      // Fall through; if it fails then the user will see error toasts
      // when they try to do anything meaningful, but we don't want OctopusStudio to crash
    }
  }
  return defaultDir;
}

/**
 * Clears base directory cache, so the next call to getOctopusStudioAppsBaseDirectory will re-read the settings
 */
export function invalidateOctopusStudioAppsBaseDirectoryCache(): void {
  cachedBaseDirectory = null;
  cachedCustomFolderSetting = undefined;
}

/**
 * Returns the cached value of the custom folder path
 */
export function getCustomFolderCache(): string | null | undefined {
  return cachedCustomFolderSetting;
}

/**
 * Gets the user's preferred apps directory path (without a specific app subdirectory)
 */
export function getOctopusStudioAppsBaseDirectory(): string {
  const appsPath =
    cachedBaseDirectory ??
    (cachedCustomFolderSetting = readSettings().customAppsFolder) ??
    resolveDefaultOctopusStudioAppsDirectory();

  cachedBaseDirectory = appsPath;
  return cachedBaseDirectory;
}

/**
 * Given a path, determines whether that path exists, is a directory, and is writable.
 * Can determine, for example, whether the output of `getOctopusStudioAppsBaseDirectory` is usable
 */
export function isDirectoryAccessible(directoryPath: string): boolean {
  try {
    const st = fs.statSync(directoryPath);
    if (!st.isDirectory()) return false;
    fs.accessSync(directoryPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getOctopusStudioAppPath(appPath: string): string {
  // If appPath is already absolute, use it as-is
  if (path.isAbsolute(appPath)) {
    return appPath;
  }
  // Otherwise, use the user's preferred base path
  return path.join(getOctopusStudioAppsBaseDirectory(), appPath);
}

/**
 * Resolve the on-disk root for a chat (codeless) project. If the user selected
 * a custom `directory` on the project, that is the workspace root (used for
 * context and for reading/writing Markdown docs). Otherwise it falls back to
 * the per-project folder under the user data directory. This is the single
 * source of truth so the preview pane and the agent see the same folder.
 */
export function getChatProjectRootPath(
  directory: string | null | undefined,
  projectId: number,
): string {
  if (
    directory &&
    fs.existsSync(directory) &&
    fs.statSync(directory).isDirectory()
  ) {
    return path.resolve(directory);
  }
  return path.join(getUserDataPath(), "chat-projects", String(projectId));
}

/**
 * Given an app path, determines whether that path is accessible within the filesystem.
 * The input to this function is assumed to be the result of `getOctopusStudioAppPath`.
 */
export function isAppLocationAccessible(resolvedPath: string): boolean {
  const containingFolder = path.dirname(resolvedPath);
  return isDirectoryAccessible(containingFolder);
}

export function getTypeScriptCachePath(): string {
  const electron = getElectron();
  return path.join(electron!.app.getPath("sessionData"), "typescript-cache");
}

/**
 * Gets the user data path, handling both Electron and non-Electron environments
 * In Electron: returns the app's userData directory
 * In non-Electron: returns "./userData" in the current directory
 */

export function getUserDataPath(): string {
  const electron = getElectron();
  const devUserDataDir = process.env.OCTOPUS_STUDIO_DEV_USER_DATA_DIR?.trim();

  if (process.env.NODE_ENV === "development" && devUserDataDir) {
    return path.resolve(devUserDataDir);
  }

  // When running in Electron and app is ready
  if (process.env.NODE_ENV !== "development" && electron) {
    return electron!.app.getPath("userData");
  }

  // For development or when the Electron app object isn't available
  return path.resolve("./userData");
}

/**
 * Get a reference to electron in a way that won't break in non-electron environments
 */
export function getElectron(): typeof import("electron") | undefined {
  let electron: typeof import("electron") | undefined;
  try {
    // Check if we're in an Electron environment
    if (process.versions.electron) {
      electron = require("electron");
    }
  } catch {
    // Not in Electron environment
  }
  return electron;
}
