import { describe, expect, it } from "vitest";

import { EnvironmentConfigError, parseServerEnv } from "@/server/config/env-schema";

describe("parseServerEnv", () => {
  it("applies safe local defaults", () => {
    const env = parseServerEnv({ NODE_ENV: "development" });
    expect(env.appEnv).toBe("local");
    expect(env.demoModeEnabled).toBe(true);
    expect(env.clientLoggingEnabled).toBe(false);
    expect(env.otelEnabled).toBe(false);
    expect(env.logFormat).toBe("pretty");
  });

  it("enables demo by default outside real production", () => {
    for (const appEnv of ["development", "test", "staging"] as const) {
      const nodeEnv = appEnv === "development" ? "development" : "production";
      expect(parseServerEnv({ NODE_ENV: nodeEnv, APP_ENV: appEnv }).demoModeEnabled).toBe(true);
    }
    expect(parseServerEnv({ NODE_ENV: "development" }).demoModeEnabled).toBe(true);
  });

  it("keeps demo on Vercel for every deployment tier", () => {
    for (const vercelEnv of ["preview", "production", "development"] as const) {
      expect(
        parseServerEnv({ NODE_ENV: "production", APP_ENV: "production", VERCEL: "1", VERCEL_ENV: vercelEnv })
          .demoModeEnabled,
      ).toBe(true);
    }
  });

  it("fails closed on self-hosted APP_ENV=production only", () => {
    expect(parseServerEnv({ NODE_ENV: "production", APP_ENV: "production" }).demoModeEnabled).toBe(false);
    expect(
      parseServerEnv({ NODE_ENV: "production", APP_ENV: "production", DEMO_MODE_ENABLED: "true" }).demoModeEnabled,
    ).toBe(false);
  });

  it("allows opting out with DEMO_MODE_ENABLED=false", () => {
    expect(parseServerEnv({ NODE_ENV: "development", DEMO_MODE_ENABLED: "false" }).demoModeEnabled).toBe(false);
  });

  it("production build defaults app env to production", () => {
    const env = parseServerEnv({ NODE_ENV: "production" });
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

  it("reads the BFF base URL when it is a URL, and leaves it out when blank", () => {
    expect(parseServerEnv({ BFF_BASE_URL: "http://localhost:8081" }).bffBaseUrl).toBe("http://localhost:8081");
    expect(parseServerEnv({ BFF_BASE_URL: " " }).bffBaseUrl).toBeUndefined();
    expect(() => parseServerEnv({ BFF_BASE_URL: "not a url" })).toThrow(/BFF_BASE_URL/);
  });
});
