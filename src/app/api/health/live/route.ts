import { getAppMetadata } from "@/lib/app-metadata";
import { healthJson } from "@/lib/health/health-response";

/**
 * Liveness: the Node process can serve HTTP. No dependency or configuration checks.
 * Locale-independent; excluded from next-intl proxy (`matcher` skips `/api`).
 */
export async function GET(): Promise<Response> {
  return healthJson(getAppMetadata(), "ok", 200);
}
