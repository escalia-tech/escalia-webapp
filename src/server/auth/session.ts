import "server-only";

import { cookies } from "next/headers";

import { COOKIE_NAMES } from "@/lib/cookies";
import { ApplicationError } from "@/lib/observability/errors/application-error";

import { getServerEnv, isDemoModeEnabled } from "../config/env";
import { verifyDemoSessionToken } from "../session/demo-session";
import { devSignInAvailable } from "./dev-sign-in-core";

/**
 * Authentication seam. No identity provider (IdP) has been selected, so the only session that can
 * exist is the explicit DEMO session (local / development / test with the demo flag). Everything
 * else fails closed. When an IdP is integrated, replace the body of `getSession` with the opaque
 * server-side session lookup; callers and the BFF wrapper do not change.
 */

export interface Session {
  kind: "demo";
  /** Short non-identifying id, safe for diagnostics. */
  id: string;
  /** Fictional display data (clearly a demo user). */
  user: { displayName: string; initials: string; email: string };
}

export interface AuthProviderStatus {
  /** A real identity provider is configured. Always false until an IdP is selected. */
  providerConfigured: boolean;
  /** The explicit demo entry is available (non-production + flag). */
  demoAvailable: boolean;
  /** One-click local sign-in as a fixture user (BFF dev mode, local environments only). */
  devSignInAvailable: boolean;
}

export function getAuthProviderStatus(): AuthProviderStatus {
  return {
    providerConfigured: false,
    demoAvailable: isDemoModeEnabled(),
    devSignInAvailable: devSignInAvailable(getServerEnv()),
  };
}

export async function getSession(): Promise<Session | null> {
  if (!isDemoModeEnabled()) return null;
  const store = await cookies();
  const verified = verifyDemoSessionToken(store.get(COOKIE_NAMES.demoSession)?.value);
  if (!verified) return null;
  return {
    kind: "demo",
    id: verified.id,
    user: { displayName: "Camille Démo", initials: "CD", email: "camille.demo@example.invalid" },
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new ApplicationError("auth.unauthenticated", "Authentication is required");
  }
  return session;
}
