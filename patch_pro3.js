const fs = require("fs");

let content = fs.readFileSync(
  "src/ipc/handlers/chat_stream_handlers.ts",
  "utf8",
);
content = content.replace(
  /import \{[\s\S]*?\} from "\.\.\/\.\.\/pro\/main\/ipc\/handlers\/local_agent\/local_agent_handler";/g,
  'const localAgentHandler = async (req: any, ctx: any, tools: any) => { throw new Error("Pro feature"); };',
);
fs.writeFileSync("src/ipc/handlers/chat_stream_handlers.ts", content, "utf8");

content = fs.readFileSync("src/ipc/ipc_host.ts", "utf8");
content = content.replace(/registerThemesHandlers\(\);/g, "");
content = content.replace(/registerVisualEditingHandlers\(\);/g, "");
content = content.replace(/registerAgentToolHandlers\(\);/g, "");
fs.writeFileSync("src/ipc/ipc_host.ts", content, "utf8");

content = fs.readFileSync("src/ipc/processors/response_processor.ts", "utf8");
content = content.replace(
  /const applySearchReplace = \(c: string, \.\.\.args: any\[\]\) => \(\{ success: true, content: c \}\);/g,
  'const applySearchReplace = (c: string, ...args: any[]) => ({ success: true, content: c, error: "" });',
);
fs.writeFileSync("src/ipc/processors/response_processor.ts", content, "utf8");

content = fs.readFileSync("src/main.ts", "utf8");
content = content.replace(
  /import \{[\s\S]*?\} from "\.\/pro\/main\/ipc\/handlers\/local_agent\/chat_search_indexer";/g,
  "const startChatSearchIndexerWorker = () => {};",
);
fs.writeFileSync("src/main.ts", content, "utf8");
