import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

export interface AppMetadata {
  name: string;
  version: string;
  revision?: string;
  source?: string;
}

function readPackageFallback(): Pick<AppMetadata, "name" | "version"> {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown; version?: unknown };
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const version = typeof parsed.version === "string" ? parsed.version.trim() : "";
    if (!PACKAGE_NAME_PATTERN.test(name) || !PACKAGE_VERSION_PATTERN.test(version)) {
      return { name: "escalia-webapp", version: "0.0.0" };
    }
    return { name, version };
  } catch {
    return { name: "escalia-webapp", version: "0.0.0" };
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Application identity for health checks, logs and diagnostics.
 * Docker builds inject ESCALIA_APP_* env vars; local `next dev` falls back to package.json.
 */
export function getAppMetadata(): AppMetadata {
  const fallback = readPackageFallback();
  const name = nonEmpty(process.env.ESCALIA_APP_NAME) ?? fallback.name;
  const version = nonEmpty(process.env.ESCALIA_APP_VERSION) ?? fallback.version;
  const revision = nonEmpty(process.env.ESCALIA_APP_REVISION);
  const source = nonEmpty(process.env.ESCALIA_APP_SOURCE);

  return {
    name,
    version,
    ...(revision ? { revision } : {}),
    ...(source ? { source } : {}),
  };
}
