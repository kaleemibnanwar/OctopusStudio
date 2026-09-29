# Octopus Studio — Features & Use Cases

Octopus Studio is a local-first AI desktop workspace for research, knowledge work, documents, spreadsheets, presentations, media, recurring automation, connected tools, and software development.

Software development is one capability alongside research, knowledge work, document and data workflows, media, automation, and connected tools.

Project files and local workspace data stay on the user's machine. Cloud models and connected services receive the information required for a request under their respective terms. Ollama and LM Studio provide a local-model path when configured.

## Who it is for

| Audience                    | Example needs                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Researchers and analysts    | Collect evidence, maintain topic workspaces, compare sources, organize data, and produce reports.           |
| Operators and consultants   | Repeat checklists, manage recurring client work, prepare documents, and coordinate connected services.      |
| Marketing and content teams | Research audiences, develop campaigns, manage media, create deliverables, and automate reviews.             |
| Data and finance teams      | Inspect spreadsheets, explain anomalies, document findings, and repeat controlled reporting workflows.      |
| Product and software teams  | Plan features, work with repositories, preview changes, run tests, manage Git history, and deploy projects. |
| Individual builders         | Choose models, create reusable workflows, organize projects, and keep ownership of local files.             |

## Workspace capabilities

### Chat Projects for research and knowledge work

Chat Projects are codeless workspaces for research, notes, planning, reports, and long-running topics. They use the same conversational agent without requiring a source-code project.

**Examples**

- Maintain an evolving competitor-research workspace.
- Compare services and save the evidence, assumptions, and conclusion together.
- Draft a strategy, proposal, operating procedure, or roadmap.
- Separate client or subject areas into persistent projects and chats.

### Documents, spreadsheets and presentations

Supported knowledge-work files can be opened in purpose-built workspace views. DOCX, XLSX, and Markdown support in-app editing and preview workflows. PPTX presentations can be previewed alongside their source material. Supported HTML and SVG files can also be inspected visually.

**Examples**

- Revise a DOCX report while checking its underlying XLSX data.
- Review spreadsheet sheets, cells, and formulas before producing a summary.
- Maintain working notes or documentation in Markdown with rendered preview.
- Review a presentation together with its research notes and campaign assets.
- Inspect an HTML deliverable or SVG graphic without leaving the workspace.

### Media workspace

Preview supported images, audio, and video inside Octopus Studio. Generate media with configured models, search supported image providers, and organize assets in the Library.

**Examples**

- Compare candidate campaign images with a creative brief.
- Review narration, footage, and supporting graphics in one workflow.
- Search for reference or stock imagery using configured providers.
- Generate an image or video asset, then inspect it before use.

### Scheduled tasks

Save a prompt and run it manually, hourly, daily, weekly, or at a custom interval. A task can target the appropriate coding or Chat Project and use configured tools and models.

**Examples**

- Produce a daily research digest.
- Prepare a weekly client or project summary.
- Check content links or update a recurring editorial checklist.
- Review a software project's changelog, dependencies, or test status.

Scheduled tasks use the real agent and can consume model quota or modify files. Unattended prompts should be narrow, repeatable, and permission-aware.

### Models, automatic routing and Economy Mode

Connect supported cloud providers or local runtimes such as Ollama and LM Studio. Select a specific model when control matters, or use automatic routing where available to choose among configured model candidates. Economy Mode reduces context and output use for suitable routine tasks.

**Examples**

- Use Economy Mode for classification, formatting, or short summaries.
- Route mixed workloads without manually changing models every time.
- Select a specific model for reproducibility or a required capability.
- Keep inference local by choosing a local model and avoiding cloud integrations.

### MCP plugins and connected tools

Model Context Protocol support lets the agent use configured external tools and data sources. Catalog and custom MCP connections can complement built-in integrations such as Google Workspace, GitHub, Vercel, Supabase, Neon, and image-search providers.

**Examples**

- Gather context from connected knowledge or project-management services.
- Create an approved issue or update after completing work.
- Move a reviewed deliverable into an external workflow.
- Combine local file work with authorized cloud data.

Treat every MCP server as third-party software with access to the permissions you grant. Review credentials, tool calls, and external actions.

### Skills, prompts and reusable process

Store reusable instructions as skills, keep useful prompts in the Library, and apply consistent methods across projects.

**Examples**

- Reuse a research methodology with evidence and citation requirements.
- Apply a client-specific reporting format.
- Save an editorial voice and fact-check checklist.
- Standardize a release or quality-review process.

### Software development

Software work is a full-featured capability, but it is one workspace use case rather than the definition of Octopus Studio. Create from a template or import an existing local/GitHub project; use blueprints, Plan, Agent, Build, or Ask modes; inspect changes; run commands and tests; preview HTML/apps; and maintain real Git history.

**Examples**

- Prototype a website or application from a written brief.
- Plan and implement a feature in an existing repository.
- Inspect logs, test results, modified files, and commits.
- Connect Supabase or Neon, publish through GitHub, and deploy through Vercel where configured.
- Restore an earlier version or branch an experiment.

### Planning and structured questions

Blueprints and short questionnaires help clarify audience, scope, design direction, data, and constraints before consequential work begins.

**Examples**

- Agree on a report structure before generating it.
- Clarify the audience and channels for a campaign.
- Confirm screens, behavior, and data requirements for a software feature.
- Choose among a small set of approaches without a long back-and-forth.

### File, change and version visibility

The workspace exposes relevant files, edits, tool activity, logs, and—in coding projects—Git versions. Users can review what changed rather than receiving only a final answer.

### Context management

Long conversations can be compacted into summaries so ongoing work remains usable as the thread grows. Projects, chats, collections, prompts, skills, themes, templates, and media provide additional organization.

### Permissions and safety controls

Settings cover model selection, context and tool limits, Economy Mode, approval behavior, integrations, telemetry, and advanced agent controls. Consequential commands, database changes, network operations, and third-party tools should remain approval-gated unless the environment is trusted.

### Localization and accessibility direction

The interface includes localized UI strings and accessibility-oriented implementation practices such as semantic controls, keyboard-friendly interaction, readable contrast, and reduced-motion considerations. These are ongoing product responsibilities, not a blanket compliance guarantee.

## Quick capability map

| Goal                                      | Relevant capabilities                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Maintain long-running research            | Chat Projects, skills, scheduled tasks, Markdown, MCP                                     |
| Prepare reports from data                 | XLSX workspace, DOCX/Markdown, model routing, scheduled tasks                             |
| Run a marketing workflow                  | Chat Projects, image search/generation, media preview, documents, MCP                     |
| Automate content operations               | Skills, prompts, scheduled tasks, media, connected tools                                  |
| Manage client engagements                 | Collections, Chat Projects, documents, spreadsheets, recurring tasks                      |
| Develop and deliver software              | Coding projects, plans, agents, tests, preview, Git, database and deployment integrations |
| Control cost and provider choice          | Bring-your-own-model, local models, automatic routing, Economy Mode                       |
| Review rich files without switching tools | DOCX, XLSX, Markdown, PPTX, HTML, SVG, image, audio, and video views                      |

See [Case studies](CASE_STUDIES.md) for combined workflows and [Tutorials](tutorials/README.md) for focused setup instructions.

_Availability can vary by platform, application version, provider account, subscription, experiment, and connected service._
