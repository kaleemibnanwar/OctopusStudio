import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { db } from "@/db";
import { mcpServers } from "@/db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

const logger = log.scope("browser-limb-bridge");

let bridgeProcess: ChildProcess | null = null;
const BROWSER_LIMB_NAME = "OctoLimb";
const BROWSER_LIMB_URL = "http://127.0.0.1:32527/mcp";
const BRIDGE_SCRIPT_PATH = "/home/kalim/octolimb/mcp-bridge/index.js";

/**
 * Manages the Octopus Studio Browser Limb bridge process and database sync.
 */
export async function syncBrowserLimbBridge(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      startBridgeProcess();
      await ensureMcpServerRecord(true);
    } else {
      stopBridgeProcess();
      await ensureMcpServerRecord(false);
    }
  } catch (error) {
    logger.error("Failed to sync OctoLimb bridge:", error);
  }
}

function startBridgeProcess(): void {
  if (bridgeProcess && !bridgeProcess.killed) {
    return;
  }

  logger.info("Starting OctoLimb bridge process...");
  bridgeProcess = spawn("node", [BRIDGE_SCRIPT_PATH], {
    detached: false,
    stdio: "ignore",
  });

  bridgeProcess.on("error", (err) => {
    logger.error("OctoLimb bridge process error:", err);
  });

  bridgeProcess.on("exit", (code, signal) => {
    logger.info(`OctoLimb bridge process exited with code ${code}, signal ${signal}`);
    bridgeProcess = null;
  });
}

function stopBridgeProcess(): void {
  if (bridgeProcess) {
    logger.info("Stopping OctoLimb bridge process...");
    bridgeProcess.kill("SIGTERM");
    bridgeProcess = null;
  }
}

async function ensureMcpServerRecord(enabled: boolean): Promise<void> {
  const existing = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.name, BROWSER_LIMB_NAME));

  if (existing.length === 0) {
    if (enabled) {
      await db.insert(mcpServers).values({
        name: BROWSER_LIMB_NAME,
        transport: "http",
        url: BROWSER_LIMB_URL,
        enabled: true,
        oauthEnabled: false,
      });
      logger.info("Inserted OctoLimb server record into database");
    }
  } else {
    const server = existing[0];
    if (server.enabled !== enabled) {
      await db
        .update(mcpServers)
        .set({ enabled })
        .where(eq(mcpServers.id, server.id));
      logger.info(`Updated OctoLimb server record enabled status to ${enabled}`);
    }
  }
}
