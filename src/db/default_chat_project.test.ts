import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { setDatabaseForTesting } from "@/db";
import {
  DEFAULT_CHAT_PROJECT_NAME,
  ensureDefaultChatProject,
  getDefaultChatProject,
  listProjectsByType,
} from "@/db/default_chat_project";
import { apps } from "@/db/schema";
import { createInMemoryTestDb, type TestDb } from "@/testing/test_db";

describe("default chat project", () => {
  let db: TestDb;

  beforeEach(() => {
    db = createInMemoryTestDb();
    setDatabaseForTesting(db);
  });

  afterEach(() => {
    setDatabaseForTesting(null);
    db.$client.close();
  });

  describe("ensureDefaultChatProject", () => {
    it("creates the default chat project when none exists", async () => {
      const created = await ensureDefaultChatProject();

      expect(created.name).toBe(DEFAULT_CHAT_PROJECT_NAME);
      expect(created.type).toBe("chat");
      expect(created.isDefaultChatProject).toBe(true);
      expect(created.path).toBe("");
    });

    it("is idempotent — returns the existing project on later calls", async () => {
      const first = await ensureDefaultChatProject();
      const second = await ensureDefaultChatProject();

      expect(second.id).toBe(first.id);

      const defaults = await db.query.apps.findMany({
        where: eq(apps.isDefaultChatProject, true),
      });
      expect(defaults).toHaveLength(1);
    });

    it("re-creates the project if it was deleted", async () => {
      await ensureDefaultChatProject();
      await db.delete(apps);

      const recreated = await ensureDefaultChatProject();
      expect(recreated.name).toBe(DEFAULT_CHAT_PROJECT_NAME);
      expect(recreated.isDefaultChatProject).toBe(true);
    });
  });

  describe("getDefaultChatProject", () => {
    it("returns undefined when no default project exists", async () => {
      expect(await getDefaultChatProject()).toBeUndefined();
    });

    it("returns the default project after seeding", async () => {
      await ensureDefaultChatProject();

      const project = await getDefaultChatProject();
      expect(project).not.toBeNull();
      expect(project?.isDefaultChatProject).toBe(true);
    });
  });

  describe("listProjectsByType", () => {
    it("separates coding projects from chat projects", async () => {
      db.insert(apps).values({ name: "My App", path: "/tmp/my-app" }).run();
      await ensureDefaultChatProject();

      const coding = await listProjectsByType("app");
      const chats = await listProjectsByType("chat");

      expect(coding.map((a) => a.name)).toEqual(["My App"]);
      expect(chats.map((a) => a.name)).toEqual([DEFAULT_CHAT_PROJECT_NAME]);
    });

    it("gives newly created coding apps the 'app' type by default", async () => {
      db.insert(apps)
        .values({ name: "Another App", path: "/tmp/another" })
        .run();

      const coding = await listProjectsByType("app");
      expect(coding.map((a) => a.type)).toEqual(["app"]);
    });
  });
});
