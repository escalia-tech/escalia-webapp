import "server-only";

import pino, { type DestinationStream } from "pino";

import { getServerEnv } from "@/server/config/env";

import { getRequestContext } from "../tracing/request-context";
import { createLoggerCore } from "./logger.core";
import type { Logger, LogLayer, LogLevel } from "./logger.types";

/**
 * Server logger (Node runtime only). JSON lines on stdout with UTC timestamps; a compact pretty
 * writer is used in local development. No remote transport is configured.
 */

export interface ServerLoggerOptions {
  level: LogLevel;
  format: "pretty" | "json";
  service: string;
  environment: string;
  /** Injectable for tests. Defaults to process.stdout. */
  destination?: DestinationStream;
}

const LEVEL_COLORS: Record<string, string> = {
  trace: "\u001b[90m",
  debug: "\u001b[36m",
  info: "\u001b[32m",
  warn: "\u001b[33m",
  error: "\u001b[31m",
  fatal: "\u001b[35m",
};
const RESET = "\u001b[0m";

function createPrettyDestination(): DestinationStream {
  return {
    write(line: string) {
      try {
        const {
          timestamp,
          level,
          message,
          event,
          module,
          layer,
          service: _s,
          environment: _e,
          ...rest
        } = JSON.parse(line);
        const color = LEVEL_COLORS[String(level)] ?? "";
        const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
        process.stdout.write(
          `${String(timestamp).slice(11, 23)} ${color}${String(level).toUpperCase().padEnd(5)}${RESET} ` +
            `[${String(layer)}:${String(module)}] ${String(event)} — ${String(message)}${extras}\n`,
        );
      } catch {
        process.stdout.write(line);
      }
    },
  };
}

export function createServerLogger(options: ServerLoggerOptions, module = "app", layer: LogLayer = "server"): Logger {
  const destination =
    options.destination ??
    (options.format === "pretty" ? createPrettyDestination() : pino.destination({ dest: 1, sync: true }));

  const instance = pino(
    {
      level: "trace", // gating is owned by the logger core
      messageKey: "message",
      base: { service: options.service, environment: options.environment },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: { level: (label) => ({ level: label }) },
    },
    destination,
  );

  return createLoggerCore({
    layer,
    module,
    threshold: options.level,
    resolveContext: () => {
      const context = getRequestContext();
      return context
        ? { correlationId: context.correlationId, traceId: context.trace.traceId, spanId: context.trace.spanId }
        : undefined;
    },
    emit: (level, fields, message) => {
      instance[level](fields, message);
    },
  });
}

let rootLogger: Logger | undefined;

function getRootLogger(): Logger {
  if (!rootLogger) {
    const env = getServerEnv();
    rootLogger = createServerLogger({
      level: env.logLevel,
      format: env.logFormat,
      service: env.serviceName,
      environment: env.appEnv,
    });
  }
  return rootLogger;
}

/** Logger for a module; correlation ids come from the active request context automatically. */
export function getLogger(module: string, layer: LogLayer = "server"): Logger {
  return getRootLogger().child({ module, layer });
}
