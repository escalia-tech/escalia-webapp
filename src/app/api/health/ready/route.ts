import { getAppMetadata } from "@/lib/app-metadata";
import { healthJson } from "@/lib/health/health-response";
import { getServerEnv } from "@/server/config/env";

/**
 * Readiness: validated runtime configuration (Twelve-Factor). Fails closed when env is invalid.
 * No external backends are probed — the BFF demo adapter has no upstream contract yet.
 */
export async function GET(): Promise<Response> {
  const metadata = getAppMetadata();
  try {
    getServerEnv();
    return healthJson(metadata, "ok", 200);
  } catch {
    return healthJson(metadata, "unavailable", 503);
  }
}
