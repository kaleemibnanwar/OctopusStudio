import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import type { ModelMessage } from "ai";
import type { ModelSelection, StoredChatMode } from "@/lib/schemas";

export const AI_MESSAGES_SDK_VERSION = "ai@v6" as const;

export type AiMessagesJsonV6 = {
  messages: ModelMessage[];
  sdkVersion: typeof AI_MESSAGES_SDK_VERSION;
};

export const prompts = sqliteTable(
  "prompts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    slug: text("slug"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique("prompts_slug_unique").on(table.slug)],
);

export const appCollections = sqliteTable(
  "app_collections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique("app_collections_name_unique").on(table.name)],
);

export const apps = sqliteTable(
  "apps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    // Project kind: "app" is a code project (has a filesystem path, git, preview);
    // "chat" is a Claude-Desktop-style project (no codebase). Existing rows default
    // to "app" so the migration is additive.
    type: text("type").$type<"app" | "chat">().notNull().default("app"),
    // Chat projects have no code on disk, so they use "" as a sentinel path. Kept
    // NOT NULL so the large body of app code that assumes a path keeps type-checking
    // clean; `type` is the real discriminator, and "list coding apps" queries filter
    // on it before touching path.
    path: text("path").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    githubOrg: text("github_org"),
    githubRepo: text("github_repo"),
    githubBranch: text("github_branch"),
    supabaseProjectId: text("supabase_project_id"),
    // If supabaseProjectId is a branch, then the parent project id set.
    // This is because there's no way to retrieve ALL the branches for ALL projects
    // in a single API call
    // This is only used for display purposes but is NOT used for any actual
    // supabase management logic.
    supabaseParentProjectId: text("supabase_parent_project_id"),
    // Supabase organization slug for credential lookup
    supabaseOrganizationSlug: text("supabase_organization_slug"),
    // In-flight ephemeral test-user id for isolated e2e runs against Supabase.
    // Supabase's free tier has no DB branching, so instead of a throwaway branch
    // we create a dedicated throwaway auth user (via the Auth Admin API, stamped
    // app_metadata.octopus_studio_test=true) and run the tests authenticated as it. Set
    // while a test session holds that user, cleared on teardown. Persisted so a
    // crash mid-session can be reconciled (orphan user deleted) on the next
    // launch. See ipc/utils/supabase_test_user.ts.
    supabaseTestUserId: text("supabase_test_user_id"),
    neonProjectId: text("neon_project_id"),
    neonDevelopmentBranchId: text("neon_development_branch_id"),
    neonPreviewBranchId: text("neon_preview_branch_id"),
    neonActiveBranchId: text("neon_active_branch_id"),
    // In-flight ephemeral test branch for isolated e2e test runs. Set while a
    // test session holds a throwaway copy-on-write branch, cleared on teardown.
    // Persisted so a crash mid-session can be reconciled (orphan branch deleted)
    // on the next launch. See ipc/utils/neon_test_branch.ts.
    neonTestBranchId: text("neon_test_branch_id"),
    neonProductionAuthCookieSecret: text("neon_production_auth_cookie_secret"),
    neonDevelopmentAuthCookieSecret: text(
      "neon_development_auth_cookie_secret",
    ),
    // Which Neon branch the unified database section is set to deploy/sync
    // against ("production" | "development"). Null is interpreted differently by
    // each consumer: the backend sync (getSelectedDeployBranchType) treats null
    // as production, while the DatabaseSection UI treats null as "not yet chosen"
    // and shows the branch picker until the user selects one.
    // Read by the main process when syncing env vars + trusted domains to Vercel.
    selectedDatabaseBranchType: text("selected_database_branch_type").$type<
      "production" | "development"
    >(),
    vercelProjectId: text("vercel_project_id"),
    vercelProjectName: text("vercel_project_name"),
    vercelTeamId: text("vercel_team_id"),
    vercelDeploymentUrl: text("vercel_deployment_url"),
    installCommand: text("install_command"),
    startCommand: text("start_command"),
    previewUrl: text("preview_url"),
    chatContext: text("chat_context", { mode: "json" }),
    // For chat (codeless) projects, an optional user-selected directory used as
    // the workspace root for context and for reading/writing Markdown docs.
    // Null keeps the internal per-project folder under the user data directory.
    directory: text("directory"),
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    // Marks the single pre-seeded "Chats" project that holds quick/random chats.
    // At-most-one is enforced by the partial unique index below and maintained
    // idempotently by ensureDefaultChatProject().
    isDefaultChatProject: integer("is_default_chat_project", {
      mode: "boolean",
    })
      .notNull()
      .default(sql`0`),
    // Theme ID for design system theming (null means "no theme")
    themeId: text("theme_id"),
    needsAppBlueprint: integer("needs_app_blueprint", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    // Per-app opt-in for the experimental AI E2E testing feature. Off by default:
    // running tests can mutate the app's real data, so the Tests panel gates all
    // run/generate controls behind this flag until the user explicitly enables it
    // (after acknowledging the data-backup warning). See TestsPanel.tsx.
    testingEnabled: integer("testing_enabled", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    collectionId: integer("collection_id").references(() => appCollections.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("apps_default_chat_project_unique")
      .on(table.isDefaultChatProject)
      .where(sql`${table.isDefaultChatProject} = 1`),
  ],
);

export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  title: text("title"),
  initialCommitHash: text("initial_commit_hash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  // Context compaction fields
  compactedAt: integer("compacted_at", { mode: "timestamp" }),
  compactionBackupPath: text("compaction_backup_path"),
  pendingCompaction: integer("pending_compaction", { mode: "boolean" }),
  chatMode: text("chat_mode").$type<StoredChatMode | null>(),
  modelSelection: text("model_selection", {
    mode: "json",
  }).$type<ModelSelection | null>(),
  // App ids referenced via `@app:Name` that stay available for the rest of the
  // chat (agent-backed modes only). Stored on the chat rather than derived from
  // message history so references survive compaction, which rewrites history.
  // Ids, not paths: apps can be renamed or moved, so paths are resolved per turn.
  referencedAppIds: text("referenced_app_ids", { mode: "json" }).$type<
    number[] | null
  >(),
  isFavorite: integer("is_favorite", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
});

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    approvalState: text("approval_state", {
      enum: ["approved", "rejected"],
    }),
    // The commit hash of the codebase at the time the message was created
    sourceCommitHash: text("source_commit_hash"),
    // The commit hash of the codebase at the time the message was sent
    commitHash: text("commit_hash"),
    requestId: text("request_id"),
    userInputRequestId: text("user_input_request_id"),
    // Max tokens used for this message (only for assistant messages)
    maxTokensUsed: integer("max_tokens_used"),
    // Output (completion) tokens generated for this assistant message. Kept
    // separate from `maxTokensUsed` (the full request's total tokens, including
    // input context) so the UI can show per-message output tokens.
    outputTokensUsed: integer("output_tokens_used"),
    // Model name used for this message (only for assistant messages)
    model: text("model"),
    // AI SDK messages (v5 envelope) for preserving tool calls/results in agent mode
    aiMessagesJson: text("ai_messages_json", {
      mode: "json",
    }).$type<AiMessagesJsonV6 | null>(),
    // Track if this message used the free agent quota (for non-Pro users)
    usingFreeAgentModeQuota: integer("using_free_agent_mode_quota", {
      mode: "boolean",
    }),
    // Indicates this message is a compaction summary
    isCompactionSummary: integer("is_compaction_summary", { mode: "boolean" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("messages_chat_user_input_request_unique").on(
      table.chatId,
      table.userInputRequestId,
    ),
  ],
);

export const versions = sqliteTable(
  "versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    commitHash: text("commit_hash").notNull(),
    neonDbTimestamp: text("neon_db_timestamp"),
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    // Unique constraint to prevent duplicate versions
    unique("versions_app_commit_unique").on(table.appId, table.commitHash),
  ],
);

export const security_fix_chats = sqliteTable(
  "security_fix_chats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    reviewChatId: integer("review_chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    // Hash of the normalized finding(s) the fix chat was created for
    findingKey: text("finding_key").notNull(),
    fixChatId: integer("fix_chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    unique("security_fix_chats_unique").on(
      table.appId,
      table.reviewChatId,
      table.findingKey,
    ),
    index("security_fix_chats_review_chat_id_idx").on(table.reviewChatId),
    index("security_fix_chats_fix_chat_id_idx").on(table.fixChatId),
  ],
);

// Define relations
export const appsRelations = relations(apps, ({ many, one }) => ({
  chats: many(chats),
  versions: many(versions),
  securityFixChats: many(security_fix_chats),
  collection: one(appCollections, {
    fields: [apps.collectionId],
    references: [appCollections.id],
  }),
}));

export const appCollectionsRelations = relations(
  appCollections,
  ({ many }) => ({
    apps: many(apps),
  }),
);

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  securityFixReviewMappings: many(security_fix_chats, {
    relationName: "securityFixReviewChat",
  }),
  securityFixChatMappings: many(security_fix_chats, {
    relationName: "securityFixChat",
  }),
  app: one(apps, {
    fields: [chats.appId],
    references: [apps.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const securityFixChatsRelations = relations(
  security_fix_chats,
  ({ one }) => ({
    app: one(apps, {
      fields: [security_fix_chats.appId],
      references: [apps.id],
    }),
    reviewChat: one(chats, {
      fields: [security_fix_chats.reviewChatId],
      references: [chats.id],
      relationName: "securityFixReviewChat",
    }),
    fixChat: one(chats, {
      fields: [security_fix_chats.fixChatId],
      references: [chats.id],
      relationName: "securityFixChat",
    }),
  }),
);

export const language_model_providers = sqliteTable(
  "language_model_providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    api_base_url: text("api_base_url").notNull(),
    env_var_name: text("env_var_name"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

export const language_models = sqliteTable("language_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  apiName: text("api_name").notNull(),
  builtinProviderId: text("builtin_provider_id"),
  customProviderId: text("custom_provider_id").references(
    () => language_model_providers.id,
    {
      onDelete: "cascade",
    },
  ),
  description: text("description"),
  max_output_tokens: integer("max_output_tokens"),
  context_window: integer("context_window"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Define relations for new tables
export const languageModelProvidersRelations = relations(
  language_model_providers,
  ({ many }) => ({
    languageModels: many(language_models),
  }),
);

export const languageModelsRelations = relations(
  language_models,
  ({ one }) => ({
    provider: one(language_model_providers, {
      fields: [language_models.customProviderId],
      references: [language_model_providers.id],
    }),
  }),
);

export const versionsRelations = relations(versions, ({ one }) => ({
  app: one(apps, {
    fields: [versions.appId],
    references: [apps.id],
  }),
}));

// --- MCP (Model Context Protocol) tables ---
export const mcpServers = sqliteTable(
  "mcp_servers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    transport: text("transport").notNull(),
    command: text("command"),
    // Store typed JSON for args and environment variables
    args: text("args", { mode: "json" }).$type<string[] | null>(),
    // Legacy plaintext env vars and headers. These remain for unedited
    // rows so older builds can still use their existing configuration;
    // new writes and secret edits clear them in favor of the encrypted
    // columns below, which are what this build reads.
    envJson: text("env_json", { mode: "json" }).$type<Record<
      string,
      string
    > | null>(),
    headersJson: text("headers_json", { mode: "json" }).$type<Record<
      string,
      string
    > | null>(),
    // Env vars and headers encrypted via Electron `safeStorage`, or
    // base64 plaintext where no keyring is available (see
    // encryptSecretMap). Both hold a JSON object of strings.
    envEncrypted: text("env_encrypted"),
    headersEncrypted: text("headers_encrypted"),
    url: text("url"),
    enabled: integer("enabled", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    // Whether this server requires OAuth. When true, the MCP manager wires
    // an `OAuthClientProvider` into the streamable HTTP transport so the
    // Vercel `@ai-sdk/mcp` `auth()` flow can drive PKCE + refresh.
    oauthEnabled: integer("oauth_enabled", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    // OAuth state (tokens, expiry, client info). Encrypted via Electron
    // `safeStorage`, or base64 plaintext where no keyring is available
    // (see encryptToString). Read/written only by OctopusStudioOAuthClientProvider.
    oauthState: text("oauth_state"),
    // Optional pre-registered OAuth client_id for servers that don't
    // support dynamic client registration (RFC 7591). User-supplied via
    // the add-server UI; left blank for servers that support DCR.
    oauthClientId: text("oauth_client_id"),
    // Optional pre-registered OAuth client_secret for confidential
    // clients. Encrypted via `safeStorage` (base64 plaintext fallback
    // where no keyring exists). Never sent to the renderer.
    oauthClientSecret: text("oauth_client_secret"),
    // Space-separated OAuth scopes requested at the authorize endpoint.
    // Server-defined values; check provider docs. Blank means omit the
    // `scope` parameter entirely so the server applies its own default
    // (rather than us guessing a value that fits a minority of providers).
    oauthScope: text("oauth_scope"),
    // Per-server callback port. Manual (non-DCR) flows pre-register a
    // redirect URI that includes the port, so it must stay stable for
    // those rows. Null falls back to DEFAULT_OAUTH_CALLBACK_PORT.
    oauthCallbackPort: integer("oauth_callback_port"),
    // Slug of the curated catalog entry this server was added from.
    // Null for manually configured servers.
    catalogSlug: text("catalog_slug"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    // Provenance/dedupe key for catalog adds. SQLite allows multiple
    // NULLs, so manually-configured servers are unaffected.
    uniqueIndex("uniq_mcp_catalog_slug").on(table.catalogSlug),
  ],
);

export const mcpToolConsents = sqliteTable(
  "mcp_tool_consents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serverId: integer("server_id")
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    consent: text("consent").notNull().default("ask"), // ask | always | denied
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique("uniq_mcp_consent").on(table.serverId, table.toolName)],
);

// --- Chat search (FTS5) support tables ---
// Dirty queues for the chat_search_fts index (created in a custom migration —
// drizzle cannot model FTS5 virtual tables). Rows are enqueued by SQLite
// triggers when source rows change and drained by ChatSearchIndexer, which
// builds the searchable text projection in TypeScript. No foreign keys:
// triggers own the row lifecycle, including cleanup on delete.
export const chatSearchDirtyMessages = sqliteTable(
  "chat_search_dirty_messages",
  {
    messageId: integer("message_id").primaryKey(),
  },
);

export const chatSearchDirtyChats = sqliteTable("chat_search_dirty_chats", {
  chatId: integer("chat_id").primaryKey(),
});

// Key/value metadata for the chat-search index (e.g. projection version so a
// policy change can trigger a background rebuild).
export const chatSearchMeta = sqliteTable("chat_search_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// --- Custom Themes table ---
export const customThemes = sqliteTable("custom_themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Scheduled tasks table ---
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  // Recurrence interval in minutes; null = manual-only.
  scheduleMinutes: integer("schedule_minutes"),
  enabled: integer("enabled", { mode: "boolean" })
    .notNull()
    .default(sql`1`),
  // Target project (code or chat). Null runs in the default chat project.
  projectId: integer("project_id").references(() => apps.id, {
    onDelete: "set null",
  }),
  // MCP servers enabled for this task's runs.
  mcpServerIds: text("mcp_server_ids", { mode: "json" }).$type<
    number[] | null
  >(),
  // Model to run the task with (null = use the app default).
  modelSelection: text("model_selection", {
    mode: "json",
  }).$type<ModelSelection | null>(),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  lastChatId: integer("last_chat_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(apps, {
    fields: [tasks.projectId],
    references: [apps.id],
  }),
  lastChat: one(chats, {
    fields: [tasks.lastChatId],
    references: [chats.id],
  }),
}));

// --- Workers: persona squads that dispatch real chat turns against a project ---
export const workerPersonas = sqliteTable("worker_personas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default("🤖"),
  role: text("role").notNull(),
  description: text("description").notNull().default(""),
  // Model to run this persona's turns with (null = use the app default).
  modelSelection: text("model_selection", {
    mode: "json",
  }).$type<ModelSelection | null>(),
  temperature: real("temperature").notNull().default(0.3),
  systemPrompt: text("system_prompt").notNull(),
  capabilities: text("capabilities", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Single-row table (id is always 1) holding the squad's operating-hours config.
export const workerSchedule = sqliteTable("worker_schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isEnabled: integer("is_enabled", { mode: "boolean" })
    .notNull()
    .default(sql`1`),
  startHour: text("start_hour").notNull().default("09:00"),
  endHour: text("end_hour").notNull().default("17:00"),
  // 0 = Sunday … 6 = Saturday
  daysOfWeek: text("days_of_week", { mode: "json" })
    .$type<number[]>()
    .notNull()
    .default(sql`'[1,2,3,4,5]'`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const workerRuns = sqliteTable("worker_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").references(() => apps.id, {
    onDelete: "set null",
  }),
  goal: text("goal").notNull(),
  status: text("status", {
    enum: ["running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("running"),
  // The real chat this run's turns are dispatched into.
  chatId: integer("chat_id").references(() => chats.id, {
    onDelete: "set null",
  }),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  totalSteps: integer("total_steps").notNull(),
  // Set by the renderer; checked between steps (and used to cancel an
  // in-flight turn) so a run can be stopped without killing the process.
  cancelRequested: integer("cancel_requested", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
  // The final step's real assistant reply (a Markdown standup summary),
  // verbatim — not a template.
  report: text("report"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const workerRunSteps = sqliteTable("worker_run_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("run_id")
    .notNull()
    .references(() => workerRuns.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  personaId: integer("persona_id").references(() => workerPersonas.id, {
    onDelete: "set null",
  }),
  // Denormalized so the step remains meaningful if the persona is later edited/deleted.
  personaName: text("persona_name").notNull(),
  personaRole: text("persona_role").notNull(),
  instructions: text("instructions").notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  // The real assistant message this step produced.
  messageId: integer("message_id").references(() => messages.id, {
    onDelete: "set null",
  }),
  summary: text("summary"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const workerRunsRelations = relations(workerRuns, ({ one, many }) => ({
  project: one(apps, {
    fields: [workerRuns.projectId],
    references: [apps.id],
  }),
  chat: one(chats, {
    fields: [workerRuns.chatId],
    references: [chats.id],
  }),
  steps: many(workerRunSteps),
}));

export const workerRunStepsRelations = relations(workerRunSteps, ({ one }) => ({
  run: one(workerRuns, {
    fields: [workerRunSteps.runId],
    references: [workerRuns.id],
  }),
  persona: one(workerPersonas, {
    fields: [workerRunSteps.personaId],
    references: [workerPersonas.id],
  }),
  message: one(messages, {
    fields: [workerRunSteps.messageId],
    references: [messages.id],
  }),
}));
