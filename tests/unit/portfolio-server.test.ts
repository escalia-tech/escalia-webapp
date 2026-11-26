import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("portfolio server code", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists buildings with the paging and the archived switch", async () => {
    const fetcher = answer(200, { items: [], page: 2, pageSize: 25, total: 0 });
    vi.stubGlobal("fetch", fetcher);
    const { fetchBuildings } = await import("@/features/portfolio/server/portfolio.service");

    await fetchBuildings({ q: "vil", page: 2, includeArchived: true }, "fr-CA");
    await fetchBuildings({ q: undefined, page: 1, includeArchived: false }, "en-CA");

    const first = (fetcher.mock.calls[0] as unknown as [URL])[0].toString();
    const second = (fetcher.mock.calls[1] as unknown as [URL])[0].toString();
    expect(first).toBe("http://bff.test/pages/buildings?q=vil&page=2&pageSize=25&includeArchived=true");
    expect(second).toBe("http://bff.test/pages/buildings?page=1&pageSize=25");
  });

  it("reads one building, and refuses an id that is not a UUID before calling anything", async () => {
    const fetcher = answer(200, {
      id: ID,
      code: "VIL",
      displayName: "6-plex",
      address: { civicNumber: "1", street: "rue X", city: "Montréal", province: "CA-QC", postalCode: "H2R 2B4" },
      jurisdiction: "CA-QC/montreal",
      timeZone: "America/Toronto",
      codeLocked: false,
      archived: false,
      units: [],
      commonAreas: [],
    });
    vi.stubGlobal("fetch", fetcher);
    const { fetchBuilding } = await import("@/features/portfolio/server/portfolio.service");

    expect((await fetchBuilding(ID, "fr-CA")).code).toBe("VIL");
    expect(() => fetchBuilding("../admin", "fr-CA")).toThrow(/not found/i);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  const form = { civicNumber: "1", street: "rue X", city: "Montréal", postalCode: "H2R 2B4", unitCount: "2" };

  it("creates a building: CSRF token and cookie are sent, and the new id is returned", async () => {
    const fetcher = answer(201, { id: ID });
    vi.stubGlobal("fetch", fetcher);
    const { createBuilding } = await import("@/features/portfolio/server/create-building");

    expect(await createBuilding(form, "fr-CA")).toEqual({ status: "created", id: ID });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/actions/create-building");
    expect(init.headers).toMatchObject({ "x-xsrf-token": "tok", cookie: expect.stringContaining("ESCALIA_SESSION") });
    expect(JSON.parse(init.body as string).units).toEqual({ count: 2 });
  });

  it("reports invalid input without calling the BFF, and the core's refusal with its message", async () => {
    const fetcher = answer(422, {
      code: "portfolio.province.unsupported",
      detail: "Escalia est offert au Québec pour l'instant.",
    });
    vi.stubGlobal("fetch", fetcher);
    const { createBuilding } = await import("@/features/portfolio/server/create-building");

    expect(await createBuilding({ ...form, street: "" }, "fr-CA")).toEqual({ status: "invalid" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await createBuilding(form, "fr-CA")).toEqual({
      status: "refused",
      message: "Escalia est offert au Québec pour l'instant.",
    });
  });

  it("passes the optional name and the range of units on", async () => {
    const fetcher = answer(201, { id: ID });
    vi.stubGlobal("fetch", fetcher);
    const { createBuilding } = await import("@/features/portfolio/server/create-building");

    await createBuilding({ ...form, unitCount: undefined, displayName: "6-plex", unitRange: "1-6" }, "fr-CA");

    const body = JSON.parse((fetcher.mock.calls[0] as unknown as [URL, RequestInit])[1].body as string);
    expect(body).toMatchObject({ displayName: "6-plex", units: { range: "1-6" } });
  });

  it("is refused when the BFF answers 2xx without an id", async () => {
    vi.stubGlobal("fetch", answer(201, {}));
    const { createBuilding } = await import("@/features/portfolio/server/create-building");

    expect(await createBuilding(form, "fr-CA")).toEqual({ status: "refused", message: undefined });
  });

  it("the form action redirects to the new building, or returns the error to show", async () => {
    vi.stubGlobal("fetch", answer(201, { id: ID }));
    const { createBuildingAction } = await import("@/features/portfolio/server/create-building.action");
    const data = (values: Record<string, string>) => {
      const body = new FormData();
      for (const [key, value] of Object.entries(values)) body.set(key, value);
      return body;
    };

    await expect(createBuildingAction(undefined, data(form))).rejects.toThrow(`redirect:/fr-CA/buildings/${ID}`);
    expect(await createBuildingAction(undefined, data({ ...form, street: "" }))).toEqual({ error: "invalid" });
    vi.stubGlobal("fetch", answer(422, { detail: "Non." }));
    expect(await createBuildingAction(undefined, data(form))).toEqual({ error: "refused", message: "Non." });
  });
});
