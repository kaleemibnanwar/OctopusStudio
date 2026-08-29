import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { apps } from "./schema";

export const DEFAULT_CHAT_PROJECT_NAME = "Chats";

/**
 * The single pre-seeded chat project that holds quick/random chats. Guaranteed
 * to exist after `ensureDefaultChatProject()` runs at startup. At most one row
 * may exist, enforced by the `apps_default_chat_project_unique` partial index.
 */
export async function getDefaultChatProject() {
  return db.query.apps.findFirst({
    where: eq(apps.isDefaultChatProject, true),
  });
}

/**
 * Idempotently create the default chat project. Safe to call on every startup:
 * it re-creates the project if it was deleted, so the "quick chat" entry point
 * always has a home.
 */
export async function ensureDefaultChatProject() {
  const existing = await getDefaultChatProject();
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(apps)
    .values({
      name: DEFAULT_CHAT_PROJECT_NAME,
      type: "chat",
      // Sentinel: chat projects have no code on disk. See schema.ts note.
      path: "",
      isDefaultChatProject: true,
    })
    .returning();
  return created;
}

/**
 * List projects of a given kind. Coding projects are `type === "app"`; chat
 * projects are `type === "chat"`.
 */
export async function listProjectsByType(type: "app" | "chat") {
  return db.query.apps.findMany({
    where: eq(apps.type, type),
    orderBy: [desc(apps.createdAt)],
  });
}
