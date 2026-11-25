import { describe, expect, it } from "vitest";

import { EnvironmentConfigError, parseServerEnv } from "@/server/config/env-schema";

describe("parseServerEnv", () => {
  it("applies safe local defaults", () => {
    const env = parseServerEnv({ NODE_ENV: "development" });
    expect(env.appEnv).toBe("local");
    expect(env.demoModeEnabled).toBe(false);
    expect(env.clientLoggingEnabled).toBe(false);
    expect(env.otelEnabled).toBe(false);
    expect(env.logFormat).toBe("pretty");
  });

  it("honours demo mode only in local, development and test", () => {
    for (const appEnv of ["local", "development", "test"]) {
      expect(
        parseServerEnv({ NODE_ENV: "development", APP_ENV: appEnv, DEMO_MODE_ENABLED: "true" }).demoModeEnabled,
      ).toBe(true);
    }
    for (const appEnv of ["staging", "production"]) {
      expect(
        parseServerEnv({ NODE_ENV: "production", APP_ENV: appEnv, DEMO_MODE_ENABLED: "true" }).demoModeEnabled,
      ).toBe(false);
    }
  });

  it("fails closed: a production build defaults to production and refuses demo even when enabled", () => {
    const env = parseServerEnv({ NODE_ENV: "production", DEMO_MODE_ENABLED: "true" });
    expect(env.appEnv).toBe("production");
    expect(env.isProduction).toBe(true);
    expect(env.demoModeEnabled).toBe(false);
    expect(env.logFormat).toBe("json");
  });

  it("rejects APP_ENV=local with NODE_ENV=production", () => {
    expect(() => parseServerEnv({ NODE_ENV: "production", APP_ENV: "local" })).toThrow(EnvironmentConfigError);
  });

  it("lists invalid variable names but never their values", () => {
    try {
      parseServerEnv({ NODE_ENV: "development", LOG_LEVEL: "super-secret-value", DEMO_SESSION_SECRET: "short" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentConfigError);
      const config = error as EnvironmentConfigError;
      expect(config.invalidVariables).toEqual(expect.arrayContaining(["LOG_LEVEL", "DEMO_SESSION_SECRET"]));
      expect(config.message).not.toContain("super-secret-value");
      expect(config.message).not.toContain("short");
    }
  });

  it("treats empty strings as unset", () => {
    expect(parseServerEnv({ NODE_ENV: "development", LOG_LEVEL: "", APP_ENV: "" }).appEnv).toBe("local");
  });
});
