# Add Supabase or Neon

1. Open **Settings → Integrations** and connect **Supabase** or **Neon**.
2. Open the target app, then its database configuration.
3. Select or create the database project and confirm the environment variables that will be written to the app.
4. Ask the agent to describe the proposed schema before applying it.
5. Review generated migrations and SQL approval prompts, especially destructive operations.
6. Apply the migration, restart the app if environment variables changed, and test reads/writes from the preview.

Supabase supports cloud and local development workflows; Neon supports hosted Postgres and branching workflows. Keep development and production credentials separate, commit migration files, and never commit `.env` secrets.
