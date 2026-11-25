import { DEFAULT_SERVICE_NAME } from "./logger.config";
import { createLoggerCore } from "./logger.core";
import type { Logger, LogLevel } from "./logger.types";

/**
 * Browser logger. Deliberately tiny and free of server dependencies (no Pino, no `server-only`
 * module). Output goes to the browser console only, and only when enabled
 * (NEXT_PUBLIC_CLIENT_LOGGING_ENABLED). Nothing is ever sent to a remote collector: browser logs are
 * untrusted and a collection endpoint has not been specified.
 */

interface ClientLoggerState {
  enabled: boolean;
  level: LogLevel;
  correlationId?: string;
  environment: string;
}

const state: ClientLoggerState = {
  enabled: process.env.NEXT_PUBLIC_CLIENT_LOGGING_ENABLED === "true",
  level: "warn",
  environment: "browser",
};

/** Called once by the application providers with values resolved on the server. */
export function configureClientLogger(config: Partial<ClientLoggerState>): void {
  Object.assign(state, config);
}

type ConsoleMethod = "debug" | "info" | "warn" | "error";
const CONSOLE_METHOD: Record<LogLevel, ConsoleMethod> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
};

export function getClientLogger(module: string): Logger {
  return createLoggerCore({
    layer: "client",
    module,
    threshold: () => (state.enabled ? state.level : "fatal"),
    resolveContext: () => ({ correlationId: state.correlationId }),
    emit: (level, fields, message) => {
      if (!state.enabled) return;
      // biome-ignore lint/suspicious/noConsole: single sanctioned console sink of the browser logger
      console[CONSOLE_METHOD[level]](
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          service: DEFAULT_SERVICE_NAME,
          environment: state.environment,
          message,
          ...fields,
        }),
      );
    },
  });
}
