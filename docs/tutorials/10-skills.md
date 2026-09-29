# Create reusable skills

1. Open **Library → Skills**.
2. Select **New skill**.
3. Give it a short kebab-case name, such as `release-checklist`.
4. Write a one-sentence description that tells the agent when the skill applies.
5. Add precise instructions, expected outputs, safety checks, and stop conditions.
6. Save it, then reference it in a prompt with `/release-checklist`.

Keep each skill focused on one repeatable workflow. Put stable process knowledge in the skill and project-specific facts in the prompt or repository files. Edit the skill when repeated runs reveal an ambiguous step.
