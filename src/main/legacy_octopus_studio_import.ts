import path from "node:path";
import fs from "node:fs";
import { app, dialog } from "electron";
import Database from "better-sqlite3";
import log from "electron-log";

const logger = log.scope("legacy_octopus_studio_import");

const LEGACY_SETTINGS_FILE = "user-settings.json";
const LEGACY_DB_FILE = "sqlite.db";
const IMPORT_MARKER_FILE = ".legacy-octopus-studio-import-checked";

export interface LegacyOctopusStudioData {
  legacyUserDataPath: string;
  hasSettings: boolean;
  hasDatabase: boolean;
}

/**
 * Where the pre-rename "OctopusStudio" build's userData lived. Electron's own
 * `userData` path is `appData/<app name>`, and `appData` itself already
 * resolves the right OS-specific base (and respects XDG_CONFIG_HOME on
 * Linux) — only the old app name ("octopus-studio") differs.
 */
export function getLegacyOctopusStudioUserDataPath(): string {
  return path.join(app.getPath("appData"), "octopus-studio");
}

/**
 * Detect an importable pre-rename OctopusStudio install: a settings file and/or
 * database sitting in the old userData directory, which is a different
 * directory than this build's userData (since the app name changed).
 */
export function findLegacyOctopusStudioData(): LegacyOctopusStudioData | null {
  const legacyUserDataPath = getLegacyOctopusStudioUserDataPath();
  const currentUserDataPath = app.getPath("userData");
  if (path.resolve(legacyUserDataPath) === path.resolve(currentUserDataPath)) {
    return null;
  }

  const hasSettings = fs.existsSync(
    path.join(legacyUserDataPath, LEGACY_SETTINGS_FILE),
  );
  const hasDatabase = fs.existsSync(
    path.join(legacyUserDataPath, LEGACY_DB_FILE),
  );
  if (!hasSettings && !hasDatabase) {
    return null;
  }
  return { legacyUserDataPath, hasSettings, hasDatabase };
}

function getImportMarkerPath(): string {
  return path.join(app.getPath("userData"), IMPORT_MARKER_FILE);
}

/**
 * Only offer the import once: skip if this build already has its own
 * database (real use, or a previous "Start Fresh"/"Import" answer already
 * handled it) or if the user has already been asked before.
 */
export function shouldOfferLegacyImport(): boolean {
  if (fs.existsSync(getImportMarkerPath())) {
    return false;
  }
  const currentDbPath = path.join(app.getPath("userData"), LEGACY_DB_FILE);
  if (fs.existsSync(currentDbPath)) {
    return false;
  }
  return findLegacyOctopusStudioData() !== null;
}

function writeImportMarker(): void {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(getImportMarkerPath(), new Date().toISOString(), "utf8");
  } catch (error) {
    logger.warn("Failed to write legacy import marker", error);
  }
}

/**
 * Copy the legacy database using SQLite's backup API (not a raw file copy)
 * so any data still sitting in the WAL file is safely consolidated, matching
 * the approach BackupManager already uses for in-place upgrade backups.
 */
async function importLegacyDatabase(
  legacyUserDataPath: string,
  currentUserDataPath: string,
): Promise<boolean> {
  const legacyDbPath = path.join(legacyUserDataPath, LEGACY_DB_FILE);
  const currentDbPath = path.join(currentUserDataPath, LEGACY_DB_FILE);
  const sourceDb = new Database(legacyDbPath, { timeout: 10000 });
  try {
    sourceDb.pragma("wal_checkpoint(TRUNCATE)");
    await sourceDb.backup(currentDbPath);
    return true;
  } catch (error) {
    logger.error("Failed to import legacy database", error);
    return false;
  } finally {
    sourceDb.close();
  }
}

function importLegacySettings(
  legacyUserDataPath: string,
  currentUserDataPath: string,
): boolean {
  try {
    fs.copyFileSync(
      path.join(legacyUserDataPath, LEGACY_SETTINGS_FILE),
      path.join(currentUserDataPath, LEGACY_SETTINGS_FILE),
    );
    return true;
  } catch (error) {
    logger.error("Failed to import legacy settings", error);
    return false;
  }
}

export async function importLegacyOctopusStudioData(
  legacy: LegacyOctopusStudioData,
): Promise<{ importedSettings: boolean; importedDatabase: boolean }> {
  const currentUserDataPath = app.getPath("userData");
  fs.mkdirSync(currentUserDataPath, { recursive: true });

  const importedSettings = legacy.hasSettings
    ? importLegacySettings(legacy.legacyUserDataPath, currentUserDataPath)
    : false;
  const importedDatabase = legacy.hasDatabase
    ? await importLegacyDatabase(legacy.legacyUserDataPath, currentUserDataPath)
    : false;

  return { importedSettings, importedDatabase };
}

/**
 * Call once, early in startup (before the database is initialized so a
 * fresh migration goes through the normal migration path on first read).
 * Best-effort and non-fatal: any failure here must not block startup.
 */
export async function maybeOfferLegacyOctopusStudioImport(): Promise<void> {
  try {
    if (!shouldOfferLegacyImport()) {
      return;
    }
    const legacy = findLegacyOctopusStudioData();
    if (!legacy) {
      return;
    }

    const { response } = await dialog.showMessageBox({
      type: "question",
      buttons: ["Import My Data", "Start Fresh"],
      defaultId: 0,
      cancelId: 1,
      title: "Import from OctopusStudio?",
      message:
        "We found an existing OctopusStudio installation on this computer.",
      detail:
        "Octopus Studio can import your settings, chats, and app history from it so you don't have to set up again.\n\n" +
        "Note: because of how your operating system secures saved credentials, provider API keys and connected-service logins (GitHub, Supabase, Neon, etc.) will need to be re-entered after importing.",
    });

    // Write the marker regardless of the answer — this is a one-time offer.
    writeImportMarker();

    if (response !== 0) {
      logger.info("User declined legacy OctopusStudio data import");
      return;
    }

    const result = await importLegacyOctopusStudioData(legacy);
    logger.info("Legacy OctopusStudio data import finished", result);

    if (result.importedSettings || result.importedDatabase) {
      await dialog.showMessageBox({
        type: "info",
        title: "Import complete",
        message: "Your OctopusStudio data has been imported.",
        detail:
          "Chats, apps, and settings should now be available. If any provider API keys or connected services stopped working, re-enter them in Settings.",
      });
    } else {
      await dialog.showMessageBox({
        type: "warning",
        title: "Import failed",
        message: "We couldn't import your existing OctopusStudio data.",
        detail: "Starting fresh instead. Check the app logs for details.",
      });
    }
  } catch (error) {
    logger.error("Legacy OctopusStudio import check failed", error);
  }
}
