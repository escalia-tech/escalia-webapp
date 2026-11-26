import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { isApplicationError } from "@/lib/observability/errors/application-error";
import { callBffPage } from "@/server/bff-pages/call";

const schema = z.object({ ok: z.boolean() });
const base = {
  baseUrl: "http://bff.test",
  path: "/pages/rules" as const,
  cookie: "ESCALIA_SESSION=abc",
  language: "fr-CA",
  schema,
  signal: new AbortController().signal,
};

const answer = (status: number, body: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("callBffPage", () => {
  it("forwards the session cookie and language, and drops empty query values", async () => {
    const fetcher = answer(200, { ok: true });

    const page = await callBffPage({ ...base, query: { q: "depot", date: undefined, jurisdiction: "" }, fetcher });

    expect(page).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe("http://bff.test/pages/rules?q=depot");
    expect(init.headers).toMatchObject({ cookie: "ESCALIA_SESSION=abc", "accept-language": "fr-CA" });
  });

  it("works without a query", async () => {
    await expect(callBffPage({ ...base, fetcher: answer(200, { ok: true }) })).resolves.toEqual({ ok: true });
  });

  it("uses the global fetch when none is given", async () => {
    vi.stubGlobal("fetch", answer(200, { ok: true }));

    await expect(callBffPage(base)).resolves.toEqual({ ok: true });
  });

  it.each([
    [401, "auth.unauthenticated"],
    [403, "auth.forbidden"],
    [404, "resource.not_found"],
    [500, "upstream.unavailable"],
  ])("maps a %i answer to %s", async (status, code) => {
    const failure = await callBffPage({ ...base, fetcher: answer(status) }).catch((error: unknown) => error);

    expect(isApplicationError(failure) && failure.code).toBe(code);
  });

  it("refuses an answer that does not match the contract", async () => {
    const failure = await callBffPage({ ...base, fetcher: answer(200, { ok: "yes" }) }).catch(
      (error: unknown) => error,
    );

    expect(isApplicationError(failure) && failure.code).toBe("upstream.unavailable");
  });

  it("fails closed when no BFF is configured", async () => {
    const failure = await callBffPage({ ...base, baseUrl: undefined }).catch((error: unknown) => error);

    expect(isApplicationError(failure) && failure.retryable).toBe(false);
  });
});
