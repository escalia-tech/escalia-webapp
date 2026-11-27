import "server-only";

import { z } from "zod";

import { isApplicationError } from "@/lib/observability/errors/application-error";
import { fetchBffPage } from "@/server/bff-pages/client";
import { getServerEnv } from "@/server/config/env";

/**
 * Whether the BFF still knows the person. The webapp's own session can outlive the BFF session (the BFF session
 * expired, or the BFF restarted); then the login page must show the form instead of sending the person back to a
 * page that cannot load. Without a BFF there is nothing to check. Any other failure is not a sign-out: the page the
 * person goes to shows its own error state.
 */
export async function hasBffSession(language: string): Promise<boolean> {
  if (!getServerEnv().bffBaseUrl) return true;
  try {
    await fetchBffPage("auth.shell", "/pages/shell", z.unknown(), { language });
    return true;
  } catch (error) {
    return !(isApplicationError(error) && error.code === "auth.unauthenticated");
  }
}
