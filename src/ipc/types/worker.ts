import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { ModelSelectionSchema } from "@/lib/schemas";

export const WorkerPersonaSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string(),
  role: z.string(),
  description: z.string(),
  modelSelection: ModelSelectionSchema.nullable(),
  temperature: z.number(),
  systemPrompt: z.string(),
  capabilities: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type WorkerPersona = z.infer<typeof WorkerPersonaSchema>;

export const CreateWorkerPersonaParamsSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().optional(),
  avatar: z.string().optional(),
  modelSelection: ModelSelectionSchema.nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().min(1),
  capabilities: z.array(z.string()).optional(),
});

export const WorkerScheduleSchema = z.object({
  isEnabled: z.boolean(),
  startHour: z.string(),
  endHour: z.string(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
});
export type WorkerSchedule = z.infer<typeof WorkerScheduleSchema>;

export const WorkerRunStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export const WorkerRunStepSchema = z.object({
  id: z.number(),
  runId: z.number(),
  stepIndex: z.number(),
  personaId: z.number().nullable(),
  personaName: z.string(),
  personaRole: z.string(),
  instructions: z.string(),
  status: WorkerRunStepStatusSchema,
  messageId: z.number().nullable(),
  summary: z.string().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
});
export type WorkerRunStep = z.infer<typeof WorkerRunStepSchema>;

export const WorkerRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const WorkerRunSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  goal: z.string(),
  status: WorkerRunStatusSchema,
  chatId: z.number().nullable(),
  currentStepIndex: z.number(),
  totalSteps: z.number(),
  cancelRequested: z.boolean(),
  report: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
  steps: z.array(WorkerRunStepSchema),
});
export type WorkerRun = z.infer<typeof WorkerRunSchema>;

export const DispatchSquadRunParamsSchema = z.object({
  projectId: z.number(),
  goal: z.string().min(1),
  // Explicit squad order; defaults to every persona (creation order) with the
  // first persona bookending the run (kickoff + wrap-up report).
  personaIds: z.array(z.number()).optional(),
});

export const workerContracts = {
  listPersonas: defineContract({
    channel: "worker-list-personas",
    input: z.void(),
    output: z.array(WorkerPersonaSchema),
  }),
  createPersona: defineContract({
    channel: "worker-create-persona",
    input: CreateWorkerPersonaParamsSchema,
    output: WorkerPersonaSchema,
  }),
  deletePersona: defineContract({
    channel: "worker-delete-persona",
    input: z.number(),
    output: z.void(),
  }),
  getSchedule: defineContract({
    channel: "worker-get-schedule",
    input: z.void(),
    output: WorkerScheduleSchema,
  }),
  setSchedule: defineContract({
    channel: "worker-set-schedule",
    input: WorkerScheduleSchema,
    output: WorkerScheduleSchema,
  }),
  listRuns: defineContract({
    channel: "worker-list-runs",
    input: z.void(),
    output: z.array(WorkerRunSchema),
  }),
  getRun: defineContract({
    channel: "worker-get-run",
    input: z.number(),
    output: WorkerRunSchema.nullable(),
  }),
  dispatchSquadRun: defineContract({
    channel: "worker-dispatch-squad-run",
    input: DispatchSquadRunParamsSchema,
    output: z.object({ runId: z.number(), chatId: z.number() }),
  }),
  cancelRun: defineContract({
    channel: "worker-cancel-run",
    input: z.number(),
    output: z.void(),
  }),
};

export const workerClient = createClient(workerContracts);
