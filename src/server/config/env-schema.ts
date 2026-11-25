import { z } from "zod";

/**
 * Pure environment schema (no `server-only` import) so it can be unit-tested.
 * Runtime access goes through `getServerEnv()` in `env.ts`.
 */

export const APP_ENVIRONMENTS = ["local", "development", "test", "staging", "production"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/** Environments in which demo fixtures, the demo session and the component gallery may run. */
export const DEMO_ALLOWED_ENVIRONMENTS: readonly AppEnvironment[] = ["local", "development", "test"];

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const booleanFlag = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ENV: z.preprocess(emptyToUndefined, z.enum(APP_ENVIRONMENTS).optional()),
  APP_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  DEMO_MODE_ENABLED: booleanFlag,
  DEMO_SESSION_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  LOG_LEVEL: z.preprocess(emptyToUndefined, z.enum(LOG_LEVELS).optional()),
  LOG_FORMAT: z.preprocess(emptyToUndefined, z.enum(["pretty", "json"]).optional()),
  CLIENT_LOG_LEVEL: z.preprocess(emptyToUndefined, z.enum(LOG_LEVELS).default("warn")),
  NEXT_PUBLIC_CLIENT_LOGGING_ENABLED: booleanFlag,
  OTEL_ENABLED: booleanFlag,
  OTEL_SERVICE_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default("escalia-webapp")),
  BFF_UPSTREAM_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(100).max(60_000).default(5000)),
});

export interface ServerEnv {
  nodeEnv: "development" | "production" | "test";
  appEnv: AppEnvironment;
  isProduction: boolean;
  appUrl: string;
  /** True only when the flag is set AND the environment is allowed to run demo features. */
  demoModeEnabled: boolean;
  demoSessionSecret: string | undefined;
  logLevel: LogLevel;
  logFormat: "pretty" | "json";
  clientLogLevel: LogLevel;
  clientLoggingEnabled: boolean;
  otelEnabled: boolean;
  serviceName: string;
  upstreamTimeoutMs: number;
}

export class EnvironmentConfigError extends Error {
  readonly invalidVariables: string[];
  constructor(invalidVariables: string[], message: string) {
    super(message);
    this.name = "EnvironmentConfigError";
    this.invalidVariables = invalidVariables;
  }
}

/**
 * Parse and validate environment variables. Error messages list variable NAMES only, never values.
 * Production fails closed: demo mode is ignored there even when DEMO_MODE_ENABLED=true.
 */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "unknown")))];
    throw new EnvironmentConfigError(names, `Invalid environment configuration: ${names.join(", ")}`);
  }

  const data = parsed.data;
  const appEnv: AppEnvironment = data.APP_ENV ?? (data.NODE_ENV === "production" ? "production" : "local");

  if (data.NODE_ENV === "production" && (appEnv === "local" || appEnv === "development")) {
    throw new EnvironmentConfigError(
      ["APP_ENV"],
      "Invalid environment configuration: APP_ENV=local|development is not allowed with NODE_ENV=production " +
        "(use APP_ENV=test to run a production build locally)",
    );
  }

  const isProduction = appEnv === "production";
  const isLocal = appEnv === "local";

  return {
    nodeEnv: data.NODE_ENV,
    appEnv,
    isProduction,
    appUrl: data.APP_URL,
    demoModeEnabled: data.DEMO_MODE_ENABLED && DEMO_ALLOWED_ENVIRONMENTS.includes(appEnv),
    demoSessionSecret: data.DEMO_SESSION_SECRET,
    logLevel: data.LOG_LEVEL ?? (isLocal ? "debug" : "info"),
    logFormat: data.LOG_FORMAT ?? (isLocal ? "pretty" : "json"),
    clientLogLevel: data.CLIENT_LOG_LEVEL,
    clientLoggingEnabled: data.NEXT_PUBLIC_CLIENT_LOGGING_ENABLED,
    otelEnabled: data.OTEL_ENABLED,
    serviceName: data.OTEL_SERVICE_NAME,
    upstreamTimeoutMs: data.BFF_UPSTREAM_TIMEOUT_MS,
  };
}
