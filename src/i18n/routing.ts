import { defineRouting } from "next-intl/routing";

import { COOKIE_NAMES, ONE_YEAR_SECONDS } from "@/lib/cookies";

export const locales = ["fr-CA", "en-CA"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "fr-CA";

/**
 * URLs are always prefixed (/fr-CA/..., /en-CA/...). The BFF lives under /api/bff and is not localised.
 * Detection order for visitors: locale cookie > Accept-Language > fr-CA.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: {
    name: COOKIE_NAMES.locale,
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  },
});

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
