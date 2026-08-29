# Chat Projects (standalone chats + doc artifacts)

## Goal

Add a second kind of top-level project alongside the existing **coding projects**
(`apps`). Coding projects stay exactly as they are. The new **chat project** is a
Claude-Desktop-style workspace: normal conversations that can use MCP servers and
run actions, but are not tied to a codebase. A pre-seeded **default chat project**
holds quick/random chats, and a **"+ chat"** button at the bottom of the sidebar
spawns a new quick chat. Later, chat projects can also emit **doc artifacts**
(`.md` files) on request — this is a follow-on phase.

## Current architecture (as of this plan)

- `apps` is the only top-level entity. It is a full code project: `path` NOT NULL,
  git, Supabase/Neon/Vercel columns, preview.
- `chats.appId` is `NOT NULL` — every conversation belongs to an app. `chats.chatMode`
  is `build | ask | local-agent | plan`, all modes _about_ an app.
- Chat creation: `ipc.chat.createChat` → `createChatForApp({ appId, ... })`
  (`src/ipc/utils/chat_creation_utils.ts`). Listing: `useChats(appId)` →
  `ipc.chat.getChats(appId)`.
- The agent loop (`src/app_run/`, `src/chat_stream/`) and its tool set
  (`src/components/chat/OctopusStudio*.tsx`, `src/pro/.../local_agent/tools/`) assume an app
  with a path/git/preview.
- MCP is already wired into the agent (`src/ipc/utils/mcp_manager.ts`,
  `OctopusStudioMcpToolCall.tsx`, consent/auto-approve) — so MCP support in a chat project is
  about _enabling it in a codebase-less loop_, not building MCP from scratch.
- Sidebar is `src/components/app-sidebar.tsx` (rail: Apps/Settings/Library/Templates/
  Plugins) rendering `AppList` and `ChatList`; footer lives in `SidebarFooter`.

## Design decision: `apps` becomes a typed project table

Instead of introducing a parallel `chat_projects` table and relaxing `chats.appId`
(which is the most heavily traversed FK in the codebase), we keep `chats.appId`
`NOT NULL` and make the **parent** polymorphic:

1. Add `type` to `apps`: `"app" | "chat"`, `NOT NULL`, default `"app"`.
2. Add `is_default_chat_project` boolean with a partial unique index (exactly one
   default chat project).
3. **`path` stays `NOT NULL`**; chat projects use `""` as a sentinel. (Tried
   nullable `path` first, but it produced ~190 type errors across app/git/supabase
   handlers — a ripple far too large for a foundational phase. `type` is the real
   discriminator, and "list coding apps" queries filter on it before touching
   `path`.)

This leaves every existing `chat -> app` join intact. App-only machinery guards on
`type === "app"`. "Chat project" reads as a first-class project everywhere projects
are listed, without a rename migration.

## Phases

### Phase 1 — Data model + seed (backend) ✅ done

- New drizzle migration: add `apps.type`, `is_default_chat_project` + partial
  unique index (`drizzle/0045_steady_stardust.sql`). Update `src/db/schema.ts`.
- `ensureDefaultChatProject()` (idempotent, called from `main.ts` startup) seeds
  one default chat project (`name: "Chats"`, `type: "chat"`, `path: ""`,
  `is_default_chat_project: true`).
- Queries in `src/db/default_chat_project.ts`: `getDefaultChatProject()`,
  `listProjectsByType(type)`.
- Filtered all "list coding apps" queries (`listApps`, `mention_apps`,
  `app_name_resolution`) by `type === "app"` so the seeded project doesn't leak
  into coding-project UI or null-path paths.
- Unit tests in `src/db/default_chat_project.test.ts`.

### Phase 2 — Agent routing for chat projects (backend)

- ✅ Tool gating: added `projectType?: "app" | "chat"` to `AgentContext`
  (`tools/types.ts`), a `CODE_ONLY_TOOL_NAMES` set + gate in `shouldIncludeTool`
  (`tool_definitions.ts`), and wired `projectType: chat.app.type` in
  `local_agent_handler.ts`. Chat projects keep web/search/image/chat-history/todo/
  MCP-search tools; code-only tools (file edit, git, code read, db/integrations,
  tests, lifecycle, sandbox, blueprint) are filtered out. Tested
  (`tool_definitions.test.ts`).
- ✅ Handler-level tolerance: `local_agent_handler.ts` now derives `isChatProject`
  from `chat.app.type` and, for chat projects, uses `appPath = ""`, skips
  `loadTodos`/`ensureOctopusStudioGitignored`/`detectFrameworkType` (todos are ephemeral,
  no `.gitignore` write, `frameworkType = null`).
- ✅ `createChatForApp`: skips `getCurrentCommitHash` for chat projects.
- ⏳ Chat-stream routing + a chat-project system-prompt variant.
- ⏳ For `type === "chat"`: ensure MCP tools are injected (not just the search
  helpers) so the agent can call them.

For the full end-to-end path (Phase 2 + 3), a chat project still needs the UI to
let the user open a chat in it — that's the "+ chat" sidebar entry in Phase 3.

### Phase 3 — UI (renderer)

- Sidebar: add a **"Chats"** rail item that surfaces the default chat project's chat
  list (mirroring how "Apps" shows `AppList`).
- **"+ chat"** button in `SidebarFooter`: creates a new quick chat in the default chat
  project and navigates to `/chat`.
- Chat page (`src/pages/chat.tsx` + `ChatHeader`/`MessagesList`): when the chat's
  project `type === "chat"`, hide app-only chrome (preview pane, commit/file list,
  git, code search, build modes) and show a clean conversation with MCP tool results.
- Route: confirm `/chat` search params resolve a chat-project chat without an app id.

### Phase 4 — Doc artifacts (`.md`)

- Add an **artifact** concept: when the user asks, the agent writes a Markdown
  document (a `.md` artifact attached to the chat/message, or a virtual docs folder).
- Render in an artifact viewer (Claude-Code-artifacts style) with copy/export.
- Scope/UX to be decided when Phase 3 is done.

## Out of scope (for now)

- Rich-text/Notion-style editor — docs are Markdown artifacts, not a WYSIWYG editor.
- Renaming `apps` → `projects` across the codebase (cosmetic; deferred).

## Risks / open questions

- **`apps.path` nullability** ripples: every read of `app.path` must tolerate null.
  Audit `sortApps`, preview/git/github/integration code paths during Phase 1/2.
- **Agent runtime coupling**: the loop is deeply app-shaped; the cleanest seam for
  "no codebase" needs to be located in Phase 2 before committing to it.
- **Default project identity**: prefer `is_default_chat_project` over a magic id so
  the seed is self-describing and re-creatable.
