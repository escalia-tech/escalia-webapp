/**
 * Single source of truth for cookie and browser-storage names. The inventory (purpose, duration,
 * attributes) is documented in docs/development/COOKIES_AND_STORAGE.md and rendered in
 * Settings > Privacy. No analytics, advertising or tracking cookie exists.
 */

export const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const COOKIE_NAMES = {
  /** next-intl locale cookie: last language explicitly chosen by the visitor. */
  locale: "escalia_locale",
  /** Session cookie (no Max-Age): temporary language override chosen from the header switcher. */
  localeSession: "escalia_locale_session",
  /** Sidebar open/collapsed state (non sensitive UI preference). */
  sidebar: "escalia_sidebar",
  /** Demo adapter of the preferences endpoint (language, timezone). HttpOnly, set by the BFF only. */
  preferences: "escalia_prefs",
  /** Demo session (HMAC signed, HttpOnly). Exists only when demo mode is enabled (never in production). */
  demoSession: "escalia_demo_session",
} as const;

export const STORAGE_KEYS = {
  /** next-themes: light | dark | system (localStorage, no expiry, non sensitive). */
  theme: "escalia-theme",
} as const;

export interface CookieInventoryItem {
  name: string;
  storage: "cookie" | "localStorage" | "sessionStorage";
  purposeKey: "locale" | "localeSession" | "sidebar" | "preferences" | "demoSession" | "theme";
  duration: "session" | "1y" | "8h" | "persistent";
  httpOnly: boolean;
  necessary: boolean;
}

export const COOKIE_INVENTORY: readonly CookieInventoryItem[] = [
  {
    name: COOKIE_NAMES.locale,
    storage: "cookie",
    purposeKey: "locale",
    duration: "1y",
    httpOnly: false,
    necessary: true,
  },
  {
    name: COOKIE_NAMES.localeSession,
    storage: "cookie",
    purposeKey: "localeSession",
    duration: "session",
    httpOnly: false,
    necessary: true,
  },
  {
    name: COOKIE_NAMES.sidebar,
    storage: "cookie",
    purposeKey: "sidebar",
    duration: "1y",
    httpOnly: false,
    necessary: true,
  },
  {
    name: COOKIE_NAMES.preferences,
    storage: "cookie",
    purposeKey: "preferences",
    duration: "1y",
    httpOnly: true,
    necessary: true,
  },
  {
    name: COOKIE_NAMES.demoSession,
    storage: "cookie",
    purposeKey: "demoSession",
    duration: "8h",
    httpOnly: true,
    necessary: true,
  },
  {
    name: STORAGE_KEYS.theme,
    storage: "localStorage",
    purposeKey: "theme",
    duration: "persistent",
    httpOnly: false,
    necessary: true,
  },
];
