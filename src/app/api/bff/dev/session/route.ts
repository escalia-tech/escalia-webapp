import { cookies } from "next/headers";

import { z } from "zod";

import { COOKIE_NAMES } from "@/lib/cookies";
import { ApplicationError } from "@/lib/observability/errors/application-error";
import { safeReturnTo } from "@/lib/return-to";
import { DEV_USERS, devSignInAvailable, signInDevUser } from "@/server/auth/dev-sign-in-core";
import { parseJsonBody, publicBffHandler } from "@/server/bff/with-bff";
import { getServerEnv } from "@/server/config/env";
import { DEMO_SESSION_TTL_SECONDS, issueDemoSessionToken } from "@/server/session/demo-session";

const enterSchema = z.object({ user: z.enum(DEV_USERS), returnTo: z.string().max(500).optional() });

/** Local sign-in as a fixture user (BFF dev mode). Refused unless the BFF is configured and the environment is local. */
export const POST = publicBffHandler(
  { route: "/api/bff/dev/session", operation: "dev.session.enter", mutation: true },
  async ({ request }) => {
    const env = getServerEnv();
    if (!devSignInAvailable(env) || !env.bffBaseUrl) {
      throw new ApplicationError("demo.disabled", "Local sign-in is not available in this environment");
    }
    const { user, returnTo } = await parseJsonBody(enterSchema, request);
    const bffCookies = await signInDevUser({
      baseUrl: env.bffBaseUrl,
      user,
      signal: AbortSignal.timeout(env.upstreamTimeoutMs),
    });
    const store = await cookies();
    for (const { name, value } of bffCookies) {
      store.set(name, value, { httpOnly: name !== "XSRF-TOKEN", sameSite: "lax", path: "/" });
    }
    store.set(COOKIE_NAMES.demoSession, issueDemoSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: DEMO_SESSION_TTL_SECONDS,
    });
    return { data: { redirectTo: safeReturnTo(returnTo, "/dashboard") } };
  },
);
