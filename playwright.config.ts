import { defineConfig } from "@playwright/test";

/**
 * End-to-end and accessibility tests run against the PRODUCTION build served locally
 * (`npm run build` first). APP_ENV=test lets a production build run on a workstation with the demo
 * adapter enabled; real production (APP_ENV=production) refuses demo mode.
 *
 * Browser: the locally installed Google Chrome (`channel: "chrome"`) so no browser download is
 * required. Override with PW_CHANNEL=chromium after `npx playwright install chromium`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;
const channel = process.env.PW_CHANNEL === "chromium" ? undefined : (process.env.PW_CHANNEL ?? "chrome");

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    channel,
    trace: "retain-on-failure",
    locale: "fr-CA",
    timezoneId: "America/Toronto",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: "e2e", testMatch: /(smoke|responsive)\.spec\.ts/ },
    { name: "a11y", testMatch: /a11y\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -H 127.0.0.1 -p ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      APP_ENV: "test",
      DEMO_MODE_ENABLED: "true",
      DEMO_SESSION_SECRET: "e2e-demo-session-secret-0123456789abcdef",
      LOG_LEVEL: "warn",
      LOG_FORMAT: "json",
    },
  },
});
