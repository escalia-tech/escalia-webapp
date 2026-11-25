import { cookies } from "next/headers";

import { COOKIE_NAMES, ONE_YEAR_SECONDS } from "@/lib/cookies";
import { getLogger } from "@/lib/observability/logger/logger.server";
import { bffHandler, parseJsonBody } from "@/server/bff/with-bff";
import { getServerEnv } from "@/server/config/env";
import {
  preferencesSchema,
  readPreferencesCookie,
  serializePreferences,
} from "@/server/preferences/preferences-cookie";

/**
 * User preferences (language, time zone). DEMO ADAPTER: persisted in an HttpOnly cookie because no
 * backend profile contract exists yet. The response states its `source` so the UI can say so.
 */
export const GET = bffHandler({ route: "/api/bff/preferences", operation: "preferences.read" }, async () => {
  const store = await cookies();
  return {
    data: { preferences: readPreferencesCookie(store.get(COOKIE_NAMES.preferences)?.value), source: "demo-adapter" },
  };
});

export const PUT = bffHandler(
  { route: "/api/bff/preferences", operation: "preferences.update", mutation: true },
  async ({ request }) => {
    const preferences = await parseJsonBody(preferencesSchema, request);
    const store = await cookies();

    store.set(COOKIE_NAMES.preferences, serializePreferences(preferences), {
      httpOnly: true,
      sameSite: "lax",
      secure: getServerEnv().nodeEnv === "production",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    });
    // An explicit save in Settings replaces the temporary header override.
    store.delete(COOKIE_NAMES.localeSession);

    getLogger("preferences", "bff").info("preferences.update.completed", { demo: true });
    return { data: { preferences, source: "demo-adapter" } };
  },
);
