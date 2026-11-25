import "server-only";

import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
  resolveTraceContext,
  TRACEPARENT_HEADER,
  type TraceContext,
} from "./correlation";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request context carried through AsyncLocalStorage. There is no global mutable state:
 * concurrent requests each see their own correlation id.
 */
export interface RequestContext {
  correlationId: string;
  trace: TraceContext;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(headers: Pick<Headers, "get">): RequestContext {
  return {
    correlationId: resolveCorrelationId(headers.get(CORRELATION_ID_HEADER)),
    trace: resolveTraceContext(headers.get(TRACEPARENT_HEADER)),
    startedAt: performance.now(),
  };
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Monotonic duration since the request started, in whole milliseconds. */
export function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
