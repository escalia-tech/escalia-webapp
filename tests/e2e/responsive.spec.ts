import { expect, test } from "@playwright/test";

import {
  APP_ROUTES,
  enterDemo,
  expectNoHorizontalOverflow,
  LOCALES,
  PUBLIC_ROUTES,
  setTheme,
  settle,
  type Theme,
} from "./helpers";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
] as const;
const THEMES: Theme[] = ["light", "dark"];

const SCREENSHOT_DIR = join(process.cwd(), "docs", "development", "screenshots");
const CAPTURE = process.env.CAPTURE_SCREENSHOTS === "true";

/** Which combinations are captured as images (the overflow check covers the whole matrix). */
function shouldCapture(width: number, locale: string, theme: Theme, route: string): boolean {
  if (!CAPTURE) return false;
  const key = ["login", "dashboard", "properties", "properties/demo-cedre", "settings/preferences"].includes(route);
  if (!key) return false;
  if (width === 1440) return locale === "fr-CA";
  if (width === 768) return locale === "fr-CA" && theme === "light";
  if (width === 390) return locale === "fr-CA";
  if (width === 320) return locale === "en-CA" && theme === "light";
  return false;
}

for (const viewport of WIDTHS) {
  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      test.describe(`${viewport.width}px ${locale} ${theme}`, () => {
        test.use({ viewport, locale });

        test("public screens fit the viewport", async ({ page }) => {
          await setTheme(page, theme);
          for (const route of PUBLIC_ROUTES) {
            await page.goto(`/${locale}/${route}`);
            await settle(page);
            await expectNoHorizontalOverflow(page, `${route}`);
            await expect(page.locator("main").first()).toBeVisible();
            if (shouldCapture(viewport.width, locale, theme, route)) {
              mkdirSync(SCREENSHOT_DIR, { recursive: true });
              await page.screenshot({
                path: join(SCREENSHOT_DIR, `${route.replaceAll("/", "_")}-${locale}-${theme}-${viewport.width}.png`),
              });
            }
          }
        });

        test("application screens fit the viewport", async ({ page }) => {
          await setTheme(page, theme);
          await enterDemo(page, locale);
          for (const route of APP_ROUTES) {
            await page.goto(`/${locale}/${route}`);
            await settle(page);
            await expectNoHorizontalOverflow(page, `${route}`);
            await expect(page.locator("main").first()).toBeVisible();
            if (shouldCapture(viewport.width, locale, theme, route)) {
              mkdirSync(SCREENSHOT_DIR, { recursive: true });
              await page.screenshot({
                path: join(SCREENSHOT_DIR, `${route.replaceAll("/", "_")}-${locale}-${theme}-${viewport.width}.png`),
              });
            }
          }
        });
      });
    }
  }
}
