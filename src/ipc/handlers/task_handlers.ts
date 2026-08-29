import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { messages, tasks } from "../../db/schema";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";
import { createTypedHandler } from "./base";
import { taskContracts } from "../types/task";
import { runTask } from "../services/task_scheduler";

async function chatTokenTotal(chatId: number | null): Promise<number> {
  if (chatId == null) return 0;
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${messages.maxTokensUsed}), 0)`,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId));
  return Number(row?.total ?? 0);
}

export function registerTaskHandlers() {
  createTypedHandler(taskContracts.listTasks, async (_, params) => {
    // Lightweight page fetch: no per-task token join here (that's a separate
    // query per task via getTaskTokenTotal, fetched lazily when a row
    // expands) so opening the Tasks page stays cheap regardless of how many
    // tasks — or how much chat history behind them — exist.
    const { page, pageSize } = params;
    const [items, [{ count }]] = await Promise.all([
      db.query.tasks.findMany({
        orderBy: [desc(tasks.createdAt)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db.select({ count: sql<number>`count(*)` }).from(tasks),
    ]);

    return {
      items: items.map((task) => ({ ...task, totalTokens: null })),
      totalCount: Number(count),
      page,
      pageSize,
    };
  });

  createTypedHandler(taskContracts.getTaskTokenTotal, async (_, taskId) => {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      columns: { lastChatId: true },
    });
    return chatTokenTotal(task?.lastChatId ?? null);
  });

  createTypedHandler(taskContracts.createTask, async (_, params) => {
    const [created] = await db
      .insert(tasks)
      .values({
        title: params.title,
        prompt: params.prompt,
        scheduleMinutes: params.scheduleMinutes ?? null,
        projectId: params.projectId ?? null,
        mcpServerIds: params.mcpServerIds ?? null,
        modelSelection: params.modelSelection ?? null,
      })
      .returning();
    return { ...created, totalTokens: 0 };
  });

  createTypedHandler(taskContracts.updateTask, async (_, params) => {
    const { taskId, ...fields } = params;
    const updates: Partial<typeof tasks.$inferInsert> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.prompt !== undefined) updates.prompt = fields.prompt;
    if (fields.scheduleMinutes !== undefined) {
      updates.scheduleMinutes = fields.scheduleMinutes;
    }
    if (fields.enabled !== undefined) updates.enabled = fields.enabled;
    if (fields.projectId !== undefined) updates.projectId = fields.projectId;
    if (fields.mcpServerIds !== undefined) {
      updates.mcpServerIds = fields.mcpServerIds;
    }
    if (fields.modelSelection !== undefined) {
      updates.modelSelection = fields.modelSelection;
    }
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, taskId))
      .returning();
    if (!updated) {
      throw new OctopusStudioError(
        "Task not found",
        OctopusStudioErrorKind.NotFound,
      );
    }
    return {
      ...updated,
      totalTokens: await chatTokenTotal(updated.lastChatId),
    };
  });

  createTypedHandler(taskContracts.deleteTask, async (_, taskId) => {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  });

  createTypedHandler(taskContracts.runTaskNow, async (_, taskId) => {
    return runTask(taskId);
  });
}
