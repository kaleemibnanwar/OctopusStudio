import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";

let appDataDir: string;
let userDataDir: string;

const { showMessageBox } = vi.hoisted(() => ({ showMessageBox: vi.fn() }));

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name === "appData") return appDataDir;
      if (name === "userData") return userDataDir;
      throw new Error(`unexpected getPath(${name})`);
    },
  },
  dialog: {
    showMessageBox,
  },
}));

// Imported after the mock is registered so the module under test picks it up.
import {
  findLegacyOctopusStudioData,
  shouldOfferLegacyImport,
  importLegacyOctopusStudioData,
  maybeOfferLegacyOctopusStudioImport,
  getLegacyOctopusStudioUserDataPath,
} from "@/main/legacy_octopus_studio_import";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeLegacyDb(legacyPath: string): void {
  const db = new Database(path.join(legacyPath, "sqlite.db"));
  db.exec("CREATE TABLE apps (id INTEGER PRIMARY KEY, name TEXT)");
  db.prepare("INSERT INTO apps (name) VALUES (?)").run("my-old-app");
  db.close();
}

describe("legacy_octopus_studio_import", () => {
  beforeEach(() => {
    const root = makeTempDir("legacy-octopus-studio-import-");
    appDataDir = path.join(root, "appdata");
    userDataDir = path.join(root, "current-userdata");
    fs.mkdirSync(appDataDir, { recursive: true });
    fs.mkdirSync(userDataDir, { recursive: true });
    showMessageBox.mockReset();
  });

  afterEach(() => {
    fs.rmSync(path.dirname(appDataDir), { recursive: true, force: true });
  });

  it("computes the legacy userData path as appData/octopusStudio", () => {
    expect(getLegacyOctopusStudioUserDataPath()).toBe(
      path.join(appDataDir, "octopus-studio"),
    );
  });

  it("finds nothing when there is no legacy install", () => {
    expect(findLegacyOctopusStudioData()).toBeNull();
    expect(shouldOfferLegacyImport()).toBe(false);
  });

  it("detects a legacy settings file and/or database", () => {
    const legacyPath = getLegacyOctopusStudioUserDataPath();
    fs.mkdirSync(legacyPath, { recursive: true });
    fs.writeFileSync(
      path.join(legacyPath, "user-settings.json"),
      JSON.stringify({ selectedModel: { provider: "openai", name: "gpt" } }),
    );
    writeLegacyDb(legacyPath);

    const found = findLegacyOctopusStudioData();
    expect(found).toEqual({
      legacyUserDataPath: legacyPath,
      hasSettings: true,
      hasDatabase: true,
    });
    expect(shouldOfferLegacyImport()).toBe(true);
  });

  it("does not offer import once this build already has its own database", () => {
    const legacyPath = getLegacyOctopusStudioUserDataPath();
    fs.mkdirSync(legacyPath, { recursive: true });
    writeLegacyDb(legacyPath);
    fs.writeFileSync(path.join(userDataDir, "sqlite.db"), "already-in-use");

    expect(shouldOfferLegacyImport()).toBe(false);
  });

  it("does not offer import twice (marker file)", () => {
    const legacyPath = getLegacyOctopusStudioUserDataPath();
    fs.mkdirSync(legacyPath, { recursive: true });
    writeLegacyDb(legacyPath);
    fs.writeFileSync(
      path.join(userDataDir, ".legacy-octopus-studio-import-checked"),
      "2024-01-01",
    );

    expect(shouldOfferLegacyImport()).toBe(false);
  });

  it("imports the settings file and backs up the database contents", async () => {
    const legacyPath = getLegacyOctopusStudioUserDataPath();
    fs.mkdirSync(legacyPath, { recursive: true });
    fs.writeFileSync(
      path.join(legacyPath, "user-settings.json"),
      JSON.stringify({ hello: "world" }),
    );
    writeLegacyDb(legacyPath);

    const legacy = findLegacyOctopusStudioData()!;
    const result = await importLegacyOctopusStudioData(legacy);

    expect(result).toEqual({ importedSettings: true, importedDatabase: true });
    expect(
      JSON.parse(
        fs.readFileSync(path.join(userDataDir, "user-settings.json"), "utf8"),
      ),
    ).toEqual({ hello: "world" });

    const importedDb = new Database(path.join(userDataDir, "sqlite.db"), {
      readonly: true,
    });
    const row = importedDb
      .prepare("SELECT name FROM apps WHERE id = 1")
      .get() as { name: string };
    importedDb.close();
    expect(row.name).toBe("my-old-app");
  });

  it("imports when the user accepts the prompt and writes the marker", async () => {
    const legacyPath = getLegacyOctopusStudioUserDataPath();
    fs.mkdirSync(legacyPath, { recursive: true });
    writeLegacyDb(legacyPath);
    showMessageBox.mockResolvedValueOnce({ response: 0 });

    await maybeOfferLegacyOctopusStudioImport();

    expect(fs.existsSync(path.join(userDataDir, "sqlite.db"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(userDataDir, ".legacy-octopus-studio-import-checked"),
      ),
    ).toBe(true);
    // A second call must not prompt again.
    showMessageBox.mockClear();
    await maybeOfferLegacyOctopusStudioImport();
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it("skips the import and still marks as asked when the user declines", async () => {
    const legacyPath = getLegacyOctopusStudioUserDataPath();
    fs.mkdirSync(legacyPath, { recursive: true });
    writeLegacyDb(legacyPath);
    showMessageBox.mockResolvedValueOnce({ response: 1 });

    await maybeOfferLegacyOctopusStudioImport();

    expect(fs.existsSync(path.join(userDataDir, "sqlite.db"))).toBe(false);
    expect(
      fs.existsSync(
        path.join(userDataDir, ".legacy-octopus-studio-import-checked"),
      ),
    ).toBe(true);
  });
});
