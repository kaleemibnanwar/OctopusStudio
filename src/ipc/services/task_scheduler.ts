import { eq } from "drizzle-orm";
import log from "electron-log";
import { db } from "@/db";
import { apps, chats, tasks } from "@/db/schema";
import { ensureDefaultChatProject } from "@/db/default_chat_project";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { createChatForApp } from "../utils/chat_creation_utils";
import { dispatchScheduledTaskTurn } from "./chat_actor_service";

const logger = log.scope("task_scheduler");

const TICK_INTERVAL_MS = 60_000; // check once a minute

/**
 * Run a task: create a chat in the target project and dispatch the task prompt
 * as a model turn. The chat-stream actor admits the intent, persists the user
 * message, and streams the assistant reply. Returns the chat so the renderer
 * can open it.
 *
 * `lastRunAt`/`lastChatId` are only updated after the turn is accepted, so a
 * failed dispatch is retried on the next tick.
 */
export async function runTask(
  taskId: number,
): Promise<{ chatId: number; appId: number }> {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) {
    throw new OctopusStudioError(
      "Task not found",
      OctopusStudioErrorKind.NotFound,
    );
  }

  // Target the task's project, else the default chat project.
  let projectId = task.projectId;
  if (projectId == null) {
    projectId = (await ensureDefaultChatProject()).id;
  }

  const project = await db.query.apps.findFirst({
    where: eq(apps.id, projectId),
    columns: { type: true },
  });
  const requestedChatMode = project?.type === "chat" ? "local-agent" : "build";

  const chatId = await createChatForApp({
    appId: projectId,
    title: task.title,
    initialChatMode: requestedChatMode,
  });

  if (task.modelSelection) {
    await db
      .update(chats)
      .set({ modelSelection: task.modelSelection })
      .where(eq(chats.id, chatId));
  }

  // Dispatches the intent and fires the model turn. The actor inserts the user
  // message itself when the intent is accepted.
  const result = await dispatchScheduledTaskTurn({
    chatId,
    appId: projectId,
    prompt: task.prompt,
    requestedChatMode,
  });
  if (result === "rejected") {
    throw new OctopusStudioError(
      "Scheduled task turn was rejected",
      OctopusStudioErrorKind.Conflict,
    );
  }

  await db
    .update(tasks)
    .set({ lastRunAt: new Date(), lastChatId: chatId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  return { chatId, appId: projectId };
}

/** Whether a recurring task's interval has elapsed as of `nowMs`. */
export function isTaskDue(
  task: { scheduleMinutes: number | null; lastRunAt: Date | null },
  nowMs: number,
): boolean {
  if (task.scheduleMinutes == null) {
    return false;
  }
  if (task.lastRunAt == null) {
    return true; // never run → due now
  }
  return nowMs - task.lastRunAt.getTime() >= task.scheduleMinutes * 60_000;
}

/** Fire every enabled recurring task whose interval has elapsed. */
export async function runDueTasks(): Promise<void> {
  const scheduled = await db.query.tasks.findMany({
    where: eq(tasks.enabled, true),
  });

  const now = Date.now();
  for (const task of scheduled) {
    if (!isTaskDue(task, now)) {
      continue;
    }
    try {
      await runTask(task.id);
    } catch (error) {
      logger.error(`Scheduled task ${task.id} failed:`, error);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startTaskScheduler(): void {
  if (timer) {
    return;
  }
  void runDueTasks(); // best-effort catch-up on launch
  timer = setInterval(() => {
    void runDueTasks();
  }, TICK_INTERVAL_MS);
}

export function stopTaskScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
