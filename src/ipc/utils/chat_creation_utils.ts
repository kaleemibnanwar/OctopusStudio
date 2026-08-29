import { db } from "../../db";
import { apps, chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";
import type { ChatMode } from "../../lib/schemas";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { getOctopusStudioAppPath } from "../../paths/paths";
import { getCurrentCommitHash } from "./git_utils";
import { getInitialChatModeForNewChat } from "../handlers/chat_mode_resolution";
import { assertAppChatCreationOpen } from "../services/app_chat_creation_fence";
import {
  appOperationCoordinator,
  readAppResource,
} from "../services/app_operation_coordinator";

const logger = log.scope("chat_creation_utils");

export async function createChatForApp({
  appId,
  title,
  initialChatMode,
}: {
  appId: number;
  title?: string;
  initialChatMode?: ChatMode;
}): Promise<number> {
  assertAppChatCreationOpen(appId);
  return appOperationCoordinator.run(
    {
      appId,
      operation: "create-chat",
      resources: [
        readAppResource("app-path"),
        "chat-membership",
        readAppResource("repository"),
      ],
      // A recording holds `repository` as a write claim for its whole session,
      // and a read conflicts with it, so every New Chat entry point would sit
      // unresponsive until the session ends or hits the 30-minute cap.
      refuseWhenRecording: "start a new chat",
    },
    async () => {
      // App deletion installs its fences before draining admitted operations.
      // A creator either commits before deletion snapshots children or is
      // rejected before it can add a late child.
      assertAppChatCreationOpen(appId);
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
        columns: { path: true, type: true },
      });
      if (!app) {
        throw new OctopusStudioError(
          "App not found",
          OctopusStudioErrorKind.NotFound,
        );
      }

      let initialCommitHash = null;
      // Chat projects have no code on disk — there's no commit hash to capture.
      if (app.type !== "chat") {
        try {
          initialCommitHash = await getCurrentCommitHash({
            path: getOctopusStudioAppPath(app.path),
          });
        } catch (error) {
          logger.error("Error getting git revision:", error);
        }
      }

      const chatMode =
        (await getInitialChatModeForNewChat(initialChatMode)) ??
        (app.type === "chat" ? "local-agent" : null);
      const [chat] = await db
        .insert(chats)
        .values({ appId, title, initialCommitHash, chatMode })
        .returning();
      logger.info(
        "Created chat:",
        chat.id,
        "for app:",
        appId,
        "with initial commit hash:",
        initialCommitHash,
      );
      return chat.id;
    },
  );
}
