import type { AppLocale } from "./routing";

/**
 * Language is independent from region, currency, time zone and tax jurisdiction.
 * "en-CA" does NOT mean Ontario: fiscal rules come from business data (building location), never from locale.
 */
export const LOCALE_META: Record<AppLocale, { short: string; nativeName: string; htmlLang: string }> = {
  "fr-CA": { short: "FR", nativeName: "Français", htmlLang: "fr-CA" },
  "en-CA": { short: "EN", nativeName: "English", htmlLang: "en-CA" },
};

/** Default currency for display formatting (Intl). Extensible; independent from the UI language. */
export const DEFAULT_CURRENCY = "CAD";

/** Message namespaces: one JSON file per domain in messages/{locale}/. Keys must be identical across locales. */
export const MESSAGE_DOMAINS = [
  "common",
  "shell",
  "auth",
  "legal",
  "dashboard",
  "buildings",
  "rules",
  "portfolio",
  "documents",
  "leases",
  "signing",
  "settings",
  "feedback",
  "modules",
  "gallery",
  "assist",
] as const;
export type MessageDomain = (typeof MESSAGE_DOMAINS)[number];
