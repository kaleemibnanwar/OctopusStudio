const fs = require("fs");

function replace(file, search, replacement) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    content = content.replace(search, replacement);
    fs.writeFileSync(file, content, "utf8");
  }
}

// Tests to remove
if (fs.existsSync("src/__tests__/evals/chat_history.eval.ts"))
  fs.unlinkSync("src/__tests__/evals/chat_history.eval.ts");
if (fs.existsSync("src/__tests__/evals/plumbing_check.eval.ts"))
  fs.unlinkSync("src/__tests__/evals/plumbing_check.eval.ts");

// OctopusStudioSearchReplace.tsx
replace(
  "src/components/chat/OctopusStudioSearchReplace.tsx",
  /import { parseSearchReplaceBlocks } from ".*";/,
  "const parseSearchReplaceBlocks = (c: string) => [] as any[];",
);

// PreviewIframe.tsx
replace(
  "src/components/preview_panel/PreviewIframe.tsx",
  /import { Annotator } from ".*";/,
  "const Annotator = (props: any) => null;",
);

// useAgentTools.ts
replace(
  "src/hooks/useAgentTools.ts",
  /import type { AgentToolName } from ".*";/,
  "export type AgentToolName = string;",
);

// chat_stream_handlers.ts
replace(
  "src/ipc/handlers/chat_stream_handlers.ts",
  /import { scheduleChatSearchIndexing } from ".*";/,
  "const scheduleChatSearchIndexing = (appId: number) => {};",
);
replace(
  "src/ipc/handlers/chat_stream_handlers.ts",
  /import \{\n? *localAgentHandler,?\n?\} from ".*local_agent_handler";/,
  'const localAgentHandler = async (req: any, ctx: any, tools: any) => { throw new Error("Pro feature"); };',
);

// ipc_host.ts
replace(
  "src/ipc/ipc_host.ts",
  /import { registerThemesHandlers } from ".*themes_handlers";\nimport { registerVisualEditingHandlers } from ".*visual_editing_handlers";\nimport { registerAgentToolHandlers } from ".*agent_tool_handlers";/,
  "",
);
replace(
  "src/ipc/ipc_host.ts",
  / *registerThemesHandlers\(ipcMain\);\n *registerVisualEditingHandlers\(ipcMain\);\n *registerAgentToolHandlers\(ipcMain\);\n/,
  "",
);

// response_processor.ts
replace(
  "src/ipc/processors/response_processor.ts",
  /import { applySearchReplace } from ".*search_replace_processor";/,
  "const applySearchReplace = (c: string, ...args: any[]) => c;",
);

// chat_attachment_utils.ts
replace(
  "src/ipc/utils/chat_attachment_utils.ts",
  /import { isSandboxScriptExecutionEnabled } from ".*execute_sandbox_script";/,
  "const isSandboxScriptExecutionEnabled = () => false;",
);

// main.ts
replace(
  "src/main.ts",
  /import { cleanupOldAiMessagesJson } from ".*ai_messages_cleanup";/,
  "const cleanupOldAiMessagesJson = async () => {};",
);
replace(
  "src/main.ts",
  /import \{\n? *startChatSearchIndexerWorker,?\n?\} from ".*chat_search_indexer";/,
  "const startChatSearchIndexerWorker = () => {};",
);

// system_prompt.ts
replace(
  "src/prompts/system_prompt.ts",
  /import { TURBO_EDITS_V2_SYSTEM_PROMPT } from ".*turbo_edits_v2_prompt";/,
  'const TURBO_EDITS_V2_SYSTEM_PROMPT = "";',
);
