# AI_RULES.md

## Tech Stack

- **Desktop shell**: Electron 40 app built with Electron Forge (Vite plugin). Code is split into Electron **main** (`src/main.ts`), **preload** (`src/preload.ts`), and **renderer** (`src/renderer.tsx`) processes. Prefer the existing IPC layer (`src/ipc/`) over raw `ipcMain`/`ipcRenderer` calls.
- **UI framework**: React 19 + TypeScript (strict). Use function components and hooks; rely on the React Compiler where enabled. Keep components small and in `src/components/`.
- **Routing**: `@tanstack/react-router` (not react-router). Route definitions live in `src/routes/` and are composed in `src/router.ts`. Create new routes via the file-based `createRoute`/`createRootRoute` API.
- **Global state**: `jotai` atoms in `src/atoms/`. Use jotai for cross-component, renderer-local state. Use the custom distributed-machines/state-machines framework (`src/state_machines/`, `src/distributed_machines/`) for actor-style, cross-process, event-sourced state and side-effectful flows.
- **Server/async state**: `@tanstack/react-query` for remote/server data fetching, caching, and invalidation. Wrap queries in hooks under `src/hooks/`.
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`) for all styling. Use the shadcn/ui primitives already in `src/components/ui/` (built on Radix + `class-variance-authority`, `tailwind-merge`, `clsx`). Icons come from `lucide-react`. Use `framer-motion` for animations.
- **Local database**: `drizzle-orm` + `better-sqlite3` (SQLite). Schema lives in `src/db/schema.ts`; the connection is in `src/db/index.ts`. Only the main process touches the DB. Use `drizzle-kit` to generate migrations.
- **External databases**: `@neondatabase/*` for Neon (Postgres), `@octopus-studio-sh/supabase-management-js` for Supabase management, and `pg`/drizzle for other Postgres use.
- **AI / LLM**: `ai` SDK plus `@ai-sdk/*` provider packages for all model calls. Route provider logic through the existing provider/IPC handlers rather than calling SDKs ad hoc.
- **Editors & rich content**: `monaco-editor` for code editing, `lexical` (`@lexical/react`) for the chat input, `react-markdown` + `remark-gfm` for markdown, `react-shiki`/`shiki` for syntax highlighting.
- **i18n**: `i18next` + `react-i18next` for all user-facing strings. Translations live in `src/i18n/locales/<lang>/` (en, es, ko, pt-BR, zh-CN); never hardcode UI text.
- **Validation**: `zod` for schema validation at boundaries (IPC payloads, machine contracts, config).
- **Toasts & notifications**: `sonner` for toast notifications.
- **Terminal**: `@xterm/xterm` and addons for embedded terminal UI.
- **Git**: `dugite` for Git operations.
- **Testing**: `vitest` + `@testing-library/react` for unit/integration tests (colocated as `*.test.ts(x)`), `@playwright/test` for end-to-end tests in `e2e-tests/`, and Storybook for component stories (`*.stories.tsx`).

## Library Rules — what to use for what

- **React/UI**: Only use React itself for components and hooks. Do not reach for alternative component frameworks.
- **Routing**: Use `@tanstack/react-router` exclusively. Do not add react-router or any other router.
- **Styling**: Style with Tailwind utility classes. Reuse shadcn/ui components from `src/components/ui/`; do not add new UI dependencies unless a primitive is genuinely missing. Prefer lucide-react for icons.
- **State**: Use jotai for simple shared renderer state; use the distributed-machines/state-machines framework for complex, cross-process, or event-driven state. Do not introduce Redux/Zustand/MobX or another state library without approval.
- **Data fetching**: Use `@tanstack/react-query` for server data. Do not hand-roll fetch caching.
- **Database**: Use drizzle-orm + better-sqlite3 for the local store. Access the DB only from the main process via `src/db/`. Do not use raw SQL string concatenation.
- **AI**: Use the `ai` SDK and `@ai-sdk/*` providers. Do not call model HTTP APIs directly.
- **Validation**: Use zod for any external input/IPC contract validation. Do not write manual guards for schema-validated data.
- **Editing/content**: Use monaco for code, lexical for chat input, react-markdown for markdown. Do not build custom editors for these purposes.
- **i18n**: Use i18next; put strings in locale JSON files. Do not hardcode visible copy.
- **Testing**: Match existing conventions — vitest + Testing Library for unit tests, Playwright for e2e, Storybook for component demos.
