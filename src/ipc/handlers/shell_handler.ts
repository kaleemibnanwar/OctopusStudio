import { app, shell } from "electron";
import log from "electron-log";
import path from "node:path";
import { createLoggedHandler } from "./safe_handle";
import { IS_TEST_BUILD } from "../utils/test_utils";
import { isFileWithinAnyOctopusStudioMediaDir } from "../utils/media_path_utils";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { registerOctopusStudioProtocolLinux } from "../../main/linux_protocol_registration";

const logger = log.scope("shell_handlers");
const handle = createLoggedHandler(logger);

// Hosts whose OAuth flows redirect back into the app via a octopusStudio:// deep link
// (Neon, Supabase, and OctopusStudio Pro all live under *.octopusStudio.sh).
function isOctopusStudioOAuthUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "octopusStudio.sh" || host.endsWith(".octopusStudio.sh");
  } catch {
    return false;
  }
}

// Only allow opening files with known safe media extensions via shell.openPath.
// This prevents execution of arbitrary executables even if they reside under a
// .octopusStudio/media directory.
const ALLOWED_MEDIA_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".mp3",
  ".mp4",
  ".wav",
  ".ogg",
  ".webm",
]);

export function registerShellHandlers() {
  handle("open-external-url", async (_event, url: string) => {
    if (!url) {
      throw new OctopusStudioError(
        "No URL provided.",
        OctopusStudioErrorKind.External,
      );
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error("Attempted to open invalid or non-http URL: " + url);
    }
    // In E2E test mode, skip actually opening external URLs to avoid browser windows
    if (IS_TEST_BUILD) {
      logger.debug("E2E test mode: skipped opening external URL:", url);
      return;
    }
    // On Linux, dev and packaged builds share the single octopusStudio:// scheme and it's
    // "last registration wins", so launching the packaged app steals the handler
    // and OAuth callbacks (octopusStudio://neon-oauth-return, etc.) open packaged instead
    // of this dev instance. Reclaim the handler just before the browser opens so
    // the callback routes back here. Best-effort; the helper self-guards platform.
    if (
      !app.isPackaged &&
      process.platform === "linux" &&
      isOctopusStudioOAuthUrl(url)
    ) {
      await registerOctopusStudioProtocolLinux(app.getPath("userData"));
    }
    await shell.openExternal(url);
    logger.debug("Opened external URL:", url);
  });

  handle("show-item-in-folder", async (_event, fullPath: string) => {
    // Validate that a path was provided
    if (!fullPath) {
      throw new OctopusStudioError(
        "No file path provided.",
        OctopusStudioErrorKind.External,
      );
    }

    shell.showItemInFolder(fullPath);
    logger.debug("Showed item in folder:", fullPath);
  });

  handle("open-file-path", async (_event, fullPath: string) => {
    if (!fullPath) {
      throw new OctopusStudioError(
        "No file path provided.",
        OctopusStudioErrorKind.External,
      );
    }

    // Security: only allow opening files within .octopusStudio/media subdirectories.
    // The octopus-studio-apps tree contains AI-generated code, so opening arbitrary files
    // there via shell.openPath could execute malicious executables.
    // App paths may be under the default octopus-studio-apps base directory (normal) or
    // at an external location (imported with skipCopy).
    if (!isFileWithinAnyOctopusStudioMediaDir(fullPath)) {
      throw new OctopusStudioError(
        "Can only open files within .octopusStudio/media directories.",
        OctopusStudioErrorKind.External,
      );
    }
    const resolvedPath = path.resolve(fullPath);

    // Defense-in-depth: only allow known media file extensions
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
      throw new Error(
        `File type '${ext}' is not allowed. Only media files can be opened.`,
      );
    }

    const result = await shell.openPath(resolvedPath);
    if (result) {
      // shell.openPath returns an error string if it fails, empty string on success
      throw new OctopusStudioError(
        `Failed to open file: ${result}`,
        OctopusStudioErrorKind.External,
      );
    }
    logger.debug("Opened file:", resolvedPath);
  });
}
