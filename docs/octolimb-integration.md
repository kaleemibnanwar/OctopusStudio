# OctoLimb Integration Architecture

The OctoLimb enables Octopus Studio (Dyad) to control a local Chrome browser via an MCP (Model Context Protocol) bridge. The architecture connects the AI's standard tool-calling interface down into Chrome Extension APIs using an intermediary Node.js server.

Here is how the components interact:

## 1. The Three Layers

### A. Octopus Studio (Dyad Main Process)
- **Process Management:** Controlled by `src/main/browser_limb_manager.ts`. When you enable the "OctoLimb MCP Bridge" in Settings, Dyad spawns a background Node.js process to run the `mcp-bridge` using `node:child_process`.
- **Database Registration:** It registers the bridge's local URL (`http://127.0.0.1:32527/mcp`) directly into the SQLite database (`mcp_servers` table).
- **LLM Context:** When you talk to an agent in Dyad, the AI SDK fallback logic (in `chat_stream_handlers.ts`) fetches all active tools from `mcp_servers`, prefixes them, and injects them into the agent's Vercel AI SDK context.

### B. MCP Bridge (Node.js Process)
- **Location:** Resides in `nanobrowser/mcp-bridge/index.js`.
- **HTTP Server (Port 32527):** Listens for JSON-RPC MCP requests from Octopus Studio. It translates these standard MCP tool calls (like `find_and_click`, `execute_js`, `read_page`) into internal messages.
- **WebSocket Server (Port 32528):** Acts as the rendezvous point for the Chrome Extension. It holds pending tool requests until the Chrome extension connects, executes the action, and returns the result.
- **Graceful Error Handling:** If an action fails (e.g., element not found, extension disconnected), the bridge serializes this into a valid MCP `isError: true` payload, so the AI model doesn't crash and can gracefully recover.

### C. Chrome Extension
- **Location:** Resides in `nanobrowser/chrome-extension`.
- **WebSocket Client:** The background script (`background/index.ts`) persistently tries to connect to `ws://127.0.0.1:32528`.
- **Execution Engine:** When it receives a `tool_call` from the bridge, the extension executes the requested action using native Chrome Extension APIs (like `chrome.debugger`, `chrome.tabs`, or injecting content scripts to build DOM trees).
- **Keep-Alive:** Uses `chrome.alarms` to prevent the background service worker from suspending while it waits for AI instructions.

## 2. The Request Flow (End-to-End)

When you prompt: *"using browser limb mcp: post something on x"*

1. **Generation:** The AI determines it needs to navigate to X and type text, so it emits a tool call (e.g., `BrowserLimb__navigate`).
2. **SDK Routing:** Octopus Studio intercepts the tool call, matches the prefix, and routes it via `@ai-sdk/mcp` to `http://127.0.0.1:32527/mcp`.
3. **Bridge Translation:** `mcp-bridge` receives the JSON-RPC call, validates the tool name, and sends a `{ type: 'tool_call' }` payload over the WebSocket to the extension.
4. **Browser Action:** The Chrome extension receives the WebSocket message, uses its `BrowserContext` to execute the action (e.g., changing the URL), waits for the DOM to settle, and returns a `{ type: 'tool_result' }` payload to the WebSocket.
5. **Response:** The bridge receives the result and forwards it back to Octopus Studio as a JSON-RPC response.
6. **Continuation:** Octopus Studio receives the tool result, formats it into XML (`<octopus-studio-mcp-tool-result>`), displays it in the chat UI, and hands the context back to the AI model to plan its next step (e.g., `find_and_click` the "Post" button).

## 3. Tool Name Mapping
To prevent namespace collisions if multiple MCP servers are active, Octopus Studio automatically prefixes tool names. A tool registered in the bridge as `find_and_click` becomes `BrowserLimb__find_and_click` in the agent's context. The Vercel SDK maps this safely back to the original `find_and_click` command when querying the bridge.
