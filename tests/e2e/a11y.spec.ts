import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { APP_ROUTES, enterDemo, LOCALES, PUBLIC_ROUTES, setTheme, settle, type Theme } from "./helpers";

const THEMES: Theme[] = ["light", "dark"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

type Findings = Record<string, unknown[]>;

/** Runs axe on the current page and records every violation under the route label. */
async function audit(page: import("@playwright/test").Page, label: string, findings: Findings) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  if (results.violations.length > 0) {
    findings[label] = results.violations.map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
    }));
  }
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    test.describe(`axe ${locale} ${theme}`, () => {
      test.use({ locale });

      for (const route of PUBLIC_ROUTES) {
        test(`public: ${route}`, async ({ page }) => {
          const findings: Findings = {};
          await setTheme(page, theme);
          await page.goto(`/${locale}/${route}`);
          await settle(page);
          await audit(page, route, findings);
          expect(findings, "axe violations").toEqual({});
        });
      }

      for (const route of APP_ROUTES) {
        test(`app: ${route}`, async ({ page }) => {
          const findings: Findings = {};
          await setTheme(page, theme);
          await enterDemo(page, locale);
          await page.goto(`/${locale}/${route}`);
          await settle(page);
          await audit(page, route, findings);
          expect(findings, "axe violations").toEqual({});
        });
      }
    });
  }
}
