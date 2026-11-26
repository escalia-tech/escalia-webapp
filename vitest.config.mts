import { defineConfig } from "vitest/config";

import { fileURLToPath } from "node:url";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` throws outside the Next.js server bundler; tests run in plain Node.
      "server-only": fromRoot("./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.mjs",
      "tests/integration/**/*.test.ts",
    ],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      // Logic files. UI components (.tsx) and framework entry points are covered by Playwright
      // (tests/e2e here, journeys in escalia-e2e). Each exclusion needs a reason.
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts", // types only
        "src/instrumentation.ts", // Next.js hook, runs only inside the Next server
        "src/instrumentation-client.ts", // Next.js hook, runs only in the browser bundle
      ],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: "reports/coverage",
      // Ratchet: these floors only go up, never down (escalia-tech/.github standards/testing.md).
      // Target 100 %. A file you add or change must reach 100 % line and branch coverage.
      thresholds: { lines: 68, branches: 66, functions: 73, statements: 68 },
    },
  },
});
