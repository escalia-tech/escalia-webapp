import { defineRouting } from "next-intl/routing";

import { COOKIE_NAMES, ONE_YEAR_SECONDS } from "@/lib/cookies";

export const locales = ["fr-CA", "en-CA"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "fr-CA";

/**
 * Visible URLs omit the locale (/login, /dashboard). Internally, pages stay under app/[locale].
 * Detection order for visitors: session override > preference cookie > next-intl locale cookie >
 * Accept-Language > fr-CA. Legacy /fr-CA/... and /en-CA/... paths are redirected once in src/proxy.ts.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "never",
  alternateLinks: false,
  localeCookie: {
    name: COOKIE_NAMES.locale,
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  },
});

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
