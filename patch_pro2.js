const fs = require("fs");

function replace(file, search, replacement) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    content = content.replace(search, replacement);
    fs.writeFileSync(file, content, "utf8");
  }
}

// 1. useAgentTools.ts
replace(
  "src/hooks/useAgentTools.ts",
  /export type \{ AgentToolName, AgentTool \};/,
  "export type { AgentTool };",
);

// 2. chat_stream_handlers.ts
replace(
  "src/ipc/handlers/chat_stream_handlers.ts",
  /const scheduleChatSearchIndexing = \(appId: number\) => \{\};/,
  "const scheduleChatSearchIndexing = () => {};",
);
let content = fs.readFileSync(
  "src/ipc/handlers/chat_stream_handlers.ts",
  "utf8",
);
content = content.replace(
  /import\s*\{[^}]*localAgentHandler[^}]*\}\s*from\s*"[^"]*local_agent_handler";/m,
  'const localAgentHandler = async (req: any, ctx: any, tools: any) => { throw new Error("Pro feature"); };',
);
fs.writeFileSync("src/ipc/handlers/chat_stream_handlers.ts", content, "utf8");

// 3. ipc_host.ts
content = fs.readFileSync("src/ipc/ipc_host.ts", "utf8");
content = content.replace(
  /import \{ registerThemesHandlers \} from "\.\.\/pro\/main\/ipc\/handlers\/themes_handlers";/g,
  "",
);
content = content.replace(
  /import \{ registerVisualEditingHandlers \} from "\.\.\/pro\/main\/ipc\/handlers\/visual_editing_handlers";/g,
  "",
);
content = content.replace(
  /import \{ registerAgentToolHandlers \} from "\.\.\/pro\/main\/ipc\/handlers\/local_agent\/agent_tool_handlers";/g,
  "",
);
content = content.replace(/registerThemesHandlers\(ipcMain\);/g, "");
content = content.replace(/registerVisualEditingHandlers\(ipcMain\);/g, "");
content = content.replace(/registerAgentToolHandlers\(ipcMain\);/g, "");
fs.writeFileSync("src/ipc/ipc_host.ts", content, "utf8");

// 4. response_processor.ts
replace(
  "src/ipc/processors/response_processor.ts",
  /const applySearchReplace = \(c: string, \.\.\.args: any\[\]\) => c;/,
  "const applySearchReplace = (c: string, ...args: any[]) => ({ success: true, content: c });",
);

// 5. chat_attachment_utils.ts
replace(
  "src/ipc/utils/chat_attachment_utils.ts",
  /const isSandboxScriptExecutionEnabled = \(\) => false;/,
  "const isSandboxScriptExecutionEnabled = (settings: any) => false;",
);

// 6. main.ts
content = fs.readFileSync("src/main.ts", "utf8");
content = content.replace(
  /import\s*\{[^}]*startChatSearchIndexerWorker[^}]*\}\s*from\s*"[^"]*chat_search_indexer";/m,
  "const startChatSearchIndexerWorker = () => {};",
);
fs.writeFileSync("src/main.ts", content, "utf8");
