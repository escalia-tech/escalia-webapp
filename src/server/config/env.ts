import "server-only";

import { parseServerEnv, type ServerEnv } from "./env-schema";

export type { ServerEnv } from "./env-schema";

let cached: ServerEnv | undefined;

/**
 * Validated server environment, parsed once per process.
 * A misconfigured deployment fails fast with the invalid variable NAMES (never their values).
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** Demo fixtures, demo session and gallery: only when explicitly enabled in a non-production environment. */
export function isDemoModeEnabled(): boolean {
  return getServerEnv().demoModeEnabled;
}
