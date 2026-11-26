// @ts-check
/**
 * Mutation tests (Stryker) on the logic covered by Vitest. Same scope as the coverage gate in
 * vitest.config.mts. `break` is a ratchet: it only goes up (escalia-tech/.github standards/testing.md).
 * Run on one feature: npm run test:mutation -- --mutate "src/features/<feature>/**\/*.ts"
 * @type {import("@stryker-mutator/api/core").PartialStrykerOptions}
 */
export default {
  packageManager: "npm",
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.mts" },
  mutate: ["src/**/*.ts", "!src/**/*.d.ts", "!src/instrumentation.ts", "!src/instrumentation-client.ts"],
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  coverageAnalysis: "perTest",
  incremental: true,
  incrementalFile: "reports/mutation/stryker-incremental.json",
  thresholds: { high: 100, low: 95, break: 36 },
};
