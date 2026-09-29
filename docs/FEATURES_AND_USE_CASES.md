# Octopus Studio — Features & Use Cases

A single reference covering every feature of Octopus Studio, with the concrete use cases each one exists to serve.

---

## What is Octopus Studio?

Octopus Studio is a **local-first, open-source AI app builder**. You describe an app in plain language; the AI generates real, running code and opens a live preview on your machine. Project files and local app data stay on your machine. When you use cloud models or integrations, relevant data is sent to those providers; Ollama and LM Studio provide a local-model path.

The product is named for the octopus metaphor: **eight arms, eight jobs.** One arm scaffolds the app while another wires a plugin, one keeps a scheduled task running in the background while another reviews the diff a squad of agents just produced. You describe what you want built; it dives down and comes back with the thing — a real codebase, not a mockup.

### Who it's for

| Audience                     | Who they are                                                                                                                  | What they need                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Non-technical builders**   | People with an app idea and no coding background, often coming from Lovable/v0/Bolt-style tools. Usually in their first hour. | Go from a typed idea to a working preview with as few decisions and moments of doubt as possible. |
| **Developers and tinkerers** | People who bring existing projects, API keys, or local models.                                                                | Fine-grained control: pick the model, inspect the code, branch, test, and roll back.              |

### Design principles

- **Calm and capable** — the UI gets out of the way and explains what's happening in plain language (no mascots, no confetti, no walls of terminal output).
- **Never a dead end** — every state (loading, empty, error, missing dependency) names what's happening and offers one obvious next action.
- **Translate, don't expose** — Node.js, API keys, and ports are framed as brief guided steps toward the user's app, never as system chores.
- **Local-first** — fast, private, no lock-in. The free / bring-your-own-key path is never second-class.
- **Accessible by design** — use semantic controls, keyboard-friendly interactions, readable contrast, and reduced-motion support when implementing UI.

---

## Feature Catalog

### 1. Build apps by describing them

The core experience. Type what you want; Octopus Studio plans it, scaffolds a real project, opens a live preview, and iterates with you turn by turn. Every AI edit is committed to real git history.

**How it works:** a "main agent" reads your prompt, may ask clarifying questions, plans the work, then writes files, runs type checks, and restarts the preview — all through the same tools a developer would use.

**Use cases**

- A founder with no code background builds a waitlist landing page in an afternoon.
- Someone prototypes a "to-do app with categories" before hiring a developer.
- A tinkerer bootstraps a full-stack starter and immediately customizes it.
- Validating an idea: "would people use a tool that does X?" → get a working proof in minutes.

### 2. Live preview & visual editing

Your app runs in a live preview pane alongside the chat. You see changes as they're made, and can switch into a **visual editing** mode to tweak the rendered UI directly.

**How it works:** the app previews in a sandboxed iframe on your machine; visual editing maps your on-screen clicks back to the underlying components.

**Use cases**

- Iterating on a landing page's hero section visually instead of describing changes in words.
- Spotting a broken layout instantly and fixing it without reading code.
- Clicking around your own app to verify a flow works end-to-end.

### 3. Chat Projects (codeless workspace)

A chat variant with **no codebase** — for notes, plans, and research documents. Uses the same agent and the same chat UI as coding projects, but nothing is compiled or previewed.

**Use cases**

- Brainstorming a product idea and keeping the thread as a living document.
- Drafting a spec or roadmap with the agent, then handing it off to a build.
- Research notes ("compare these three payment APIs") saved as a searchable conversation.

### 4. Templates

Start from a scaffold instead of a blank slate: React, Next.js, or a full-stack starter (official + community templates).

**Use cases**

- Skipping boilerplate: "start a Next.js app with auth" instead of describing everything from zero.
- A consistent starting point for a team's standard stack.
- Trying a community template to see how a particular pattern is built.

### 5. App Blueprint & planning

Before writing code, the agent can produce an **app blueprint** — a structured plan of screens, features, and data — and confirm it with you (with a clarifying questionnaire) before implementing.

**Use cases**

- Capturing requirements up front so the build matches what you actually meant.
- Reviewing a plan ("does this cover user login and payments?") before committing to it.
- Avoiding rework by agreeing on scope before the first line of code.

### 6. Clarifying questionnaire

The agent can ask you **1–3 structured questions** (text, single-choice, or multi-choice) while planning, to nail down design preferences, audience, and scope.

**Use cases**

- "What's the primary color and mood?" → a form, not a wall of prose.
- Confirming target audience ("consumers vs. internal team") before generating copy.
- Choosing between options ("dark-mode toggle: yes/no") without a long back-and-forth.

### 7. Tasks — scheduled prompts

Save a prompt once; run it on demand or on a schedule (hourly, daily, weekly, or a custom interval) against any project. Each run dispatches through the **exact same chat agent** as a manual message — nothing is simulated.

**Use cases**

- A nightly "check the site for broken links and fix them" job.
- A weekly "update the changelog from this week's commits" report.
- A daily "regenerate the dashboard's sample data" maintenance run.
- "Every morning, summarize the project's open issues" as a standup aid.

### 8. Workers — multi-persona agent squads

Sometimes one arm isn't enough. Assemble a squad of personas — PM, Solutions Architect, Tester, Security Engineer, Designer, Marketer — and dispatch one goal. The **lead persona plans** it, the rest **do real turns in a shared chat** (real edits, real commits), and the last persona **writes the standup report**. Cancel a run mid-flight, or open the chat and watch it work.

**Use cases**

- A one-click "build the feature AND review it from five angles" run.
- Shipping with confidence: a Security Engineer + Tester pass on the same diff.
- Generating a Markdown standup report of everything a squad changed.
- Splitting "add payments" across PM (plan), Architect (design), and Marketer (landing copy) in one dispatch.

### 9. Multi-agent orchestration (sub-agents)

A token-efficient orchestration layer above the single agent. A task is **deterministically routed** (from the dependency graph, not an LLM guess) into independent sub-agents, each a **bounded, isolated worker** with its own narrow context, file permissions, and budget. Sub-agent activity is shown live in the chat composer.

**Use cases**

- "Update backend, frontend, and tests" → three isolated agents, no cross-contamination.
- Keeping a large change within a token budget instead of one bloated context.
- Watching parallel work happen (the composer shows each sub-agent's status).
- Enforcing that a sub-agent can only touch the files it's assigned.

### 10. Plugins — connect real tools over MCP

Connect real tools through the **Model Context Protocol** from a bundled catalog of verified servers — Gmail, Slack, Canva, Notion, Linear, Figma, GitHub, Stripe, Cloudflare, Supabase, and more — with OAuth or a single API key, no hand-written config.

**Use cases**

- "Read my latest Slack messages and summarize them" inside a build conversation.
- Pulling a Figma design's tokens into the app it's building.
- Letting the agent create a Linear issue when it finishes a feature.
- Posting a completed app's announcement to LinkedIn/Gmail from the chat.

### 11. Bring your own model

Pick your current: OpenAI, Anthropic, Google, or a **local model via Ollama/LM Studio**. **Economy Mode** trims context and output for cheaper, faster turns.

**Use cases**

- Privacy-sensitive work: run everything on a local model, nothing leaves the machine.
- Cost control: switch to Economy Mode for routine turns, a strong model for hard ones.
- Avoiding vendor lock-in by swapping providers per project.

### 12. Git, versions & rollback

Every AI edit is a real git commit. You get full history, branches, and the ability to **roll back to any prior version**.

**Use cases**

- "The last change broke it — revert to before the payments refactor."
- Forking an experiment onto a branch without touching the working version.
- Reviewing exactly what the agent changed, commit by commit.

### 13. Databases — Supabase & Neon

One-click Postgres: connect Supabase or Neon, and the agent can create tables, run migrations, and manage your database alongside the app.

**Use cases**

- "Add a users table and wire up auth" without leaving the chat.
- Preview-branching a database on Neon to test a schema change safely.
- Building a full-stack app (frontend + DB) from one prompt.

### 14. Deployments — GitHub & Vercel

Push to GitHub and deploy to Vercel from the app, so the thing you built locally goes live.

**Use cases**

- Shipping a finished prototype to a shareable URL in one click.
- Keeping a git remote in sync automatically while you build.
- Handing a codebase to a developer via GitHub once you outgrow the prototype.

### 15. Media & image generation

Generate images and manage media assets for the app.

**Use cases**

- Generating placeholder/hero images for a landing page.
- Producing an app icon or logo variation without a designer.

### 16. Collections & Library

Organize your apps into collections and browse them in a library.

**Use cases**

- Grouping "client projects" vs. "internal tools".
- A personal library of experiments you can revisit and clone.
- Curating a set of templates/examples for a team.

### 17. Context compaction

For long conversations, the agent can compact earlier context into a summary so the thread stays responsive instead of hitting the context limit.

**Use cases**

- A multi-day build thread that keeps working without losing the plot.
- Preventing "context window full" errors on a sprawling refactor.

### 18. Settings & agent permissions

Real control: default model, context limits, economy mode, and **per-tool consent** (approve/deny each agent tool).

**Use cases**

- "Never let the agent run network requests without asking."
- Locking the default model to the cheapest one for a shared machine.
- Auditing exactly which tools the agent is allowed to use.

### 19. Themes

Light/dark themes plus custom theme creation and editing.

**Use cases**

- Branding the workspace to match a company's colors.
- Reducing eye strain with a custom dark palette.

### 20. Localization

UI strings are localized (en, pt-BR, zh-CN), written to avoid idioms that don't translate.

**Use cases**

- A non-English-speaking user builds an app in their own language.
- Shipping a product used across multiple locales.

### 21. Accessibility

The interface uses semantic controls and includes keyboard, contrast, and reduced-motion considerations. Accessibility is an ongoing engineering responsibility rather than a blanket compliance guarantee.

**Use cases**

- Users who rely on keyboard navigation or screen readers can use every flow.
- Motion-sensitive users get a calm, static experience.

### 22. Onboarding (first prompt)

A guided first-run flow: describe your idea → connect an AI provider (or a local model) → see your working preview. Every step names what's happening and offers exactly one next action.

**Use cases**

- A first-time user goes from "I have an idea" to a running app without touching a terminal.
- The app recovers gracefully if a setup step fails, resuming the user's original idea instead of discarding it.

---

## Use-Case Quick Reference

| I want to…                                 | Use                           |
| ------------------------------------------ | ----------------------------- |
| Turn an idea into a working app            | Build apps by describing them |
| See changes as they happen                 | Live preview                  |
| Tweak the UI visually                      | Visual editing                |
| Keep notes/plans without code              | Chat Projects                 |
| Start from a scaffold                      | Templates                     |
| Agree on a plan before building            | Blueprint + planning          |
| Answer a couple of questions to scope work | Clarifying questionnaire      |
| Run a prompt on a schedule                 | Tasks                         |
| Get multiple perspectives on one goal      | Workers                       |
| Delegate isolated parallel work            | Multi-agent / sub-agents      |
| Connect Gmail/Slack/Notion/Linear/etc.     | Plugins (MCP)                 |
| Use my own/local model                     | Bring your own model          |
| Undo a bad change                          | Git versions & rollback       |
| Add a database                             | Supabase / Neon               |
| Put it on the internet                     | GitHub / Vercel               |
| Generate images                            | Media & image generation      |
| Organize my projects                       | Collections & Library         |
| Keep long threads alive                    | Context compaction            |
| Control what the agent can do              | Settings & permissions        |
| Make it look/feel mine                     | Themes                        |
| Use it in my language                      | Localization                  |
| Use it with a screen reader / keyboard     | Accessibility                 |
| Get started with zero friction             | Onboarding                    |

---

_This catalog is a product overview. Some integrations and advanced controls depend on provider accounts, platform support, experiments, or an Octopus Studio subscription. For hands-on setup, see [the tutorials](tutorials/README.md)._
