const fs = require("fs");

function replaceStr(file, find, replace) {
  let content = fs.readFileSync(file, "utf8");
  content = content.split(find).join(replace);
  fs.writeFileSync(file, content, "utf8");
}

// 1. chat_stream_handlers.ts
let content = fs.readFileSync(
  "src/ipc/handlers/chat_stream_handlers.ts",
  "utf8",
);
content = content.replace(
  /import \{ scheduleChatSearchIndexing \} from "\.\.\/\.\.\/pro\/main\/ipc\/handlers\/local_agent\/chat_search_indexer";/,
  "const scheduleChatSearchIndexing = () => {};",
);
content = content.replace(
  /import \{\n  localAgentHandler,\n\} from "\.\.\/\.\.\/pro\/main\/ipc\/handlers\/local_agent\/local_agent_handler";/,
  'const localAgentHandler = async (req: any, ctx: any, tools: any) => { throw new Error("Pro feature"); };',
);
// Wait, the call is scheduleChatSearchIndexing() which is fine because my stub takes no args.
fs.writeFileSync("src/ipc/handlers/chat_stream_handlers.ts", content, "utf8");

// 2. ipc_host.ts
content = fs.readFileSync("src/ipc/ipc_host.ts", "utf8");
content = content.replace(
  /import \{ registerThemesHandlers \} from "\.\.\/pro\/main\/ipc\/handlers\/themes_handlers";/,
  "",
);
content = content.replace(
  /import \{ registerVisualEditingHandlers \} from "\.\.\/pro\/main\/ipc\/handlers\/visual_editing_handlers";/,
  "",
);
content = content.replace(
  /import \{ registerAgentToolHandlers \} from "\.\.\/pro\/main\/ipc\/handlers\/local_agent\/agent_tool_handlers";/,
  "",
);
content = content.replace(/registerThemesHandlers\(ipcMain\);/, "");
content = content.replace(/registerVisualEditingHandlers\(ipcMain\);/, "");
content = content.replace(/registerAgentToolHandlers\(ipcMain\);/, "");
fs.writeFileSync("src/ipc/ipc_host.ts", content, "utf8");

// 3. response_processor.ts
content = fs.readFileSync("src/ipc/processors/response_processor.ts", "utf8");
content = content.replace(
  /import \{ applySearchReplace \} from "\.\.\/\.\.\/pro\/main\/ipc\/processors\/search_replace_processor";/,
  'const applySearchReplace = (c: string, ...args: any[]) => ({ success: true, content: c, error: "" });',
);
fs.writeFileSync("src/ipc/processors/response_processor.ts", content, "utf8");

// 4. main.ts
content = fs.readFileSync("src/main.ts", "utf8");
content = content.replace(
  /import \{ cleanupOldAiMessagesJson \} from "\.\/pro\/main\/ipc\/handlers\/local_agent\/ai_messages_cleanup";/,
  "const cleanupOldAiMessagesJson = async () => {};",
);
content = content.replace(
  /import \{\n  startChatSearchIndexerWorker,\n  stopChatSearchIndexer,\n\} from "\.\/pro\/main\/ipc\/handlers\/local_agent\/chat_search_indexer";/,
  "const startChatSearchIndexerWorker = () => {};\nconst stopChatSearchIndexer = () => {};",
);
fs.writeFileSync("src/main.ts", content, "utf8");
