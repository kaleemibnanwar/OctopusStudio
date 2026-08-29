import type { McpCatalogEntry } from "@/ipc/types/mcp_catalog";

/**
 * A bundled fallback catalog of real, currently-operating MCP servers —
 * mostly official vendor integrations (remote, OAuth) plus a handful of
 * well-established open-source stdio servers. Ships with the app so the
 * Plugins catalog isn't empty offline or before the hosted catalog exists;
 * merged with whatever the remote catalog returns (see mcp_catalog_source.ts).
 *
 * Every entry here was verified against the vendor's own docs/GitHub repo —
 * no invented packages or guessed URLs. Stdio package versions are
 * intentionally unpinned (`npx -y <package>`, no `@version`) since this list
 * ships in app code rather than a server that can be kept current the way
 * cloud-hosted catalog entries are.
 */
export const LOCAL_MCP_CATALOG: McpCatalogEntry[] = [
  // --- Communication ---
  {
    slug: "gmail",
    name: "Gmail",
    description:
      "Read, search, send, and label email through your Gmail account.",
    category: "Communication",
    featured: true,
    transport: "stdio",
    command: "npx",
    args: ["-y", "@gongrzhe/server-gmail-autoauth-mcp"],
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Read channels, search messages, and post to Slack.",
    category: "Communication",
    featured: true,
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    inputs: [
      { kind: "env", name: "SLACK_BOT_TOKEN", label: "Bot User OAuth Token" },
      { kind: "env", name: "SLACK_TEAM_ID", label: "Team ID" },
    ],
  },
  {
    slug: "intercom",
    name: "Intercom",
    description:
      "Search and read conversations, contacts, companies, and help center articles.",
    category: "Communication",
    transport: "http",
    url: "https://mcp.intercom.com/mcp",
    oauth: { required: true },
  },

  // --- Design ---
  {
    slug: "canva",
    name: "Canva",
    description:
      "Create designs, autofill brand templates, search your library, and export.",
    category: "Design",
    featured: true,
    transport: "http",
    url: "https://mcp.canva.com/mcp",
    oauth: { required: true },
  },
  {
    slug: "figma",
    name: "Figma",
    description: "Pull design context, tokens, and Code Connect data from Figma.",
    category: "Design",
    featured: true,
    transport: "http",
    url: "https://mcp.figma.com/mcp",
    oauth: { required: true },
  },

  // --- Productivity ---
  {
    slug: "notion",
    name: "Notion",
    description: "Search, read, and edit pages and databases in your workspace.",
    category: "Productivity",
    featured: true,
    transport: "http",
    url: "https://mcp.notion.com/mcp",
    oauth: { required: true },
  },
  {
    slug: "airtable",
    name: "Airtable",
    description: "Inspect base schemas, then read and write records.",
    category: "Productivity",
    transport: "stdio",
    command: "npx",
    args: ["-y", "airtable-mcp-server"],
    inputs: [
      {
        kind: "env",
        name: "AIRTABLE_API_KEY",
        label: "Personal Access Token",
      },
    ],
  },
  {
    slug: "todoist",
    name: "Todoist",
    description: "Create, complete, and organize tasks and projects.",
    category: "Productivity",
    transport: "http",
    url: "https://ai.todoist.net/mcp",
    oauth: { required: true },
  },

  // --- Project management ---
  {
    slug: "linear",
    name: "Linear",
    description: "Find, create, and update issues, projects, and comments.",
    category: "Project Management",
    featured: true,
    transport: "http",
    url: "https://mcp.linear.app/mcp",
    oauth: { required: true },
  },
  {
    slug: "atlassian",
    name: "Atlassian (Jira & Confluence)",
    description:
      "Search and update Jira issues and Confluence pages, plus Compass and Bitbucket.",
    category: "Project Management",
    transport: "http",
    url: "https://mcp.atlassian.com/v1/mcp/authv2",
    oauth: { required: true },
  },
  {
    slug: "asana",
    name: "Asana",
    description: "Create, update, and search tasks across your workspace.",
    category: "Project Management",
    transport: "http",
    url: "https://mcp.asana.com/v2/mcp",
    oauth: { required: true },
  },
  {
    slug: "monday",
    name: "monday.com",
    description: "Read and update boards, items, and updates in your workspace.",
    category: "Project Management",
    transport: "http",
    url: "https://mcp.monday.com/mcp",
    oauth: { required: true },
  },

  // --- CRM & sales ---
  {
    slug: "hubspot",
    name: "HubSpot",
    description: "Look up and update contacts, companies, deals, and tickets.",
    category: "CRM & Sales",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@hubspot/mcp-server"],
    inputs: [
      {
        kind: "env",
        name: "PRIVATE_APP_ACCESS_TOKEN",
        label: "Private App Access Token",
      },
    ],
  },

  // --- Payments & commerce ---
  {
    slug: "stripe",
    name: "Stripe",
    description:
      "Manage customers, products, invoices, subscriptions, and refunds.",
    category: "Payments & Commerce",
    featured: true,
    transport: "http",
    url: "https://mcp.stripe.com",
    oauth: { required: true },
  },
  {
    slug: "paypal",
    name: "PayPal",
    description: "Create invoices, process orders and refunds, manage disputes.",
    category: "Payments & Commerce",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@paypal/mcp", "--tools=all"],
    inputs: [
      { kind: "env", name: "PAYPAL_ACCESS_TOKEN", label: "Access Token" },
    ],
  },
  {
    slug: "shopify-dev",
    name: "Shopify Dev",
    description:
      "Live access to Shopify's API docs and schema validation while you build.",
    category: "Payments & Commerce",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@shopify/dev-mcp"],
  },

  // --- Infrastructure & cloud ---
  {
    slug: "cloudflare",
    name: "Cloudflare",
    description: "Manage Workers, DNS, and other Cloudflare account resources.",
    category: "Infrastructure",
    transport: "http",
    url: "https://mcp.cloudflare.com",
    oauth: { required: true },
  },
  {
    slug: "vercel",
    name: "Vercel",
    description:
      "Search docs, manage projects and deployments, and query analytics.",
    category: "Infrastructure",
    transport: "http",
    url: "https://mcp.vercel.com",
    oauth: { required: true },
  },
  {
    slug: "digitalocean",
    name: "DigitalOcean",
    description: "Manage Droplets, App Platform, databases, and Kubernetes.",
    category: "Infrastructure",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@digitalocean/mcp"],
    inputs: [
      { kind: "env", name: "DIGITALOCEAN_API_TOKEN", label: "API Token" },
    ],
  },

  // --- Databases ---
  {
    slug: "neon",
    name: "Neon",
    description: "Create branches, run queries, and manage Postgres projects.",
    category: "Databases",
    transport: "http",
    url: "https://mcp.neon.tech/mcp",
    oauth: { required: true },
  },
  {
    slug: "supabase",
    name: "Supabase",
    description:
      "Manage tables, auth, storage, edge functions, and run SQL (read-only by default).",
    category: "Databases",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@supabase/mcp-server-supabase", "--read-only"],
    inputs: [
      {
        kind: "env",
        name: "SUPABASE_ACCESS_TOKEN",
        label: "Personal Access Token",
      },
    ],
  },
  {
    slug: "mongodb",
    name: "MongoDB",
    description: "Query, index, and manage MongoDB and Atlas clusters.",
    category: "Databases",
    transport: "stdio",
    command: "npx",
    args: ["-y", "mongodb-mcp-server"],
    inputs: [
      {
        kind: "env",
        name: "MDB_MCP_CONNECTION_STRING",
        label: "Connection String",
      },
    ],
  },

  // --- Search & research ---
  {
    slug: "perplexity",
    name: "Perplexity",
    description: "Real-time web search and research backed by Sonar models.",
    category: "Search & Research",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@perplexity-ai/mcp-server"],
    inputs: [{ kind: "env", name: "PERPLEXITY_API_KEY", label: "API Key" }],
  },
  {
    slug: "brave-search",
    name: "Brave Search",
    description: "Web and local search via the Brave Search API.",
    category: "Search & Research",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    inputs: [{ kind: "env", name: "BRAVE_API_KEY", label: "API Key" }],
  },
  {
    slug: "firecrawl",
    name: "Firecrawl",
    description: "Scrape, crawl, and search the live web for clean, agent-ready content.",
    category: "Search & Research",
    transport: "stdio",
    command: "npx",
    args: ["-y", "firecrawl-mcp"],
    inputs: [{ kind: "env", name: "FIRECRAWL_API_KEY", label: "API Key" }],
  },

  // --- Developer tools ---
  {
    slug: "github",
    name: "GitHub",
    description: "Repository, issue, PR, and workflow context from GitHub.",
    category: "Developer Tools",
    featured: true,
    transport: "http",
    url: "https://api.githubcopilot.com/mcp/",
    oauth: { required: true },
  },
  {
    slug: "sentry",
    name: "Sentry",
    description: "Look up issues, errors, and Seer root-cause analysis.",
    category: "Developer Tools",
    transport: "http",
    url: "https://mcp.sentry.dev/mcp",
    oauth: { required: true },
  },
  {
    slug: "playwright",
    name: "Playwright",
    description:
      "Drive a real browser via accessibility snapshots — no screenshots needed.",
    category: "Developer Tools",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@playwright/mcp"],
  },
  {
    slug: "filesystem",
    name: "Filesystem",
    description: "Read, write, and search files in a local directory you choose.",
    category: "Developer Tools",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
  },
  {
    slug: "memory",
    name: "Memory",
    description: "A simple persistent knowledge-graph memory for the agent.",
    category: "Developer Tools",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
  {
    slug: "sequential-thinking",
    name: "Sequential Thinking",
    description:
      "A structured scratchpad for working through complex problems step by step.",
    category: "Developer Tools",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  },
  {
    slug: "everything",
    name: "Everything",
    description:
      "Reference server exercising every MCP feature — useful for testing a client.",
    category: "Developer Tools",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everything"],
  },
];
