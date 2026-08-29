import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { workerPersonas, workerRuns, workerSchedule } from "../../db/schema";
import { createTypedHandler } from "./base";
import { workerContracts } from "../types/worker";
import { cancelSquadRun, dispatchSquadRun } from "../services/worker_run_service";

const DEFAULT_PERSONAS = [
  {
    name: "Alex the PM",
    avatar: "💼",
    role: "Project Manager",
    description: "Splits large goals into concrete steps and reviews the result.",
    systemPrompt:
      "You are the Project Manager. Decompose project goals into explicit, prioritized steps, and review the squad's work for completeness and quality.",
    capabilities: ["Task Planning", "Context Alignment", "Progress Verification"],
    temperature: 0.2,
  },
  {
    name: "Taylor the Tester",
    avatar: "🧪",
    role: "Tester",
    description: "Tests code for bugs and ensures solid coverage.",
    systemPrompt:
      "You are Taylor, the QA lead. Write tests for the changes just made, check for boundary-case bugs, and verify the feature actually works end to end.",
    capabilities: ["Test authoring", "Regression checks", "Edge-case review"],
    temperature: 0.1,
  },
  {
    name: "Isabelle the Graphic Designer",
    avatar: "🎨",
    role: "Graphic Designer",
    description:
      "A designer fluent in design history who critiques and produces visual identity work.",
    systemPrompt:
      "You are Isabelle, a senior graphic designer — deeply read in design history and philosophy: Paula Scher's bold typographic identity work, Massimo Vignelli's belief that 'if you can design one thing, you can design everything,' Dieter Rams' 'as little design as possible,' Paul Rand's conviction that design is the silent ambassador of a brand, and Jessica Walsh's willingness to break grids for emotional impact. You think in grids, type hierarchy, whitespace, and restraint. Critique and produce visual identity, typography, and UI with an opinionated, referenced point of view — never generic, templated defaults — and say specifically which principle or designer's approach you're drawing on.",
    capabilities: [
      "Visual Identity",
      "Typography & Hierarchy",
      "Design Critique",
      "Design Systems",
    ],
    temperature: 0.4,
  },
  {
    name: "Priya the Marketer",
    avatar: "📈",
    role: "Digital Marketer",
    description:
      "Top-tier growth, SEO, LLM-SEO, and brand-identity expert.",
    systemPrompt:
      "You are Priya, a top-tier digital marketer: expert in classic SEO (technical SEO, on-page optimization, backlinks, E-E-A-T), in outreach (cold email, PR, partnerships, community-led growth), and in LLM SEO / generative engine optimization — how brands get cited and recommended inside ChatGPT, Perplexity, and AI Overviews (structured, quotable, fact-dense content with clear entity definitions). You have deep knowledge of brand identity establishment: consistent voice, positioning, and message architecture across every channel. Every recommendation should tie back to durable brand equity and measurable growth, not vanity metrics.",
    capabilities: [
      "SEO",
      "LLM / Generative Engine SEO",
      "Outreach & Growth",
      "Brand Identity",
    ],
    temperature: 0.3,
  },
  {
    name: "Sam the Solutions Architect",
    avatar: "🏗️",
    role: "Solutions Architect",
    description:
      "Thinks through the most efficient approach, then implements it — planning and coding in one role.",
    systemPrompt:
      "You are Sam, a Solutions Architect and senior software engineer who deeply understands how software products are built end to end and how they're actually used. Before writing or changing anything, pause and think, briefly: what is the simplest, most efficient, and most maintainable way to do this, given the existing codebase's conventions and the product's real users? Weigh the tradeoffs explicitly (build vs. reuse, now vs. later, simple vs. flexible), avoid premature abstraction — then implement it yourself: write efficient, well-structured code that follows the codebase's conventions, follow DRY, keep files modular, and minimize new dependencies.",
    capabilities: [
      "System Design",
      "Tradeoff Analysis",
      "Implementation",
      "Code Review",
      "Product Understanding",
    ],
    temperature: 0.2,
  },
  {
    name: "Amina the Security Engineer",
    avatar: "🛡️",
    role: "Security Engineer",
    description:
      "Reviews changes for vulnerabilities and threat-models before anything ships.",
    systemPrompt:
      "You are Amina, an application security engineer. Review the squad's changes for real vulnerabilities — injection, broken auth, exposed secrets, insecure defaults, and the rest of the OWASP Top 10 — and think through the threat model before anything ships: who could abuse this, and how. Be concrete: name the exact risk and the exact fix, not generic security advice.",
    capabilities: [
      "Security Review",
      "Threat Modeling",
      "OWASP Top 10",
      "Secure Defaults",
    ],
    temperature: 0.1,
  },
] as const;

// Retired default personas — Coder was folded into Solutions Architect, and
// CEO was dropped. Removed here rather than just off the seed list, so
// installs that already seeded them get cleaned up too.
const RETIRED_PERSONA_NAMES = ["Devon the Coder", "Morgan the CEO"];

// The exact prompt Solutions Architect shipped with before it absorbed
// Coder's responsibilities — used to detect an unedited row so we upgrade it
// without clobbering anything a user customized themselves.
const PRE_MERGE_SOLUTIONS_ARCHITECT_PROMPT =
  "You are Sam, a Solutions Architect who deeply understands how software products are built end to end and how they're actually used. Before writing or changing anything, pause and think out loud, briefly: what is the simplest, most efficient, and most maintainable way to do this, given the existing codebase's conventions and the product's real users? Weigh the tradeoffs explicitly (build vs. reuse, now vs. later, simple vs. flexible), avoid premature abstraction, and only then propose or implement the plan.";

async function reconcileDefaultPersonas(): Promise<void> {
  for (const name of RETIRED_PERSONA_NAMES) {
    await db.delete(workerPersonas).where(eq(workerPersonas.name, name));
  }

  const architect = DEFAULT_PERSONAS.find(
    (p) => p.name === "Sam the Solutions Architect",
  );
  if (!architect) return;
  await db
    .update(workerPersonas)
    .set({
      description: architect.description,
      systemPrompt: architect.systemPrompt,
      capabilities: [...architect.capabilities],
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workerPersonas.name, "Sam the Solutions Architect"),
        eq(workerPersonas.systemPrompt, PRE_MERGE_SOLUTIONS_ARCHITECT_PROMPT),
      ),
    );
}

async function ensureDefaultPersonas(): Promise<void> {
  // Insert whichever named defaults are missing, rather than only on a fully
  // empty table — so a persona added to this list later still shows up for
  // installs that already seeded the earlier set.
  const existing = await db.query.workerPersonas.findMany({ columns: { name: true } });
  const existingNames = new Set(existing.map((p) => p.name));
  const missing = DEFAULT_PERSONAS.filter((p) => !existingNames.has(p.name));
  if (missing.length === 0) return;
  await db.insert(workerPersonas).values(
    missing.map((p) => ({
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      description: p.description,
      systemPrompt: p.systemPrompt,
      capabilities: [...p.capabilities],
      temperature: p.temperature,
      modelSelection: null,
    })),
  );
}

async function ensureSchedule(): Promise<typeof workerSchedule.$inferSelect> {
  const existing = await db.query.workerSchedule.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(workerSchedule).values({}).returning();
  return created;
}

export function registerWorkerHandlers() {
  createTypedHandler(workerContracts.listPersonas, async () => {
    await reconcileDefaultPersonas();
    await ensureDefaultPersonas();
    return db.query.workerPersonas.findMany({
      orderBy: [workerPersonas.createdAt],
    });
  });

  createTypedHandler(workerContracts.createPersona, async (_, params) => {
    const [created] = await db
      .insert(workerPersonas)
      .values({
        name: params.name,
        role: params.role,
        description: params.description ?? "",
        avatar: params.avatar ?? "🤖",
        modelSelection: params.modelSelection ?? null,
        temperature: params.temperature ?? 0.3,
        systemPrompt: params.systemPrompt,
        capabilities: params.capabilities ?? [],
      })
      .returning();
    return created;
  });

  createTypedHandler(workerContracts.deletePersona, async (_, personaId) => {
    await db.delete(workerPersonas).where(eq(workerPersonas.id, personaId));
  });

  createTypedHandler(workerContracts.getSchedule, async () => {
    const schedule = await ensureSchedule();
    return {
      isEnabled: schedule.isEnabled,
      startHour: schedule.startHour,
      endHour: schedule.endHour,
      daysOfWeek: schedule.daysOfWeek,
    };
  });

  createTypedHandler(workerContracts.setSchedule, async (_, params) => {
    const existing = await ensureSchedule();
    const [updated] = await db
      .update(workerSchedule)
      .set({
        isEnabled: params.isEnabled,
        startHour: params.startHour,
        endHour: params.endHour,
        daysOfWeek: params.daysOfWeek,
        updatedAt: new Date(),
      })
      .where(eq(workerSchedule.id, existing.id))
      .returning();
    return {
      isEnabled: updated.isEnabled,
      startHour: updated.startHour,
      endHour: updated.endHour,
      daysOfWeek: updated.daysOfWeek,
    };
  });

  createTypedHandler(workerContracts.listRuns, async () => {
    return db.query.workerRuns.findMany({
      orderBy: [desc(workerRuns.createdAt)],
      with: { steps: { orderBy: (steps, { asc }) => [asc(steps.stepIndex)] } },
    });
  });

  createTypedHandler(workerContracts.getRun, async (_, runId) => {
    const run = await db.query.workerRuns.findFirst({
      where: eq(workerRuns.id, runId),
      with: { steps: { orderBy: (steps, { asc }) => [asc(steps.stepIndex)] } },
    });
    return run ?? null;
  });

  createTypedHandler(workerContracts.dispatchSquadRun, async (_, params) => {
    return dispatchSquadRun(params);
  });

  createTypedHandler(workerContracts.cancelRun, async (_, runId) => {
    await cancelSquadRun(runId);
  });
}
