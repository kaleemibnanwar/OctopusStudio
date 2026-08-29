export const MAX_CHAT_TURNS_IN_CONTEXT = 3;
export const DEFAULT_MAX_TOOL_CALL_STEPS = 100;

// Economy-mode hard limits. These are strict caps applied when economy mode is
// enabled, chosen to cut token usage meaningfully while preserving quality.
export const ECONOMY_MAX_CHAT_TURNS = 2;
export const ECONOMY_MAX_OUTPUT_TOKENS = 4096;
