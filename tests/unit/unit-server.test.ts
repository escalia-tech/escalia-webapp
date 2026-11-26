import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const UNIT = "0197a000-0000-7000-8000-000000000002";
const BUILDING = "0197a000-0000-7000-8000-000000000001";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const attributes = {
  typeAndSize: { type: "ROOMS_4_5", area: { value: 850, unit: "FT2", squareMetres: 79 } },
  included: {
    heatingIncluded: true,
    heatingSource: "ELECTRICITY",
    hotWaterIncluded: false,
    hotWaterSource: null,
    electricityIncluded: false,
    appliances: ["STOVE"],
    furnished: false,
    snowRemovalIncluded: false,
    lawnIncluded: false,
    otherServices: "",
  },
  parkingAndStorage: {
    parkingKind: "NONE",
    parkingSpaces: 0,
    parkingIncluded: false,
    parkingAmountCents: null,
    storageKind: "NONE",
    storageIncluded: false,
    storageAmountCents: null,
  },
  accessibility: {
    stepFreeEntrance: "UNKNOWN",
    floor: null,
    elevator: "UNKNOWN",
    adaptedBathroom: "UNKNOWN",
    notes: "",
  },
};
const version = { version: 1, changedBy: UNIT, changedAt: "2026-11-26T15:00:00Z", attributes };

function data(values: Record<string, string | string[]>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const one of Array.isArray(value) ? value : [value]) body.append(key, one);
  }
  return body;
}

describe("unit server code (FR-PORT-02)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockReset();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads one unit, and refuses an id that is not a UUID before calling anything", async () => {
    const fetcher = answer(200, {
      id: UNIT,
      buildingId: BUILDING,
      buildingCode: "VIL",
      buildingName: "6-plex",
      label: "1",
      archived: false,
      siblings: [],
      current: version,
      history: [version],
    });
    vi.stubGlobal("fetch", fetcher);
    const { fetchUnit } = await import("@/features/portfolio/server/unit.service");

    expect((await fetchUnit(UNIT, "fr-CA")).current?.version).toBe(1);
    expect(() => fetchUnit("../admin", "fr-CA")).toThrow(/not found/i);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("saves a version: CSRF token and cookie are sent, and the version comes back", async () => {
    const fetcher = answer(200, version);
    vi.stubGlobal("fetch", fetcher);
    const { saveUnitAttributes } = await import("@/features/portfolio/server/unit.service");

    expect(await saveUnitAttributes(UNIT, { type: "ROOMS_4_5", heatingIncluded: "on" }, "fr-CA")).toEqual({
      status: "saved",
      version: 1,
    });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe(`/actions/update-unit-attributes/${UNIT}`);
    expect(init.headers).toMatchObject({ "x-xsrf-token": "tok" });
    expect(JSON.parse(init.body as string).included.heatingIncluded).toBe(true);
  });

  it("reports invalid input without calling the BFF, and the core's refusal with its message", async () => {
    const fetcher = answer(422, {
      code: "portfolio.unit_attributes.parking_amount_required",
      detail: "Indiquez le montant du stationnement.",
    });
    vi.stubGlobal("fetch", fetcher);
    const { saveUnitAttributes } = await import("@/features/portfolio/server/unit.service");

    expect(await saveUnitAttributes(UNIT, {}, "fr-CA")).toEqual({ status: "invalid" });
    expect(await saveUnitAttributes("nope", { type: "STUDIO" }, "fr-CA")).toEqual({ status: "invalid" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await saveUnitAttributes(UNIT, { type: "STUDIO" }, "fr-CA")).toEqual({
      status: "refused",
      message: "Indiquez le montant du stationnement.",
    });
  });

  it("is refused when the BFF answers 2xx without a version", async () => {
    vi.stubGlobal("fetch", answer(200, {}));
    const { saveUnitAttributes } = await import("@/features/portfolio/server/unit.service");

    expect(await saveUnitAttributes(UNIT, { type: "STUDIO" }, "fr-CA")).toEqual({
      status: "refused",
      message: undefined,
    });
  });

  it("copies groups to other units and counts them", async () => {
    const fetcher = answer(200, { items: [{ unitId: UNIT, version: 2 }] });
    vi.stubGlobal("fetch", fetcher);
    const { copyUnitAttributes } = await import("@/features/portfolio/server/unit.service");
    const form = { groups: "INCLUDED", toUnitIds: [UNIT] };

    expect(await copyUnitAttributes(BUILDING, UNIT, form, "fr-CA")).toEqual({ status: "copied", count: 1 });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe(`/actions/copy-unit-attributes/${BUILDING}`);
    expect(JSON.parse(init.body as string)).toEqual({ fromUnitId: UNIT, toUnitIds: [UNIT], groups: ["INCLUDED"] });
    expect(await copyUnitAttributes("x", UNIT, form, "fr-CA")).toEqual({ status: "invalid" });
    expect(await copyUnitAttributes(BUILDING, "x", form, "fr-CA")).toEqual({ status: "invalid" });
    expect(await copyUnitAttributes(BUILDING, UNIT, {}, "fr-CA")).toEqual({ status: "invalid" });
  });

  it("reports the core's refusal of a copy, and a copy that answers with no items as none", async () => {
    vi.stubGlobal("fetch", answer(422, { detail: "Rien à copier." }));
    const { copyUnitAttributes } = await import("@/features/portfolio/server/unit.service");
    const form = { groups: "INCLUDED", toUnitIds: UNIT };

    expect(await copyUnitAttributes(BUILDING, UNIT, form, "fr-CA")).toEqual({
      status: "refused",
      message: "Rien à copier.",
    });
    vi.stubGlobal("fetch", answer(200, {}));
    expect(await copyUnitAttributes(BUILDING, UNIT, form, "fr-CA")).toEqual({ status: "copied", count: 0 });
  });

  it("the form actions refresh the page after a save or a copy, and return what to show otherwise", async () => {
    vi.stubGlobal("fetch", answer(200, version));
    const { saveUnitAttributesAction, copyUnitAttributesAction } = await import(
      "@/features/portfolio/server/unit.actions"
    );

    expect(
      await saveUnitAttributesAction(UNIT, undefined, data({ type: "STUDIO", appliances: ["STOVE", "DRYER"] })),
    ).toEqual({
      status: "saved",
      version: 1,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/units/[unitId]", "page");
    expect(await saveUnitAttributesAction(UNIT, undefined, data({}))).toEqual({ status: "invalid" });
    vi.stubGlobal("fetch", answer(422, { detail: "Non." }));
    expect(await saveUnitAttributesAction(UNIT, undefined, data({ type: "STUDIO" }))).toEqual({
      status: "refused",
      message: "Non.",
    });

    vi.stubGlobal(
      "fetch",
      answer(200, {
        items: [
          { unitId: UNIT, version: 2 },
          { unitId: BUILDING, version: 1 },
        ],
      }),
    );
    expect(
      await copyUnitAttributesAction(
        BUILDING,
        UNIT,
        undefined,
        data({ groups: "INCLUDED", toUnitIds: [UNIT, BUILDING] }),
      ),
    ).toEqual({ status: "saved", count: 2 });
    expect(await copyUnitAttributesAction(BUILDING, UNIT, undefined, data({}))).toEqual({ status: "invalid" });
    vi.stubGlobal("fetch", answer(422, { detail: "Non." }));
    expect(
      await copyUnitAttributesAction(BUILDING, UNIT, undefined, data({ groups: "INCLUDED", toUnitIds: UNIT })),
    ).toEqual({ status: "refused", message: "Non." });
  });
});
