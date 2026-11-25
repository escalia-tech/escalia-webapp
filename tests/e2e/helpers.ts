import { expect, type Page } from "@playwright/test";

export const LOCALES = ["fr-CA", "en-CA"] as const;
export type Locale = (typeof LOCALES)[number];
export type Theme = "light" | "dark";

/** Opens a demo session through the same BFF endpoint the login screen uses (no credential involved). */
export async function enterDemo(page: Page, locale: Locale = "fr-CA") {
  const origin = `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`;
  const response = await page.request.post("/api/bff/demo/session", {
    data: { locale },
    headers: { origin, "content-type": "application/json" },
  });
  expect(response.ok(), "demo session entry").toBe(true);
}

/** Forces the explicit theme (not "system") before the first paint. */
export async function setTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => localStorage.setItem("escalia-theme", value), theme);
  await page.emulateMedia({ colorScheme: theme });
}

/** Waits for hydration + data so assertions and screenshots are stable. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(overflow.clientWidth);
}

export const APP_ROUTES = [
  "dashboard",
  "properties",
  "properties/demo-cedre",
  "units",
  "settings/profile",
  "settings/preferences",
  "settings/security",
  "settings/privacy",
  "settings/notifications",
  "dev/components",
] as const;

export const PUBLIC_ROUTES = [
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "session-expired",
  "privacy",
  "terms",
  "forbidden",
  "service-unavailable",
] as const;
