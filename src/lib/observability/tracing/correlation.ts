/**
 * Correlation and W3C trace-context helpers. Isomorphic and dependency free.
 *
 * Rules (see docs/architecture/OBSERVABILITY.md):
 * - the server generates its own IDs; inbound IDs are accepted only when well formed;
 * - an ID is a diagnostic label, NEVER an authorisation input;
 * - `traceparent` is propagated per the W3C standard.
 */

export const CORRELATION_ID_HEADER = "x-correlation-id";
export const TRACEPARENT_HEADER = "traceparent";

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/;
const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ZERO_TRACE_ID = "0".repeat(32);
const ZERO_SPAN_ID = "0".repeat(16);

export interface TraceContext {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

export function isValidCorrelationId(value: string | null | undefined): value is string {
  return typeof value === "string" && CORRELATION_ID_PATTERN.test(value);
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/** Return the inbound ID when well formed, otherwise a freshly generated one. */
export function resolveCorrelationId(inbound: string | null | undefined): string {
  return isValidCorrelationId(inbound) ? inbound : generateCorrelationId();
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateTraceId(): string {
  return randomHex(16);
}

export function generateSpanId(): string {
  return randomHex(8);
}

/** Parse a `traceparent` header. Returns undefined for anything that is not a valid v00 header. */
export function parseTraceparent(header: string | null | undefined): TraceContext | undefined {
  if (!header) return undefined;
  const match = TRACEPARENT_PATTERN.exec(header.trim().toLowerCase());
  if (!match) return undefined;
  const [, traceId, spanId, flags] = match;
  if (!traceId || !spanId || traceId === ZERO_TRACE_ID || spanId === ZERO_SPAN_ID) return undefined;
  return { traceId, spanId, sampled: (Number.parseInt(flags ?? "00", 16) & 1) === 1 };
}

export function formatTraceparent(context: TraceContext): string {
  return `00-${context.traceId}-${context.spanId}-${context.sampled ? "01" : "00"}`;
}

/**
 * Continue an inbound trace (new span id, same trace id) or start a new one.
 * The inbound span id is never reused as our own span id.
 */
export function resolveTraceContext(inboundTraceparent: string | null | undefined): TraceContext {
  const inbound = parseTraceparent(inboundTraceparent);
  return {
    traceId: inbound?.traceId ?? generateTraceId(),
    spanId: generateSpanId(),
    sampled: inbound?.sampled ?? false,
  };
}
