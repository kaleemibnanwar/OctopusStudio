import type { McpCatalogEntry } from "@/ipc/types/mcp_catalog";
import { getRemoteMcpCatalog } from "@/ipc/shared/remote_mcp_catalog";
import { LOCAL_MCP_CATALOG } from "@/ipc/shared/local_mcp_catalog";

/**
 * The full catalog a user sees: the bundled local list of verified real MCP
 * servers, plus whatever the hosted catalog adds — merged so the app never
 * shows an empty Plugins catalog offline or before the hosted endpoint is
 * deployed. A remote entry with the same slug wins, so the hosted catalog
 * can supersede a bundled entry later without a duplicate showing up.
 *
 * Kept in its own module (rather than alongside getRemoteMcpCatalog) so
 * tests that mock @/ipc/shared/remote_mcp_catalog can intercept the fetch
 * this function depends on via a normal cross-module import.
 */
export async function getMcpCatalog(): Promise<McpCatalogEntry[]> {
  const remote = await getRemoteMcpCatalog();
  const bySlug = new Map<string, McpCatalogEntry>();
  for (const entry of LOCAL_MCP_CATALOG) bySlug.set(entry.slug, entry);
  for (const entry of remote) bySlug.set(entry.slug, entry);
  return [...bySlug.values()];
}
