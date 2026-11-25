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
  },
});
