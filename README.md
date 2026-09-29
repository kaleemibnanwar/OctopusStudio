<div align="center">

# 🐙 Octopus Studio

**A local-first AI workspace for research, documents, data, media, automation, connected tools, and development.**

[![Latest release](https://img.shields.io/github/v/release/kaleemibnanwar/OctopusStudio?label=release)](https://github.com/kaleemibnanwar/OctopusStudio/releases/latest)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](#download)

[Download](#download) · [Features](#what-you-can-do) · [Case studies](docs/CASE_STUDIES.md) · [Quick start](#quick-start) · [Tutorials](docs/tutorials/README.md)

</div>

## Why Octopus Studio?

Octopus Studio brings AI-assisted work into one desktop workspace. Research a topic, edit documents and spreadsheets, review media, automate recurring work, connect external tools, or develop software without forcing every workflow into a coding project.

- **Work in the right kind of project.** Use codeless Chat Projects for research and knowledge work, or coding projects when the task involves software.
- **Bring your own model.** Connect supported cloud providers or local runtimes such as Ollama and LM Studio.
- **Stay in control.** Review plans, file changes, terminal output, tool calls, and Git history.
- **Work with existing projects.** Import local folders or GitHub repositories instead of starting over.
- **Create more than software.** Research in Chat Projects and work with documents, spreadsheets, presentations, Markdown, HTML, SVG, images, audio, and video.
- **Connect and automate.** Use model routing, Economy Mode, MCP plugins, reusable skills, and scheduled tasks.

Octopus Studio is local-first, not offline-only. Project files and desktop data are stored locally. Cloud models and integrations receive the information needed to perform requests under their respective terms.

## Download

Download the latest available installer or archive from [GitHub Releases](https://github.com/kaleemibnanwar/OctopusStudio/releases/latest). Open the release notes and choose the asset for your operating system and architecture.

This public repository intentionally contains release information and user documentation only. It does not distribute the application source code.

## What you can do

| Area                        | Capabilities                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Research and knowledge work | Use codeless Chat Projects for research, notes, plans, reports, and long-running topic work.                            |
| Documents and data          | Preview and edit DOCX, XLSX, and Markdown files in the workspace; preview presentations and supported HTML/SVG content. |
| Media                       | Preview images, audio, and video in the app; generate media and search supported image providers.                       |
| Automation                  | Run prompts manually or schedule them hourly, daily, weekly, or at a custom interval against the appropriate project.   |
| Model control               | Bring cloud or local models, use automatic model routing, and enable Economy Mode for lower-cost routine work.          |
| Connected tools             | Extend the agent through MCP and integrate services such as Google Workspace, GitHub, Vercel, Supabase, and Neon.       |
| Software development        | Create or import projects, plan changes, edit code, run tests, use live HTML/app previews, and maintain Git history.    |
| Import                      | Open a local project, choose a connected GitHub repository, or clone from a repository URL.                             |
| Chat modes                  | Build with broad context, use Agent for tool-driven changes, Plan before implementation, or Ask without editing.        |
| Inspect and recover         | Review modified files and commits, browse code, inspect logs/tests, create branches, and restore versions.              |
| Connect services            | Integrate GitHub, Vercel, Supabase, Neon, Google Workspace, image search providers, and MCP servers.                    |
| Reuse and automate          | Save prompts and skills, schedule tasks hourly/daily/weekly/custom, and configure model/tool limits.                    |
| Organize                    | Manage coding projects, chat projects, collections, templates, themes, prompts, skills, and media.                      |

See [Features and use cases](docs/FEATURES_AND_USE_CASES.md) for the larger product catalog and [Case studies](docs/CASE_STUDIES.md) for end-to-end examples.

## Quick start

1. Install Octopus Studio from the [latest release](https://github.com/kaleemibnanwar/OctopusStudio/releases/latest).
2. Launch the desktop application.
3. Open **Settings → Model Providers** and connect a supported provider or local model runtime.
4. Select a default model under **AI**.
5. Return home, describe the app or task you want, and submit the prompt.
6. Review any plan, questionnaire, or requested tool approval before continuing.

Start with [Install and first run](docs/tutorials/01-install-and-first-run.md), then follow [Build your first app](docs/tutorials/02-build-your-first-app.md).

## Documentation

The [tutorial index](docs/tutorials/README.md) includes short guides for:

- model-provider setup
- building and importing projects
- Chat Projects for research and knowledge work
- automatic model routing and Economy Mode
- office files, Markdown, HTML, SVG, and media workflows
- chat modes and agent permissions
- previews and version history
- GitHub, Vercel, Supabase, and Neon
- MCP plugins, skills, tasks, and Library assets

## Designed for complete workflows

Octopus Studio combines capabilities that are often split across a chat assistant, office suite, data workspace, media viewer, automation tool, code editor, and integration hub. A scheduled task can continue work in a project; a Chat Project can hold the research; files and media can be reviewed in-app; and an MCP plugin can connect the result to an external service. Software development is one supported workflow within that broader workspace—not the product's sole identity.

## Privacy and security

- Cloud model providers receive prompt content and selected context.
- Local models can keep model inference on the user's machine.
- Connected plugins and external services may make network requests.
- Review tool permissions and third-party account access before approval.
- Never commit API keys, access tokens, or `.env` secrets to a project.

## Repository scope

This is the public distribution and documentation repository for Octopus Studio. It contains no application source code. Release availability and individual features may vary by platform, account, provider, and application version.

## Want the source code?

Interested in seeing Octopus Studio become open source? Send a request to [kaleemibanwar@gmail.com](mailto:kaleemibanwar@gmail.com) with the subject **Octopus Studio source request**.

If the project receives **100 genuine source-code requests by email**, I will make the source code public.
