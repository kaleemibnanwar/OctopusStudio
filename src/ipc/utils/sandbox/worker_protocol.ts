import {
  OctopusStudioError,
  OctopusStudioErrorKind,
  isOctopusStudioError,
} from "@/errors/octopus_studio_error";
import type { SandboxHostCallName } from "./capabilities";
import type { SandboxRunResult } from "./execution";

export interface SandboxWorkerInput {
  appPath: string;
  script: string;
  timeoutMs: number;
  persistFullOutput?: boolean;
}

export interface SandboxWorkerHostCall {
  name: SandboxHostCallName;
  path?: string;
}

export interface SerializedSandboxWorkerError {
  name?: string;
  message: string;
  kind?: OctopusStudioErrorKind;
  stack?: string;
}

export type SandboxWorkerMessage =
  | { type: "vmBudgetStart" }
  | { type: "vmBudgetPause" }
  | { type: "vmBudgetResume" }
  | { type: "hostCall"; hostCall: SandboxWorkerHostCall }
  | { type: "result"; result: SandboxRunResult }
  | { type: "error"; error: SerializedSandboxWorkerError };

export function serializeSandboxWorkerError(
  error: unknown,
): SerializedSandboxWorkerError {
  if (isOctopusStudioError(error)) {
    return {
      name: error.name,
      message: error.message,
      kind: error.kind,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

function isOctopusStudioErrorKind(
  value: unknown,
): value is OctopusStudioErrorKind {
  return (
    typeof value === "string" &&
    Object.values(OctopusStudioErrorKind).includes(
      value as OctopusStudioErrorKind,
    )
  );
}

export function deserializeSandboxWorkerError(
  error: SerializedSandboxWorkerError,
): Error {
  if (isOctopusStudioErrorKind(error.kind)) {
    const octopusStudioError = new OctopusStudioError(
      error.message,
      error.kind,
    );
    octopusStudioError.stack = error.stack;
    return octopusStudioError;
  }

  const genericError = new Error(error.message);
  genericError.name = error.name ?? genericError.name;
  genericError.stack = error.stack;
  return genericError;
}
