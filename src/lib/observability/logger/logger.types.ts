export const LOG_LEVEL_ORDER = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVEL_ORDER)[number];

/** Where the event originates. Keep this list small and stable. */
export type LogLayer = "server" | "bff" | "client" | "proxy";

/**
 * Metadata accepted by the loggers. Only allowlisted keys survive (see `logger.config.ts`);
 * everything is redacted before emission. Never pass request/response bodies.
 */
export type LogMetadata = Record<string, unknown>;

/** Shape of a structured log line (JSON, UTC timestamps, English stable messages). */
export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  layer: LogLayer;
  module: string;
  /** Stable `domain.operation.outcome` name, e.g. `buildings.list.completed`. */
  event: string;
  message: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  durationMs?: number;
  statusCode?: number;
  errorCode?: string;
  [key: string]: unknown;
}

export interface Logger {
  trace(event: string, metadata?: LogMetadata, message?: string): void;
  debug(event: string, metadata?: LogMetadata, message?: string): void;
  info(event: string, metadata?: LogMetadata, message?: string): void;
  warn(event: string, metadata?: LogMetadata, message?: string): void;
  error(event: string, metadata?: LogMetadata, message?: string): void;
  fatal(event: string, metadata?: LogMetadata, message?: string): void;
  /** Derive a logger with extra bindings (module, layer, correlationId...). */
  child(bindings: LoggerBindings): Logger;
}

export interface LoggerBindings {
  module?: string;
  layer?: LogLayer;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
}
