# Choose a chat mode and permissions

Use the mode selector in chat:

- **Build** sends broad project context and is optimized for generating and revising an app.
- **Agent** uses tools to inspect and change the project selectively. It is the best general-purpose mode for existing codebases.
- **Plan** investigates and produces an implementation plan without immediately performing the build.
- **Ask** explores code and answers questions without modifying files.

For sensitive work, open **Settings → Agent Permissions** and review which tools may run automatically. Keep approval prompts enabled for commands, database changes, network actions, and third-party MCP tools unless the environment is trusted. Advanced settings also control chat turns, tool-call steps, context compaction, and unsafe-package blocking.
