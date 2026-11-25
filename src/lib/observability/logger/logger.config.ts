import { LOG_LEVEL_ORDER, type LogLevel } from "./logger.types";

export const DEFAULT_SERVICE_NAME = "escalia-webapp";

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (LOG_LEVEL_ORDER as readonly string[]).includes(value);
}

export function levelValue(level: LogLevel): number {
  return LOG_LEVEL_ORDER.indexOf(level);
}

/** True when `level` should be emitted for the configured `threshold`. */
export function shouldLog(level: LogLevel, threshold: LogLevel): boolean {
  return levelValue(level) >= levelValue(threshold);
}

/**
 * Metadata allowlist. A key that is not listed here is DROPPED before emission, so new fields
 * must be added consciously (and reviewed for privacy) rather than leaking by accident.
 */
export const ALLOWED_METADATA_KEYS: ReadonlySet<string> = new Set([
  // timing and result
  "durationMs",
  "resultCount",
  "totalCount",
  "page",
  "pageSize",
  "attempt",
  "timeoutMs",
  "sampleRate",
  // request shape (templated routes only, never raw URLs with identifiers)
  "method",
  "route",
  "statusCode",
  "operation",
  "outcome",
  "reason",
  "upstream",
  "locale",
  "theme",
  "demo",
  // errors (normalised)
  "errorCode",
  "errorName",
  "errorMessage",
  "stack",
  "digest",
  "boundary",
  "component",
  // environment and lifecycle
  "environment",
  "nodeEnv",
  "runtime",
  "otelEnabled",
  "logLevel",
  "logFormat",
  "version",
  // browser metrics
  "metric",
  "value",
  "rating",
  "navigationType",
  "online",
  // validation summary: field NAMES only, never values
  "invalidFields",
  "droppedFieldCount",
]);

export const REDACTED = "[REDACTED]";
export const MAX_STRING_LENGTH = 500;
export const MAX_STACK_LINES = 12;
export const MAX_DEPTH = 4;
export const MAX_ARRAY_ITEMS = 20;
