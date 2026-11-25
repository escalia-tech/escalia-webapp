import "server-only";

import { ApplicationError } from "@/lib/observability/errors/application-error";

import { getServerEnv } from "../config/env";

/**
 * Run an upstream call with a hard timeout and cancellation. The operation receives an AbortSignal
 * and must honour it. On timeout the call is aborted and an `upstream.timeout` error is raised
 * (reads are retryable, nothing is retried automatically here). Mutations must never be retried
 * automatically unless idempotent.
 */
export async function withTimeout<T>(
  operationName: string,
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = getServerEnv().upstreamTimeoutMs,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout:${operationName}`)), timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApplicationError("upstream.timeout", `Upstream call exceeded ${timeoutMs}ms`, {
        cause: error,
        retryable: true,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
