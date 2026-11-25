import { getClientLogger } from "../logger/logger.client";
import type { Logger } from "../logger/logger.types";
import { isApplicationError } from "./application-error";

/**
 * Error reporting helpers. An error is logged ONCE, at the boundary that owns it: the BFF wrapper on
 * the server, error boundaries in the browser. A WeakSet prevents duplicate reports of the same
 * Error instance as it bubbles through several layers.
 */

const reported = new WeakSet<object>();

/** Returns true the first time an error instance is seen. */
export function markReported(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return true;
  if (reported.has(error)) return false;
  reported.add(error);
  return true;
}

/**
 * Report an error through the given logger. Expected 4xx application errors are WARN-level at most
 * (not systematically ERROR); anything else is an unexpected failure and logs as ERROR.
 */
export function reportError(logger: Logger, event: string, error: unknown, metadata: Record<string, unknown> = {}) {
  if (!markReported(error)) return;
  if (isApplicationError(error) && error.status < 500) {
    logger.warn(event, { ...metadata, errorCode: error.code, statusCode: error.status });
    return;
  }
  logger.error(event, {
    ...metadata,
    error,
    ...(isApplicationError(error) ? { errorCode: error.code, statusCode: error.status } : {}),
  });
}

/** Browser-side reporter used by React error boundaries (`error.tsx`, `global-error.tsx`). */
export function reportClientError(error: Error & { digest?: string }, boundary: string) {
  reportError(getClientLogger("error-boundary"), "ui.render.failed", error, {
    boundary,
    ...(error.digest ? { digest: error.digest } : {}),
  });
}
