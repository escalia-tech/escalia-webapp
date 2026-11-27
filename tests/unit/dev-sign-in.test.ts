import { describe, expect, it, vi } from "vitest";

import { devSignInAvailable, parseSetCookies, signInDevUser } from "@/server/auth/dev-sign-in-core";

const signal = new AbortController().signal;
const login = (status = 204) =>
  new Response(null, {
    status,
    headers: [
      ["set-cookie", "ESCALIA_SESSION=abc; Path=/; HttpOnly"],
      ["set-cookie", "XSRF-TOKEN=tok; Path=/"],
    ],
  });

describe("parseSetCookies", () => {
  it("keeps name and value, drops attributes and malformed lines", () => {
    expect(parseSetCookies(["a=b=c; Path=/", "=x", "novalue"])).toEqual([{ name: "a", value: "b=c" }]);
  });
});

describe("devSignInAvailable", () => {
  const base = { bffBaseUrl: "http://bff.test", demoModeEnabled: true, appEnv: "local" };
  it("is on for a local environment with the BFF configured", () => {
    expect(devSignInAvailable(base)).toBe(true);
  });
  it("is off without BFF, without demo mode, or outside local environments", () => {
    expect(devSignInAvailable({ ...base, bffBaseUrl: undefined })).toBe(false);
    expect(devSignInAvailable({ ...base, demoModeEnabled: false })).toBe(false);
    expect(devSignInAvailable({ ...base, appEnv: "production" })).toBe(false);
  });
});

describe("signInDevUser", () => {
  it("signs the landlord in and creates the organization with the CSRF token", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(login())
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));

    const cookies = await signInDevUser({ baseUrl: "http://bff.test", user: "landlord-1", signal, fetcher });

    expect(cookies.map((c) => c.name)).toEqual(["ESCALIA_SESSION", "XSRF-TOKEN"]);
    const [url, init] = fetcher.mock.calls[1] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/actions/create-organization");
    expect(init.headers).toMatchObject({ "x-xsrf-token": "tok", cookie: "ESCALIA_SESSION=abc; XSRF-TOKEN=tok" });
  });

  it("does not create an organization for another user", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(login());

    await signInDevUser({ baseUrl: "http://bff.test", user: "tenant-1", signal, fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("skips the organization when the BFF hands out no CSRF token", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(signInDevUser({ baseUrl: "http://bff.test", user: "landlord-1", signal, fetcher })).resolves.toEqual(
      [],
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fails when the dev login is refused", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(login(404));

    await expect(signInDevUser({ baseUrl: "http://bff.test", user: "landlord-1", signal, fetcher })).rejects.toThrow(
      "404",
    );
  });

  it("uses the global fetch when none is given", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(signInDevUser({ baseUrl: "http://bff.test", user: "tenant-1", signal })).resolves.toEqual([]);
  });
});
