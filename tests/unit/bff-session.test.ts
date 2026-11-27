import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "escalia_demo_session=x", get: () => undefined }),
}));

const answer = (status: number) => vi.fn(async () => new Response(JSON.stringify({}), { status }));

describe("hasBffSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is true when the BFF knows the person, false only when it says the session is gone", async () => {
    const { hasBffSession } = await import("@/server/auth/bff-session");
    vi.stubGlobal("fetch", answer(200));
    expect(await hasBffSession("fr-CA")).toBe(true);
    vi.stubGlobal("fetch", answer(401));
    expect(await hasBffSession("fr-CA")).toBe(false);
    vi.stubGlobal("fetch", answer(503));
    expect(await hasBffSession("fr-CA")).toBe(true);
  });

  it("has nothing to check without a BFF", async () => {
    vi.stubEnv("ESCALIA_BFF_URL", "");
    const { hasBffSession } = await import("@/server/auth/bff-session");
    const fetcher = answer(401);
    vi.stubGlobal("fetch", fetcher);
    expect(await hasBffSession("fr-CA")).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
