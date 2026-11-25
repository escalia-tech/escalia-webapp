import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("demo session token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("DEMO_MODE_ENABLED", "true");
    vi.stubEnv("DEMO_SESSION_SECRET", "x".repeat(40));
  });
  afterEach(() => vi.unstubAllEnvs());

  async function load() {
    return import("@/server/session/demo-session");
  }

  it("verifies a freshly issued token", async () => {
    const { issueDemoSessionToken, verifyDemoSessionToken } = await load();
    expect(verifyDemoSessionToken(issueDemoSessionToken())?.id).toHaveLength(8);
  });

  it("rejects missing, malformed, tampered and expired tokens", async () => {
    const { issueDemoSessionToken, verifyDemoSessionToken, DEMO_SESSION_TTL_SECONDS } = await load();
    const now = Date.now();
    const token = issueDemoSessionToken(now);
    expect(verifyDemoSessionToken(undefined)).toBeNull();
    expect(verifyDemoSessionToken("garbage")).toBeNull();
    expect(verifyDemoSessionToken(`${token.slice(0, -2)}xx`)).toBeNull();
    const [version, , nonce, signature] = token.split(".");
    expect(verifyDemoSessionToken(`${version}.9999999999.${nonce}.${signature}`)).toBeNull();
    expect(verifyDemoSessionToken(token, now + (DEMO_SESSION_TTL_SECONDS + 5) * 1000)).toBeNull();
  });

  it("uses a stable Vercel project secret when DEMO_SESSION_SECRET is unset", async () => {
    vi.stubEnv("DEMO_SESSION_SECRET", "");
    vi.stubEnv("VERCEL_PROJECT_ID", "prj_test_escalia");
    const first = await load();
    const token = first.issueDemoSessionToken();
    vi.resetModules();
    vi.stubEnv("DEMO_SESSION_SECRET", "");
    vi.stubEnv("VERCEL_PROJECT_ID", "prj_test_escalia");
    const second = await load();
    expect(second.verifyDemoSessionToken(token)?.id).toHaveLength(8);
  });

  it("rejects a token signed with another secret", async () => {
    const first = await load();
    const token = first.issueDemoSessionToken();
    vi.resetModules();
    vi.stubEnv("DEMO_SESSION_SECRET", "y".repeat(40));
    const second = await load();
    expect(second.verifyDemoSessionToken(token)).toBeNull();
  });
});
