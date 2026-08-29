/**
 * Classified application errors for IPC/main-process code.
 * Use {@link OctopusStudioError} with a {@link OctopusStudioErrorKind} so telemetry can ignore
 * high-volume, non-actionable failures (see `shouldFilterTelemetryException`).
 */

export enum OctopusStudioErrorKind {
  Validation = "validation",
  NotFound = "not_found",
  Auth = "auth",
  Precondition = "precondition",
  Conflict = "conflict",
  UserCancelled = "user_cancelled",
  RateLimited = "rate_limited",
  /** Upstream failures; reported to PostHog by default unless you add finer metadata later. */
  External = "external",
  /** Bugs, invariant violations, unexpected failures — always reported. */
  Internal = "internal",
  /** Unclassified; treated as reportable until call sites are migrated. */
  Unknown = "unknown",
}

const TELEMETRY_FILTERED_KINDS: ReadonlySet<OctopusStudioErrorKind> = new Set([
  OctopusStudioErrorKind.Validation,
  OctopusStudioErrorKind.NotFound,
  OctopusStudioErrorKind.Auth,
  OctopusStudioErrorKind.Precondition,
  OctopusStudioErrorKind.Conflict,
  OctopusStudioErrorKind.UserCancelled,
  OctopusStudioErrorKind.RateLimited,
]);

/**
 * Returns true if this kind should not be sent to PostHog as an `$exception` event.
 */
export function isOctopusStudioErrorKindFilteredFromTelemetry(
  kind: OctopusStudioErrorKind,
): boolean {
  return TELEMETRY_FILTERED_KINDS.has(kind);
}

export class OctopusStudioError extends Error {
  readonly kind: OctopusStudioErrorKind;
  readonly cause?: unknown;

  constructor(
    message: string,
    kind: OctopusStudioErrorKind,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "OctopusStudioError";
    this.kind = kind;
    this.cause = options?.cause;
  }
}

export function isOctopusStudioError(
  error: unknown,
): error is OctopusStudioError {
  return error instanceof OctopusStudioError;
}
