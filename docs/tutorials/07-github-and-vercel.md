# Publish with GitHub and Vercel

## Connect accounts

1. Open **Settings → Integrations**.
2. Connect **GitHub**, then connect **Vercel** if you want hosted deployment.
3. Return to the project and verify there are no credentials committed in source files.

## Publish

1. Use the project's GitHub controls to create or connect a repository and push the current branch.
2. Confirm the repository and branch on GitHub.
3. Use the Vercel deployment controls, select the correct project/team, and configure required environment variables.
4. Deploy and test the production URL independently from the local preview.

GitHub and Vercel are optional cloud services. Deployment can fail when build commands, framework detection, or environment variables differ from the local setup; use deployment logs as the source of truth.
