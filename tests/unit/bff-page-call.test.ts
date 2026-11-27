import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { isApplicationError } from "@/lib/observability/errors/application-error";
import { callBffAction, callBffPage } from "@/server/bff-pages/call";
import { failureState, isMissingOrganization } from "@/server/bff-pages/failure";

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

  it("tells a person without an organization apart from a missing resource", async () => {
    const missing = await callBffPage({
      ...base,
      fetcher: answer(404, { code: "identity.organization.not_found" }),
    }).catch((error: unknown) => error);
    expect(isApplicationError(missing) && missing.code).toBe("organization.missing");
    expect(isMissingOrganization(missing)).toBe(true);
    expect(failureState(missing)).toBe("notFound");

    const other = await callBffPage({ ...base, fetcher: answer(404, { code: "portfolio.building.not_found" }) }).catch(
      (error: unknown) => error,
    );
    expect(isMissingOrganization(other)).toBe(false);
    const notJson = await callBffPage({
      ...base,
      fetcher: vi.fn(async () => new Response("<html>", { status: 404 })),
    }).catch((error: unknown) => error);
    expect(isApplicationError(notJson) && notJson.code).toBe("resource.not_found");
    expect(isMissingOrganization(new Error("x"))).toBe(false);
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

describe("callBffAction", () => {
  const action = {
    baseUrl: "http://bff.test",
    path: "/actions/x" as const,
    body: { a: 1 },
    cookie: "c=1",
    xsrfToken: "t",
    language: "fr-CA",
    signal: new AbortController().signal,
  };

  it("posts JSON with the CSRF header and returns the body", async () => {
    const fetcher = answer(201, { id: "1" });

    expect(await callBffAction({ ...action, fetcher })).toEqual({ ok: true, body: { id: "1" } });
    const [, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init).toMatchObject({ method: "POST", body: '{"a":1}' });
    expect(init.headers).toMatchObject({ "x-xsrf-token": "t" });
  });

  it("omits the CSRF header without a token and uses the global fetch by default", async () => {
    vi.stubGlobal("fetch", answer(200, {}));

    expect(await callBffAction({ ...action, xsrfToken: undefined })).toEqual({ ok: true, body: {} });
  });

  it("returns a refusal as data, with the code and detail of the problem when there are some", async () => {
    expect(await callBffAction({ ...action, fetcher: answer(422, { code: "x.y", detail: "Non." }) })).toEqual({
      ok: false,
      status: 422,
      code: "x.y",
      message: "Non.",
    });
    expect(await callBffAction({ ...action, fetcher: answer(409, "plain") })).toEqual({
      ok: false,
      status: 409,
      code: undefined,
      message: undefined,
    });
    expect(
      await callBffAction({ ...action, fetcher: vi.fn(async () => new Response("not json", { status: 400 })) }),
    ).toMatchObject({ ok: false, status: 400 });
  });

  it.each([
    [401, "auth.unauthenticated"],
    [503, "upstream.unavailable"],
  ])("raises for a %i", async (status, code) => {
    const failure = await callBffAction({ ...action, fetcher: answer(status) }).catch((error: unknown) => error);

    expect(isApplicationError(failure) && failure.code).toBe(code);
  });

  it("fails closed when no BFF is configured", async () => {
    const failure = await callBffAction({ ...action, baseUrl: undefined }).catch((error: unknown) => error);

    expect(isApplicationError(failure) && failure.retryable).toBe(false);
  });
});
