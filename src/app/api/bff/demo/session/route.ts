import { cookies } from "next/headers";

import { z } from "zod";

import { defaultLocale, isAppLocale } from "@/i18n/routing";
import { COOKIE_NAMES } from "@/lib/cookies";
import { ApplicationError } from "@/lib/observability/errors/application-error";
import { getLogger } from "@/lib/observability/logger/logger.server";
import { bffHandler, parseJsonBody, publicBffHandler } from "@/server/bff/with-bff";
import { getServerEnv, isDemoModeEnabled } from "@/server/config/env";
import { readPreferencesCookie } from "@/server/preferences/preferences-cookie";
import { DEMO_SESSION_TTL_SECONDS, issueDemoSessionToken } from "@/server/session/demo-session";

const enterSchema = z.object({ locale: z.string().max(10).optional() });

/**
 * Demo session entry. Explicit, separate from the (non-functional) sign-in forms: it collects no
 * credential and exists only when demo mode is enabled in a non-production environment.
 * Production refuses with 404 `demo.disabled`, even if DEMO_MODE_ENABLED=true.
 */
export const POST = publicBffHandler(
  { route: "/api/bff/demo/session", operation: "demo.session.enter", mutation: true },
  async ({ request }) => {
    if (!isDemoModeEnabled()) {
      throw new ApplicationError("demo.disabled", "Demo mode is not available in this environment");
    }
    const { locale: requested } = await parseJsonBody(enterSchema, request);
    const store = await cookies();

    // Entry language: temporary session override > saved preference > language of the page > default.
    const override = store.get(COOKIE_NAMES.localeSession)?.value;
    const saved = readPreferencesCookie(store.get(COOKIE_NAMES.preferences)?.value).locale;
    const locale = [override, saved, requested].find(isAppLocale) ?? defaultLocale;

    store.set(COOKIE_NAMES.demoSession, issueDemoSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: getServerEnv().nodeEnv === "production",
      path: "/",
      maxAge: DEMO_SESSION_TTL_SECONDS,
    });

    getLogger("demo-session", "bff").info("demo.session.started", { locale, demo: true });
    return { data: { redirectTo: `/${locale}/dashboard` } };
  },
);

/** Leaves demo mode: clears the demo session and the temporary language override. */
export const DELETE = bffHandler(
  { route: "/api/bff/demo/session", operation: "demo.session.leave", mutation: true },
  async ({ request }) => {
    const store = await cookies();
    const current = store.get(COOKIE_NAMES.localeSession)?.value;
    const url = new URL(request.url);
    const requested = url.searchParams.get("locale");
    const locale = [current, requested].find(isAppLocale) ?? defaultLocale;

    store.delete(COOKIE_NAMES.demoSession);
    store.delete(COOKIE_NAMES.localeSession);

    getLogger("demo-session", "bff").info("demo.session.ended", { demo: true });
    return { data: { redirectTo: `/${locale}/login` } };
  },
);
