import fs from "node:fs";
import path from "node:path";
import log from "electron-log";
import { assertMutationPathAllowed, safeJoin } from "./path_utils";
import { gitAdd } from "./git_utils";
import {
  OCTOPUS_STUDIO_MEDIA_DIR_NAME,
  isWithinOctopusStudioMediaDir,
  resolveAttachmentLogicalPath,
} from "./media_path_utils";
import {
  appOperationCoordinator,
  readAppResource,
} from "../services/app_operation_coordinator";
import { deploySupabaseFunction } from "../../supabase_admin/supabase_management_client";
import {
  isServerFunction,
  isSharedServerModule,
  extractFunctionNameFromPath,
} from "../../supabase_admin/supabase_utils";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getChatProjectRootPath, getOctopusStudioAppPath } from "@/paths/paths";

const logger = log.scope("copy_file_utils");

export interface CopyFileResult {
  /** Whether the destination is a shared server module */
  sharedModuleChanged: boolean;
  /** Function deploy skipped because a shared server module changed first */
  skippedFunctionDeploy?: string;
  /** Error from Supabase function deployment, if any */
  deployError?: unknown;
}

/**
 * Copy a file within a OctopusStudio app, with security validation, git staging,
 * and optional Supabase function deployment.
 *
 * @throws Error if an absolute source path is outside the app's .octopusStudio/media directory.
 *   Relative paths are resolved within the app root (consistent with write_file access).
 * @throws Error if the source file does not exist
 */
export async function executeCopyFile({
  from,
  to,
  appId,
  isSharedModulesChanged,
}: {
  from: string;
  to: string;
  appId: number;
  isSharedModulesChanged?: boolean;
}): Promise<CopyFileResult> {
  const normalizedSource = from.replaceAll("\\", "/");
  const readsMedia =
    from.startsWith("attachments:") ||
    path.isAbsolute(from) ||
    normalizedSource === OCTOPUS_STUDIO_MEDIA_DIR_NAME ||
    normalizedSource.startsWith(`${OCTOPUS_STUDIO_MEDIA_DIR_NAME}/`);
  return appOperationCoordinator.run(
    {
      appId,
      operation: "copy-app-file",
      resources: [
        readAppResource("app-path"),
        readAppResource("provider"),
        ...(readsMedia ? [readAppResource("media")] : []),
        "repository",
      ],
    },
    async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      if (!app) {
        throw new OctopusStudioError(
          "App not found",
          OctopusStudioErrorKind.NotFound,
        );
      }
      // Chat projects have no `app.path` (sentinel "") and resolve to their
      // workspace folder instead — matches how ctx.appPath was resolved for
      // this same turn in local_agent_handler.ts. Re-deriving from app.path
      // here without this branch silently pointed at the base apps directory.
      const appPath =
        app.type === "chat"
          ? getChatProjectRootPath(app.directory, app.id)
          : getOctopusStudioAppPath(app.path);
      const { supabaseProjectId, supabaseOrganizationSlug } = app;

      // Resolve the source path: allow both .octopusStudio/media paths and app-relative paths
      let fromFullPath: string;
      if (from.startsWith("attachments:")) {
        const attachment = await resolveAttachmentLogicalPath(appPath, from);
        if (!attachment) {
          throw new OctopusStudioError(
            `Attachment does not exist: ${from}`,
            OctopusStudioErrorKind.NotFound,
          );
        }
        fromFullPath = attachment.filePath;
      } else if (path.isAbsolute(from)) {
        // Security: only allow absolute paths within the app's .octopusStudio/media directory
        if (!isWithinOctopusStudioMediaDir(from, appPath)) {
          throw new Error(
            `Absolute source paths are only allowed within the .octopusStudio/media directory`,
          );
        }
        fromFullPath = path.resolve(from);
      } else {
        fromFullPath = safeJoin(appPath, from);
      }

      const operationPath = await assertMutationPathAllowed({
        appPath,
        relativePath: to,
      });
      const toFullPath = safeJoin(appPath, operationPath);

      if (!fs.existsSync(fromFullPath)) {
        throw new OctopusStudioError(
          `Source file does not exist: ${from}`,
          OctopusStudioErrorKind.NotFound,
        );
      }

      // Security: resolve symlinks and re-validate that paths remain within bounds.
      // path.resolve() does not follow symlinks, so an attacker could place a
      // symlink inside the allowed directory that points outside it.
      const realFromPath = fs.realpathSync(fromFullPath);
      const resolvedAppPath = fs.realpathSync(appPath);
      if (
        path.isAbsolute(from) &&
        !isWithinOctopusStudioMediaDir(realFromPath, resolvedAppPath)
      ) {
        throw new Error(
          `Source path resolves to a location outside the .octopusStudio/media directory (possible symlink traversal)`,
        );
      }
      if (
        !path.isAbsolute(from) &&
        !realFromPath.startsWith(resolvedAppPath + path.sep) &&
        realFromPath !== resolvedAppPath
      ) {
        throw new Error(
          `Source path resolves to a location outside the app directory (possible symlink traversal)`,
        );
      }

      // Track if this involves shared modules
      const sharedModuleChanged = isSharedServerModule(operationPath);

      // Ensure destination directory exists
      const dirPath = path.dirname(toFullPath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Copy the file (do not follow symlinks at destination)
      fs.copyFileSync(fromFullPath, toFullPath);
      logger.log(`Successfully copied file: ${fromFullPath} -> ${toFullPath}`);

      // Add to git. Chat projects have no git repo (and app-type dirs might
      // not either, e.g. mid-import), so a failure here must not undo a copy
      // that already succeeded on disk.
      try {
        await gitAdd({ path: appPath, filepath: operationPath });
      } catch (error) {
        logger.warn(`Failed to git add copied file ${to}:`, error);
      }

      // Deploy Supabase function if applicable
      const effectiveSharedModulesChanged =
        isSharedModulesChanged || sharedModuleChanged;
      let deployError: unknown;
      let skippedFunctionDeploy: string | undefined;
      if (supabaseProjectId && isServerFunction(operationPath)) {
        const functionName = extractFunctionNameFromPath(operationPath);
        if (!effectiveSharedModulesChanged) {
          try {
            await deploySupabaseFunction({
              supabaseProjectId,
              functionName,
              appPath,
              organizationSlug: supabaseOrganizationSlug ?? null,
            });
          } catch (error) {
            logger.error(
              "Failed to deploy Supabase function after copy:",
              error,
            );
            deployError = error;
          }
        } else {
          skippedFunctionDeploy = functionName;
        }
      }

      return {
        sharedModuleChanged,
        skippedFunctionDeploy,
        deployError,
      };
    },
  );
}
