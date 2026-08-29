import { createTypedHandler } from "./base";
import { agentContracts } from "../types/agent";

export function registerAgentToolHandlers() {
  createTypedHandler(agentContracts.getTools, async () => {
    return [];
  });

  createTypedHandler(agentContracts.setConsent, async () => {
    // noop
  });
}
