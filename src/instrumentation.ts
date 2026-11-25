import type { Instrumentation } from "next";

/**
 * Server instrumentation. Node runtime only; no remote exporter is registered (OTEL_ENABLED=false
 * by default). Next.js emits its own OpenTelemetry spans when a tracer provider is registered later.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logServerStartup } = await import("./lib/observability/startup.server");
    logServerStartup();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logUnhandledRequestError } = await import("./lib/observability/startup.server");
    logUnhandledRequestError(error, request, context);
  }
};
