import { shouldLog } from "./logger.config";
import type { Logger, LoggerBindings, LogLayer, LogLevel, LogMetadata } from "./logger.types";
import { sanitizeMetadata } from "./redaction";

/**
 * Isomorphic logger core shared by the server (Pino sink) and browser (console sink) loggers.
 * It owns the invariants: level gating, allowlist + redaction, stable event naming and the guarantee
 * that a failing sink can never break the calling operation.
 */

export interface ContextIds {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
}

export interface LoggerCoreOptions {
  layer: LogLayer;
  module: string;
  /** Minimum level to emit. A function lets the threshold be reconfigured at runtime. */
  threshold: LogLevel | (() => LogLevel);
  /** Receives the already sanitised fields and the stable English message. */
  emit: (level: LogLevel, fields: Record<string, unknown>, message: string) => void;
  /** Ambient context (e.g. AsyncLocalStorage on the server). Explicit bindings win. */
  resolveContext?: () => ContextIds | undefined;
  bindings?: LoggerBindings;
}

/** `buildings.list.completed` -> `buildings list completed` (stable, English). */
export function humanizeEvent(event: string): string {
  return event.replace(/[._-]+/g, " ").trim();
}

const EVENT_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*){1,4}$/;

export function createLoggerCore(options: LoggerCoreOptions): Logger {
  const bindings = options.bindings ?? {};

  function write(level: LogLevel, event: string, metadata?: LogMetadata, message?: string): void {
    try {
      const threshold = typeof options.threshold === "function" ? options.threshold() : options.threshold;
      if (!shouldLog(level, threshold)) return;

      const ambient = options.resolveContext?.() ?? {};
      const { metadata: safeMetadata, droppedFieldCount } = sanitizeMetadata(metadata);

      const fields: Record<string, unknown> = {
        layer: bindings.layer ?? options.layer,
        module: bindings.module ?? options.module,
        event: EVENT_PATTERN.test(event) ? event : "logger.event.invalid",
        correlationId: bindings.correlationId ?? ambient.correlationId,
        traceId: bindings.traceId ?? ambient.traceId,
        spanId: bindings.spanId ?? ambient.spanId,
        ...safeMetadata,
      };
      if (droppedFieldCount > 0) fields.droppedFieldCount = droppedFieldCount;
      for (const key of Object.keys(fields)) {
        if (fields[key] === undefined) delete fields[key];
      }

      options.emit(level, fields, message ?? humanizeEvent(event));
    } catch {
      // A logging failure must never alter or block the business operation.
    }
  }

  return {
    trace: (event, metadata, message) => write("trace", event, metadata, message),
    debug: (event, metadata, message) => write("debug", event, metadata, message),
    info: (event, metadata, message) => write("info", event, metadata, message),
    warn: (event, metadata, message) => write("warn", event, metadata, message),
    error: (event, metadata, message) => write("error", event, metadata, message),
    fatal: (event, metadata, message) => write("fatal", event, metadata, message),
    child: (extra) => createLoggerCore({ ...options, bindings: { ...bindings, ...extra } }),
  };
}
