import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BYLAWS_MAX, NOTE_MAX, parseBylawsForm } from "@/features/leases/schemas/bylaws.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const ANNEX = "0197a000-0000-7000-8000-000000000002";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

const VERSION = {
  version: 2,
  text: "# Bruit",
  textEn: null,
  changeNote: "v2",
  createdAt: "2027-01-01T00:00:00Z",
  active: true,
  attachedToLeases: false,
};
const FINDING = {
  outcome: "WARN",
  ruleKey: "lease.bylaws.penalty.amende",
  title: { fr: "a", en: "b" },
  sentence: { fr: "c", en: "d" },
};
const ANNEXES = [
  {
    id: ANNEX,
    kind: "BYLAWS",
    title: "Règlement",
    text: "Calme",
    bylawsVersion: 2,
    acknowledged: false,
    canAcknowledge: true,
  },
];

describe("by-laws form (FR-LEASE-03)", () => {
  it("types the text into the body the core expects", () => {
    expect(parseBylawsForm(form({ text: " Calme ", textEn: " Quiet ", changeNote: " v1 " }))).toEqual({
      ok: true,
      body: { text: "Calme", textEn: "Quiet", changeNote: "v1" },
    });
    expect(parseBylawsForm(form({ text: "Calme" }))).toEqual({ ok: true, body: { text: "Calme", changeNote: "" } });
  });

  it("refuses an empty or too long text, translation and note", () => {
    expect(parseBylawsForm(form({ text: "  " }))).toEqual({ ok: false, reason: "text" });
    expect(parseBylawsForm(new FormData())).toEqual({ ok: false, reason: "text" });
    expect(parseBylawsForm(form({ text: "x".repeat(BYLAWS_MAX + 1) }))).toEqual({ ok: false, reason: "text" });
    expect(parseBylawsForm(form({ text: "x", textEn: "y".repeat(BYLAWS_MAX + 1) }))).toEqual({
      ok: false,
      reason: "textEn",
    });
    expect(parseBylawsForm(form({ text: "x", changeNote: "n".repeat(NOTE_MAX + 1) }))).toEqual({
      ok: false,
      reason: "note",
    });
  });
});

describe("by-laws service, actions and PDF (FR-LEASE-03)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the versions and the annexes", async () => {
    const service = await import("@/features/leases/server/bylaws.service");
    vi.stubGlobal("fetch", answer(200, { items: [VERSION] }));
    expect(await service.fetchBylaws(ID, "fr-CA")).toHaveLength(1);
    vi.stubGlobal("fetch", answer(200, { items: [{ id: ANNEX, kind: "BYLAWS", title: "R", acknowledgedBy: [ID] }] }));
    expect((await service.fetchLeaseAnnexes(ID, "fr-CA"))[0]?.acknowledgedBy).toEqual([ID]);
    vi.stubGlobal("fetch", answer(200, { items: ANNEXES }));
    expect((await service.fetchTenantAnnexes(ID, "fr-CA"))[0]?.canAcknowledge).toBe(true);
  });

  it("saves a version, keeps its warnings, and explains refusals", async () => {
    const service = await import("@/features/leases/server/bylaws.service");
    const fetcher = answer(201, { version: VERSION, findings: [FINDING] });
    vi.stubGlobal("fetch", fetcher);
    const saved = await service.saveBylaws(ID, form({ text: "Amende" }), "fr-CA");
    expect(saved).toMatchObject({ status: "saved", saved: { findings: [{ ruleKey: FINDING.ruleKey }] } });
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain(`/actions/save-bylaws/${ID}`);
    expect(await service.saveBylaws("x", form({ text: "a" }), "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await service.saveBylaws(ID, form({ text: "" }), "fr-CA")).toEqual({ status: "invalid", reason: "text" });
    vi.stubGlobal("fetch", answer(201, { odd: true }));
    expect(await service.saveBylaws(ID, form({ text: "a" }), "fr-CA")).toEqual({ status: "saved", saved: undefined });
    vi.stubGlobal("fetch", answer(404, { code: "lease.building_not_found" }));
    expect(await service.saveBylaws(ID, form({ text: "a" }), "fr-CA")).toMatchObject({
      status: "refused",
      reason: "buildingNotFound",
    });
  });

  it("acknowledges an annex for oneself", async () => {
    const service = await import("@/features/leases/server/bylaws.service");
    const fetcher = answer(200, { items: [{ ...ANNEXES[0], acknowledged: true, canAcknowledge: false }] });
    vi.stubGlobal("fetch", fetcher);
    expect(await service.acknowledgeAnnex(ID, ANNEX, "fr-CA")).toMatchObject({
      status: "acknowledged",
      items: [{ acknowledged: true }],
    });
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain(`/actions/acknowledge-annex/${ID}/${ANNEX}`);
    expect(await service.acknowledgeAnnex("x", ANNEX, "fr-CA")).toEqual({ status: "invalid" });
    expect(await service.acknowledgeAnnex(ID, "x", "fr-CA")).toEqual({ status: "invalid" });
    vi.stubGlobal("fetch", answer(200, { odd: true }));
    expect(await service.acknowledgeAnnex(ID, ANNEX, "fr-CA")).toEqual({ status: "acknowledged", items: undefined });
    vi.stubGlobal("fetch", answer(403, { code: "lease.annex.cannot_acknowledge" }));
    expect(await service.acknowledgeAnnex(ID, ANNEX, "fr-CA")).toMatchObject({
      status: "refused",
      reason: "cannotAcknowledge",
    });
  });

  it("the actions revalidate only when something changed", async () => {
    const actions = await import("@/features/leases/server/bylaws.actions");
    vi.stubGlobal("fetch", answer(201, { version: VERSION, findings: [] }));
    await actions.saveBylawsAction(ID, undefined, form({ text: "a" }));
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    vi.stubGlobal("fetch", answer(200, { items: ANNEXES }));
    await actions.acknowledgeAnnexAction(ID, ANNEX);
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    vi.stubGlobal("fetch", answer(403, { code: "lease.annex.cannot_acknowledge" }));
    await actions.saveBylawsAction(ID, undefined, form({ text: "" }));
    await actions.acknowledgeAnnexAction(ID, ANNEX);
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("serves a version as a never-cached PDF", async () => {
    const { fetchBylawsPdf } = await import("@/features/leases/server/bylaws.pdf");
    const pdf = vi.fn(async () => new Response("%PDF-1.4", { status: 200 }));
    const query = (buildingId: string | undefined, version: string | undefined) => {
      const params = new URLSearchParams();
      if (buildingId) params.set("buildingId", buildingId);
      if (version) params.set("version", version);
      return params;
    };
    const ok = await fetchBylawsPdf(query(ID, "2"), pdf);
    expect(ok.headers.get("content-type")).toBe("application/pdf");
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(await ok.text()).toBe("%PDF-1.4");
    expect(String((pdf.mock.calls[0] as unknown[])[0])).toBe(`http://bff.test/pages/buildings/${ID}/bylaws/2/pdf`);
    expect((await fetchBylawsPdf(query("x", "2"), pdf)).status).toBe(404);
    expect((await fetchBylawsPdf(query(ID, "0"), pdf)).status).toBe(404);
    expect((await fetchBylawsPdf(query(ID, undefined), pdf)).status).toBe(404);
    expect((await fetchBylawsPdf(query(undefined, "2"), pdf)).status).toBe(404);
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    expect((await fetchBylawsPdf(query(ID, "9"), missing)).status).toBe(404);
    const down = vi.fn(async () => new Response(null, { status: 500 }));
    expect((await fetchBylawsPdf(query(ID, "2"), down)).status).toBe(502);
  });

  it("serves nothing when no BFF is configured", async () => {
    vi.stubEnv("ESCALIA_BFF_URL", "");
    const { fetchBylawsPdf } = await import("@/features/leases/server/bylaws.pdf");
    const pdf = vi.fn(async () => new Response("%PDF-1.4", { status: 200 }));
    expect((await fetchBylawsPdf(new URLSearchParams({ buildingId: ID, version: "1" }), pdf)).status).toBe(404);
  });

  it("has a route that hands the query on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("%PDF-1.4", { status: 200 })),
    );
    const route = await import("@/app/api/bff/bylaws/pdf/route");
    const response = await route.GET(new Request(`http://localhost/api/bff/bylaws/pdf?buildingId=${ID}&version=1`));
    expect(response.status).toBe(200);
  });
});
