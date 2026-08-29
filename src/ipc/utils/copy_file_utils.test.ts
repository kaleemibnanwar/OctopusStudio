import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeCopyFile } from "./copy_file_utils";

const {
  deploySupabaseFunction,
  findApp,
  gitAdd,
  resolveAppPath,
  resolveChatProjectRootPath,
} = vi.hoisted(() => ({
  deploySupabaseFunction: vi.fn(),
  findApp: vi.fn(),
  gitAdd: vi.fn(),
  resolveAppPath: vi.fn(),
  resolveChatProjectRootPath: vi.fn(),
}));

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("./git_utils", () => ({ gitAdd }));
vi.mock("@/db", () => ({
  db: { query: { apps: { findFirst: findApp } } },
}));
vi.mock("@/paths/paths", () => ({
  getOctopusStudioAppPath: resolveAppPath,
  getChatProjectRootPath: resolveChatProjectRootPath,
}));
vi.mock("../../supabase_admin/supabase_management_client", () => ({
  deploySupabaseFunction,
}));

describe.runIf(process.platform !== "win32")(
  "executeCopyFile canonical mutation paths",
  () => {
    let appPath: string;

    beforeEach(async () => {
      appPath = await fs.mkdtemp(
        path.join(os.tmpdir(), "octopus-studio-copy-app-"),
      );
      await fs.mkdir(
        path.join(appPath, "supabase", "functions", "hello-world"),
        { recursive: true },
      );
      await fs.writeFile(path.join(appPath, "source.txt"), "copied");
      await fs.symlink(".", path.join(appPath, "self"), "dir");
      gitAdd.mockResolvedValue(undefined);
      deploySupabaseFunction.mockResolvedValue(undefined);
      findApp.mockResolvedValue({
        id: 987654,
        path: appPath,
        supabaseProjectId: "project-id",
        supabaseOrganizationSlug: null,
      });
      resolveAppPath.mockImplementation((value: string) => value);
    });

    afterEach(async () => {
      await fs.rm(appPath, { recursive: true, force: true });
      vi.clearAllMocks();
    });

    it("uses the physical path for writes, git, and Supabase classification", async () => {
      await executeCopyFile({
        from: "source.txt",
        to: "self/supabase/functions/hello-world/index.ts",
        appId: 987654,
      });

      await expect(
        fs.readFile(
          path.join(
            appPath,
            "supabase",
            "functions",
            "hello-world",
            "index.ts",
          ),
          "utf8",
        ),
      ).resolves.toBe("copied");
      expect(gitAdd).toHaveBeenCalledWith({
        path: appPath,
        filepath: "supabase/functions/hello-world/index.ts",
      });
      expect(deploySupabaseFunction).toHaveBeenCalledWith({
        supabaseProjectId: "project-id",
        functionName: "hello-world",
        appPath,
        organizationSlug: null,
      });
    });

    it("resolves chat projects to their workspace folder instead of app.path", async () => {
      // Chat projects store "" as a sentinel app.path (see db/schema.ts); the
      // real workspace lives wherever getChatProjectRootPath resolves it,
      // which must be what write AND read both use — resolveAppPath (the
      // app.path-based resolver) must never be consulted for a chat project.
      findApp.mockResolvedValue({
        id: 42,
        type: "chat",
        path: "",
        directory: null,
        supabaseProjectId: null,
        supabaseOrganizationSlug: null,
      });
      resolveChatProjectRootPath.mockReturnValue(appPath);
      resolveAppPath.mockImplementation(() => {
        throw new Error(
          "getOctopusStudioAppPath must not be used for chat projects",
        );
      });

      await executeCopyFile({
        from: "source.txt",
        to: "notes/copied.txt",
        appId: 42,
      });

      await expect(
        fs.readFile(path.join(appPath, "notes", "copied.txt"), "utf8"),
      ).resolves.toBe("copied");
      expect(resolveChatProjectRootPath).toHaveBeenCalledWith(null, 42);
    });

    it("does not fail the copy when git add fails (e.g. no repo)", async () => {
      gitAdd.mockRejectedValue(new Error("not a git repository"));

      await expect(
        executeCopyFile({
          from: "source.txt",
          to: "copied.txt",
          appId: 987654,
        }),
      ).resolves.toBeDefined();

      await expect(
        fs.readFile(path.join(appPath, "copied.txt"), "utf8"),
      ).resolves.toBe("copied");
    });
  },
);
