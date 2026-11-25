import "server-only";

import { getAppMetadata } from "@/lib/app-metadata";
import { getServerEnv } from "@/server/config/env";

import { reportError } from "./errors/error-reporter";
import { getLogger } from "./logger/logger.server";

/** Logged once per server instance by `instrumentation.ts`. */
export function logServerStartup(): void {
  const env = getServerEnv();
  const app = getAppMetadata();
  getLogger("instrumentation").info("app.server.started", {
    environment: env.appEnv,
    nodeEnv: env.nodeEnv,
    runtime: "nodejs",
    appName: app.name,
    appVersion: app.version,
    ...(app.revision ? { appRevision: app.revision } : {}),
    logLevel: env.logLevel,
    logFormat: env.logFormat,
    otelEnabled: env.otelEnabled,
    demo: env.demoModeEnabled,
  });
  if (env.otelEnabled) {
    getLogger("instrumentation").warn(
      "telemetry.export.unconfigured",
      { reason: "no approved destination" },
      "OTEL_ENABLED is true but no exporter is configured; nothing is exported",
    );
  }
}

/** Unhandled server render/route errors surfaced by Next.js `onRequestError`. */
export function logUnhandledRequestError(
  error: unknown,
  request: { method: string },
  context: { routePath: string; routeType: string },
): void {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : undefined;
  reportError(getLogger("next-request"), "app.request.failed", error, {
    method: request.method,
    route: context.routePath,
    operation: context.routeType,
    ...(digest ? { digest } : {}),
  });
}
