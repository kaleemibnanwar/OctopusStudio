import { and, desc, eq, gt } from "drizzle-orm";
import log from "electron-log";
import { db } from "@/db";
import { apps, messages, workerPersonas, workerRunSteps, workerRuns } from "@/db/schema";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { createChatForApp } from "../utils/chat_creation_utils";
import {
  dispatchScheduledTaskTurn,
  waitForChatActorIdle,
} from "./chat_actor_service";

const logger = log.scope("worker_run_service");

type Persona = typeof workerPersonas.$inferSelect;

type SquadStepKind = "kickoff" | "work" | "wrapup" | "solo";

interface SquadStep {
  persona: Persona;
  kind: SquadStepKind;
}

/**
 * Lays out a squad's turn order: the first persona opens with a plan, every
 * other persona does a turn of real work against that plan, and — if there's
 * more than one persona — the first persona closes with a wrap-up turn whose
 * reply becomes the run's report. A single-persona squad gets one combined
 * turn instead.
 */
function buildSquadSteps(personas: Persona[]): SquadStep[] {
  if (personas.length === 0) {
    throw new OctopusStudioError(
      "No personas to dispatch. Register at least one persona first.",
      OctopusStudioErrorKind.Precondition,
    );
  }
  if (personas.length === 1) {
    return [{ persona: personas[0], kind: "solo" }];
  }
  const [lead, ...rest] = personas;
  return [
    { persona: lead, kind: "kickoff" },
    ...rest.map((persona): SquadStep => ({ persona, kind: "work" })),
    { persona: lead, kind: "wrapup" },
  ];
}

function buildStepPrompt(step: SquadStep, goal: string): string {
  const header = `[Persona: ${step.persona.name} — ${step.persona.role}]\n${step.persona.systemPrompt}`;
  switch (step.kind) {
    case "solo":
      return `${header}\n\nObjective: ${goal}\n\nDo this yourself: make a short plan, carry it out (real changes — code, tests, docs — as needed), then close with a concise Markdown standup report of what you accomplished.`;
    case "kickoff":
      return `${header}\n\nObjective: ${goal}\n\nBreak this down into a short, concrete plan the rest of the squad can follow. Don't implement anything yet — just the plan.`;
    case "work":
      return `${header}\n\nBased on the plan above, do your part of this objective: ${goal}\n\nMake the actual changes needed (code, tests, docs, whatever your role covers) and summarize what you changed.`;
    case "wrapup":
      return `${header}\n\nReview everything the squad just did for "${goal}" in this thread and write a concise standup report in Markdown: what was accomplished, what changed, and any follow-ups.`;
  }
}

async function getLatestAssistantMessage(chatId: number, afterId = 0) {
  return db.query.messages.findFirst({
    where: and(
      eq(messages.chatId, chatId),
      eq(messages.role, "assistant"),
      gt(messages.id, afterId),
    ),
    orderBy: [desc(messages.id)],
  });
}

function summarize(content: string, max = 480): string {
  const trimmed = content.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export async function dispatchSquadRun(input: {
  projectId: number;
  goal: string;
  personaIds?: number[];
}): Promise<{ runId: number; chatId: number }> {
  const project = await db.query.apps.findFirst({
    where: eq(apps.id, input.projectId),
    columns: { id: true, type: true, name: true },
  });
  if (!project) {
    throw new OctopusStudioError("Project not found", OctopusStudioErrorKind.NotFound);
  }

  const allPersonas = await db.query.workerPersonas.findMany({
    orderBy: [workerPersonas.createdAt],
  });
  const personas = input.personaIds?.length
    ? input.personaIds
        .map((id) => allPersonas.find((p) => p.id === id))
        .filter((p): p is Persona => p != null)
    : allPersonas;

  const steps = buildSquadSteps(personas);
  const requestedChatMode = project.type === "chat" ? "local-agent" : "build";

  const chatId = await createChatForApp({
    appId: project.id,
    title: `Squad run: ${input.goal.slice(0, 60)}`,
    initialChatMode: requestedChatMode,
  });

  const [run] = await db
    .insert(workerRuns)
    .values({
      projectId: project.id,
      goal: input.goal,
      status: "running",
      chatId,
      totalSteps: steps.length,
    })
    .returning();

  await db.insert(workerRunSteps).values(
    steps.map((step, index) => ({
      runId: run.id,
      stepIndex: index,
      personaId: step.persona.id,
      personaName: step.persona.name,
      personaRole: step.persona.role,
      instructions: buildStepPrompt(step, input.goal),
    })),
  );

  // Runs in the background; the renderer polls listRuns()/getRun() for progress.
  void runSquad(run.id, chatId, requestedChatMode).catch((error) => {
    logger.error(`Squad run ${run.id} crashed:`, error);
  });

  return { runId: run.id, chatId };
}

async function runSquad(
  runId: number,
  chatId: number,
  requestedChatMode: "local-agent" | "build",
): Promise<void> {
  const run = await db.query.workerRuns.findFirst({
    where: eq(workerRuns.id, runId),
  });
  if (!run || run.projectId == null) {
    logger.error(`Squad run ${runId} has no project; aborting.`);
    return;
  }
  const appId = run.projectId;

  const steps = await db.query.workerRunSteps.findMany({
    where: eq(workerRunSteps.runId, runId),
    orderBy: [workerRunSteps.stepIndex],
  });

  for (const step of steps) {
    const fresh = await db.query.workerRuns.findFirst({
      where: eq(workerRuns.id, runId),
      columns: { cancelRequested: true },
    });
    if (fresh?.cancelRequested) {
      await db
        .update(workerRunSteps)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(workerRunSteps.id, step.id));
      await db
        .update(workerRuns)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(eq(workerRuns.id, runId));
      return;
    }

    await db
      .update(workerRunSteps)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(workerRunSteps.id, step.id));

    try {
      const priorMessage = await getLatestAssistantMessage(chatId);
      const acceptance = await dispatchScheduledTaskTurn({
        chatId,
        appId,
        prompt: step.instructions,
        requestedChatMode,
      });
      if (acceptance === "rejected") {
        throw new Error("Turn was rejected (app busy or locked)");
      }

      await waitForChatActorIdle(chatId);

      const reply = await getLatestAssistantMessage(chatId, priorMessage?.id ?? 0);
      const content = reply?.content?.trim() || "(no reply)";

      await db
        .update(workerRunSteps)
        .set({
          status: "completed",
          messageId: reply?.id ?? null,
          summary: summarize(content),
          completedAt: new Date(),
        })
        .where(eq(workerRunSteps.id, step.id));

      const isFinalStep = step.stepIndex === steps.length - 1;
      await db
        .update(workerRuns)
        .set({
          currentStepIndex: step.stepIndex + 1,
          ...(isFinalStep ? { report: content } : {}),
        })
        .where(eq(workerRuns.id, runId));
    } catch (error) {
      logger.error(`Squad run ${runId} step ${step.stepIndex} failed:`, error);
      await db
        .update(workerRunSteps)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(workerRunSteps.id, step.id));
      await db
        .update(workerRuns)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        })
        .where(eq(workerRuns.id, runId));
      return;
    }
  }

  await db
    .update(workerRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(workerRuns.id, runId));
}

export async function cancelSquadRun(runId: number): Promise<void> {
  const run = await db.query.workerRuns.findFirst({
    where: eq(workerRuns.id, runId),
  });
  if (!run) {
    throw new OctopusStudioError("Run not found", OctopusStudioErrorKind.NotFound);
  }
  if (run.status !== "running") {
    return;
  }
  await db
    .update(workerRuns)
    .set({ cancelRequested: true })
    .where(eq(workerRuns.id, runId));
  if (run.chatId != null) {
    // Interrupts the in-flight turn; the loop in runSquad() notices
    // cancelRequested before dispatching the next step regardless.
    await waitForChatActorIdle(run.chatId, { cancelActive: true });
  }
}
