# Frequently asked questions

## What is Octopus Studio?

Octopus Studio is a local-first AI desktop workspace for research, documents, data, media, scheduled automation, connected tools, and software development. It organizes work into persistent codeless Chat Projects or code-backed projects.

## Is it an app builder?

Application development is one supported workflow, not the whole product. Octopus Studio also supports research management, document and spreadsheet work, media workflows, recurring tasks, reusable skills, model routing, and MCP-connected tools.

## Does it build operating systems?

No. “Local-first AI workspace” describes a desktop application that runs on your computer. Octopus Studio is not an operating-system generator.

## Is the source code public?

Not currently. This public repository contains releases, documentation, and documentation assets only. If Octopus Studio receives 100 genuine source-code requests at [kaleemibanwar@gmail.com](mailto:kaleemibanwar@gmail.com?subject=Octopus%20Studio%20source%20request), the source will be made public.

## Where does my work live?

Project files and local workspace data are stored on the user's machine. The exact location depends on the selected project folders and application configuration.

## Does anything leave my computer?

Yes, when you use a cloud model or connected service. The relevant prompt, selected context, credentials, or tool request is sent to that provider under its terms. A local model can keep inference local, but MCP tools and other integrations may still use the network.

## Which models can I use?

The product supports multiple configured providers and local runtimes, including Ollama and LM Studio. Exact providers and models can change by release. Automatic routing and Economy Mode are available where supported.

## What is Economy Mode?

Economy Mode reduces context and output use for routine work where a smaller request is acceptable. It is useful for tasks such as classification, formatting, short summaries, and repetitive maintenance; turn it off when broad context or long-form output matters.

## What are Chat Projects?

Chat Projects are persistent codeless workspaces for research, notes, plans, reports, and other knowledge work. They do not require a software repository.

## Which files can I work with?

Current documented workflows include in-app editing and preview for DOCX, XLSX, and Markdown; preview workflows for PPTX, HTML, SVG, images, audio, and video; and media search/generation when the required provider is configured. Format support and fidelity can vary by release.

## Can it run recurring work?

Yes. Tasks can run manually or on hourly, daily, weekly, and custom intervals against an appropriate project. Scheduled work can consume model quota, modify files, or call tools, so test the prompt first and keep permissions narrow.

## Does it support MCP?

Yes. Octopus Studio includes Model Context Protocol support for catalog and custom tool connections. Only connect servers you trust, review requested permissions, and inspect consequential tool calls.

## Can it work on an existing software project?

Yes. Import a local folder, select a connected GitHub repository, or clone from a repository URL. Agent, Plan, Ask, and Build workflows cover different levels of investigation and change.

## Is it a replacement for professional judgment?

No. AI output can be incomplete or wrong. Financial, legal, medical, compliance, security, and other high-stakes work requires authoritative sources and qualified human review.

## How can I support the project?

Download a release, try a complete workflow, star the repository, share a relevant [case study](CASE_STUDIES.md), report reproducible problems, and describe the workflow you most want improved.
