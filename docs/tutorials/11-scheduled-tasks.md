# Schedule tasks

1. Open **Tasks** and select **New task**.
2. Add a descriptive name and the prompt the agent should run.
3. Choose **Manual**, **Hourly**, **Daily**, **Weekly**, or a custom interval.
4. Select the target project or chat project, working folder, tools, and model as needed.
5. Create the task and use **Run now** for a controlled first execution.
6. Open the latest run, inspect its changes/output, then leave the schedule enabled only if the result is safe and repeatable.

Scheduled prompts use the real agent and can therefore consume model quota or modify a project. Make prompts idempotent, specify boundaries, and avoid broad permissions for unattended runs.
