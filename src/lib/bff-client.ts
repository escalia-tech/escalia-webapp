import type { ErrorCode, ErrorResponseBody } from "@/lib/observability/errors/application-error";
import { getClientLogger } from "@/lib/observability/logger/logger.client";
import { CORRELATION_ID_HEADER, generateCorrelationId } from "@/lib/observability/tracing/correlation";

/**
 * Browser-side client for the BFF (`/api/bff/*`). It never talks to a backend directly and never
 * handles tokens: authentication is carried by the HttpOnly session cookie. Each call carries a fresh
 * correlation id so that a failure shown in the UI can be matched with the server log line.
 */

const logger = getClientLogger("bff-client");
const REQUEST_TIMEOUT_MS = 10_000;

export class BffError extends Error {
  readonly code: ErrorCode | "network.unreachable" | "network.timeout";
  readonly status: number;
  readonly correlationId: string;
  readonly retryable: boolean;
  readonly invalidFields: string[];

  constructor(init: {
    code: BffError["code"];
    status: number;
    message: string;
    correlationId: string;
    retryable: boolean;
    invalidFields?: string[];
  }) {
    super(init.message);
    this.name = "BffError";
    this.code = init.code;
    this.status = init.status;
    this.correlationId = init.correlationId;
    this.retryable = init.retryable;
    this.invalidFields = init.invalidFields ?? [];
  }
}

function isErrorBody(value: unknown): value is ErrorResponseBody {
  return typeof value === "object" && value !== null && "error" in value;
}

export async function bffFetch<T>(
  path: `/api/bff/${string}`,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const correlationId = generateCorrelationId();
  const callLogger = logger.child({ correlationId });
  const method = init.method ?? "GET";
  const startedAt = performance.now();
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        [CORRELATION_ID_HEADER]: correlationId,
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error; // caller cancelled (e.g. superseded query): not a failure
    const timedOut = timeoutSignal.aborted;
    callLogger.warn("bff.client.request.degraded", {
      method,
      operation: path.split("?")[0]?.replace(/\/[^/]*\d[^/]*$/, "/[id]"),
      outcome: timedOut ? "timeout" : "unreachable",
      durationMs: Math.round(performance.now() - startedAt),
    });
    throw new BffError({
      code: timedOut ? "network.timeout" : "network.unreachable",
      status: 0,
      message: timedOut ? "The request timed out" : "The network is unreachable",
      correlationId,
      retryable: method === "GET",
    });
  }

  if (response.ok) {
    return (await response.json()) as T;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const detail = isErrorBody(body) ? body.error : undefined;
  const error = new BffError({
    code: detail?.code ?? "internal.unexpected",
    status: response.status,
    message: detail?.message ?? "Unexpected BFF response",
    correlationId: detail?.correlationId ?? response.headers.get(CORRELATION_ID_HEADER) ?? correlationId,
    retryable: detail?.retryable ?? false,
    invalidFields: detail?.invalidFields,
  });
  callLogger.warn("bff.client.request.failed", {
    method,
    statusCode: response.status,
    errorCode: error.code,
    durationMs: Math.round(performance.now() - startedAt),
  });
  throw error;
}
