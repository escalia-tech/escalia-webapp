import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "ESCALIA_SESSION=abc" }),
}));

const load = async () => (await import("@/features/rules/server/rules.service")).getRules;

const page = {
  jurisdiction: "CA-QC",
  date: "2027-04-01",
  rules: [
    {
      key: "lease.deposit.allowed",
      title: "Dépôt interdit au Québec",
      sentence: "Un dépôt est interdit.",
      type: "BOOLEAN",
      value: false,
      severity: "BLOCK",
      effectiveFrom: "1994-01-01",
      citation: "C.c.Q., art. 1904",
      sourceUrl: "https://www.legisquebec.gouv.qc.ca/",
      verifiedOn: "2026-11-20",
      packVersion: "2026.11.1",
    },
  ],
};

describe("getRules", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("asks the BFF with the session cookie, the language and the query, and returns the validated page", async () => {
    vi.stubEnv("BFF_BASE_URL", "http://bff.test");
    const fetcher = vi.fn(async () => new Response(JSON.stringify(page), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);

    const result = await (await load())({ jurisdiction: "CA-QC", q: "depot" }, "fr-CA");

    expect(result.rules[0]?.title).toBe("Dépôt interdit au Québec");
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("http://bff.test/pages/rules?q=depot&jurisdiction=CA-QC");
    expect(init.headers).toMatchObject({ cookie: "ESCALIA_SESSION=abc", "accept-language": "fr-CA" });
  });

  it("fails closed when no BFF is configured", async () => {
    vi.stubEnv("BFF_BASE_URL", "");

    await expect((await load())({ jurisdiction: "CA-QC" }, "fr-CA")).rejects.toMatchObject({
      code: "upstream.unavailable",
      retryable: false,
    });
  });
});
