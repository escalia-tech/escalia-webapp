import { context, SpanStatusCode, trace } from "@opentelemetry/api";

/**
 * Tracing foundation built on `@opentelemetry/api` only. No SDK, no exporter and no network call is
 * configured here: without a registered tracer provider every call below is a no-op, which keeps
 * remote export OFF until a destination is approved (OTEL_ENABLED=false by default).
 */

const TRACER_NAME = "escalia-webapp";

export interface ActiveSpanIds {
  traceId: string;
  spanId: string;
}

/** Ids of the active OpenTelemetry span, when a provider (e.g. Next.js built-in spans) created one. */
export function getActiveSpanIds(): ActiveSpanIds | undefined {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();
  if (!spanContext || !trace.isSpanContextValid(spanContext)) return undefined;
  return { traceId: spanContext.traceId, spanId: spanContext.spanId };
}

/** Run `callback` inside a span named `domain.operation`; records failures without leaking messages. */
export async function withSpan<T>(name: string, callback: () => Promise<T>): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await callback();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.name : "Error" });
      throw error;
    } finally {
      span.end();
    }
  });
}
