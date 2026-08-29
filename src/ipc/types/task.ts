import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { ModelSelectionSchema } from "@/lib/schemas";

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  prompt: z.string(),
  scheduleMinutes: z.number().int().positive().nullable(),
  enabled: z.boolean(),
  projectId: z.number().nullable(),
  mcpServerIds: z.array(z.number()).nullable(),
  modelSelection: ModelSelectionSchema.nullable(),
  lastRunAt: z.date().nullable(),
  lastChatId: z.number().nullable(),
  // Null in a paginated list response — the token total isn't computed for
  // every row up front; fetch it lazily via getTaskTokenTotal when a row
  // expands. Create/update/run responses always populate the real value.
  totalTokens: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskParamsSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  scheduleMinutes: z.number().int().positive().nullable().optional(),
  projectId: z.number().nullable().optional(),
  mcpServerIds: z.array(z.number()).nullable().optional(),
  modelSelection: ModelSelectionSchema.nullable().optional(),
});

export const UpdateTaskParamsSchema = z.object({
  taskId: z.number(),
  title: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  scheduleMinutes: z.number().int().positive().nullable().optional(),
  enabled: z.boolean().optional(),
  projectId: z.number().nullable().optional(),
  mcpServerIds: z.array(z.number()).nullable().optional(),
  modelSelection: ModelSelectionSchema.nullable().optional(),
});

export const ListTasksParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export const ListTasksResultSchema = z.object({
  items: z.array(TaskSchema),
  totalCount: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export const taskContracts = {
  listTasks: defineContract({
    channel: "list-tasks",
    input: ListTasksParamsSchema,
    output: ListTasksResultSchema,
  }),
  getTaskTokenTotal: defineContract({
    channel: "get-task-token-total",
    input: z.number(),
    output: z.number(),
  }),
  createTask: defineContract({
    channel: "create-task",
    input: CreateTaskParamsSchema,
    output: TaskSchema,
  }),
  updateTask: defineContract({
    channel: "update-task",
    input: UpdateTaskParamsSchema,
    output: TaskSchema,
  }),
  deleteTask: defineContract({
    channel: "delete-task",
    input: z.number(),
    output: z.void(),
  }),
  runTaskNow: defineContract({
    channel: "run-task-now",
    input: z.number(),
    output: z.object({ chatId: z.number(), appId: z.number() }),
  }),
};

export const taskClient = createClient(taskContracts);
