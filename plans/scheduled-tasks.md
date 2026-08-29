# Scheduled / recurring tasks

Claude-Code-style tasks: a saved prompt that runs on a schedule (or on demand),
with MCP tools available, against a chosen project (code or chat). Results land
in a normal chat thread so they're reviewable.

## Model

- **`tasks`** table: `id`, `projectId` (nullable → default chat project),
  `title`, `prompt`, `schedule` (cron expr or `null` = manual), `enabled`,
  `mcpServerIds` (json — which MCP servers are enabled for this task),
  `lastRunAt`, `lastChatId`, `createdAt`, `updatedAt`.
- A task run = a normal chat turn in the target project, with the task's
  prompt as the user message and the whitelisted MCP servers injected.

## Phases

1. **Schema + CRUD** — migration for `tasks`; IPC contracts
   `listTasks`/`createTask`/`updateTask`/`deleteTask`/`runTaskNow`.
2. **Scheduler** — a main-process scheduler (cron parser) that fires `enabled`
   tasks on schedule and enqueues a run; persists `lastRunAt`. Skip firing when
   the app is off (catch up on launch, best-effort).
3. **Execution** — reuse the existing agent loop: create a chat in the target
   project, run the prompt with MCP servers restricted to the task's whitelist
   (mirrors the per-turn MCP injection already in the local-agent handler).
4. **UI** — a "Tasks" panel (list/create/edit/toggle/delete + "run now") and a
   link to the task's latest run chat.

## Open questions

- Cron vs. simple "every N minutes/hours/days" presets (recommend presets first).
- Whether runs surface as a separate "Tasks" chat list or reuse the project's
  chat list.
