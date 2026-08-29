const fs = require("fs");

// 1. chat_stream_handlers.ts
let content = fs.readFileSync(
  "src/ipc/handlers/chat_stream_handlers.ts",
  "utf8",
);
content = content.replace(
  /import\s*\{[^}]*scheduleChatSearchIndexing[^}]*\}\s*from\s*"[^"]*chat_search_indexer";/m,
  "const scheduleChatSearchIndexing = () => {};",
);
content = content.replace(
  /import\s*\{[^}]*localAgentHandler[^}]*\}\s*from\s*"[^"]*local_agent_handler";/m,
  'const localAgentHandler = async (req: any, ctx: any, tools: any) => { throw new Error("Pro feature"); };',
);
fs.writeFileSync("src/ipc/handlers/chat_stream_handlers.ts", content, "utf8");

// 2. main.ts
content = fs.readFileSync("src/main.ts", "utf8");
content = content.replace(
  /import\s*\{[^}]*cleanupOldAiMessagesJson[^}]*\}\s*from\s*"[^"]*ai_messages_cleanup";/m,
  "const cleanupOldAiMessagesJson = async () => {};",
);
content = content.replace(
  /import\s*\{[^}]*chat_search_indexer[^}]*\}\s*from\s*"[^"]*chat_search_indexer";/m,
  "const startChatSearchIndexerWorker = () => {};\nconst stopChatSearchIndexer = () => {};",
);
fs.writeFileSync("src/main.ts", content, "utf8");
