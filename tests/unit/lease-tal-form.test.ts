import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseTalForm } from "@/features/leases/schemas/tal-form.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const one of Array.isArray(value) ? value : [value]) data.append(key, one);
  }
  return data;
}

const FULL = {
  lName: "Proprio Inc.",
  lStreet: "10 rue Main",
  lUnit: "3",
  lCity: "Montréal",
  lPostal: "H2X 1Y1",
  lPhone: "514-555-0101",
  lOtherPhone: "514-555-0102",
  lEmail: "p@example.test",
  lRep: "Gestion Z",
  rooms: "4",
  habitationOnly: "no",
  mixedUse: "Bureau",
  condo: "yes",
  outdoorCount: "1",
  outdoorWhere: "A1",
  indoorCount: "0",
  storageCount: "2",
  otherAccessories: "Cour",
  furnished: "yes",
  appliances: ["STOVE", "DRYER"],
  furniture_BED: "2",
  furniture_TABLE: "0",
  smokeAlarm: "on",
  period: "WEEK",
  servicesCost: "25",
  subsidy: "no",
  subsidyNote: "Aucune",
  paymentPlace: "Au bureau",
  cost_HEATING: "LANDLORD",
  cost_GAS: "TENANT",
  cost_WATER_TAX: "AUTRE",
  heatingSource: "GAS",
  smokeFree: "yes",
  smokeFreeNote: "Partout",
  pets: "no",
  careName: "Luc",
  carePhone: "514-555-0103",
  careOtherPhone: "514-555-0104",
  careEmail: "c@example.test",
  worksBefore: "Peinture",
  worksDuring: "Toiture",
  fKind: "NEW_BUILDING",
  fReady: "2025-03-01",
  gLastOn: "2026-01-01",
  gLast: "1400",
  gSenior: "on",
  gPrevious: "1200",
  gPeriod: "MONTH",
  unchanged: "no",
  gChanges: "Plus de cave",
  spouse: "Sam Roy",
  extraLabel_1: "Câble",
  extraCost_1: "20",
  extraLabel_2: "Gym",
};

describe("parseTalForm", () => {
  it("reads every section of the TAL form", () => {
    const parsed = parseTalForm(form(FULL));
    expect(parsed).toMatchObject({ ok: true });
    if (!parsed.ok) return;
    expect(parsed.body).toMatchObject({
      landlord: {
        name: "Proprio Inc.",
        address: { street: "10 rue Main", city: "Montréal", postalCode: "H2X 1Y1", unit: "3" },
        representedBy: "Gestion Z",
      },
      dwelling: {
        rooms: 4,
        habitationOnly: false,
        condo: true,
        furnished: true,
        parkingOutdoor: { count: 1, where: "A1" },
        parkingIndoor: { count: 0 },
        storage: { count: 2 },
        appliances: ["STOVE", "DRYER"],
        furniture: { BED: 2 },
        smokeAlarmUndertaking: true,
      },
      rent: { period: "WEEK", servicesCents: 2500, subsidy: false, paymentPlace: "Au bureau" },
      services: {
        costs: { HEATING: "LANDLORD", GAS: "TENANT" },
        heatingSource: "GAS",
        smokeFree: { enabled: true, note: "Partout" },
        pets: { enabled: false },
        caretaker: { name: "Luc", email: "c@example.test" },
        worksBefore: "Peinture",
      },
      clauseF: { kind: "NEW_BUILDING", readyOn: "2025-03-01" },
      clauseG: {
        period: "MONTH",
        lastRentOn: "2026-01-01",
        lastRentCents: 140000,
        formerSeniorResidence: true,
        previousRentCents: 120000,
        unchanged: false,
        changes: "Plus de cave",
      },
      family: { spouseName: "Sam Roy" },
      extraServices: [
        { label: "Câble", costCents: 2000 },
        { label: "Gym", costCents: 0 },
      ],
    });
  });

  it("an empty form is valid and says nothing it was not told", () => {
    const parsed = parseTalForm(form({}));
    expect(parsed).toEqual({
      ok: true,
      body: {
        landlord: {},
        dwelling: { appliances: [], furniture: {}, smokeAlarmUndertaking: false },
        rent: { period: "MONTH" },
        services: { costs: {} },
        clauseG: { formerSeniorResidence: false },
        family: {},
        extraServices: [],
      },
    });
  });

  it("keeps the answers a select can give: yes, no, a heating source and a kind of clause F", () => {
    const parsed = parseTalForm(
      form({ landAccess: "yes", heatingSource: "COAL", fKind: "CHANGE_OF_USE", gPeriod: "OTHER" }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      body: {
        services: { landAccess: { enabled: true } },
        clauseF: { kind: "CHANGE_OF_USE" },
        clauseG: { period: "OTHER" },
      },
    });
    if (parsed.ok) expect(parsed.body.services).not.toHaveProperty("heatingSource");
  });

  it("names what is wrong: a date, a number or an amount", () => {
    expect(parseTalForm(form({ fReady: "demain" }))).toEqual({ ok: false, reason: "date" });
    expect(parseTalForm(form({ gLastOn: "hier" }))).toEqual({ ok: false, reason: "date" });
    expect(parseTalForm(form({ rooms: "beaucoup" }))).toEqual({ ok: false, reason: "number" });
    expect(parseTalForm(form({ outdoorCount: "x" }))).toEqual({ ok: false, reason: "number" });
    expect(parseTalForm(form({ gLast: "cher" }))).toEqual({ ok: false, reason: "money" });
    expect(parseTalForm(form({ gPrevious: "cher" }))).toEqual({ ok: false, reason: "money" });
    expect(parseTalForm(form({ extraCost_1: "cher" }))).toEqual({ ok: false, reason: "money" });
    expect(parseTalForm(form({ servicesCost: "cher" }))).toEqual({ ok: false, reason: "money" });
  });
});

describe("the form through the BFF", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
    revalidatePath.mockReset();
  });

  it("reads the form and what is missing", async () => {
    vi.stubGlobal("fetch", answer(200, { form: {}, missing: ["LANDLORD_NAME"] }));
    const { fetchLeaseForm } = await import("@/features/leases/server/tal-form.service");

    await expect(fetchLeaseForm(ID, "fr-CA")).resolves.toEqual({ form: {}, missing: ["LANDLORD_NAME"] });
  });

  it("saves the form, refreshes the page and keeps what the core says is missing", async () => {
    vi.stubGlobal("fetch", answer(200, { form: {}, missing: [] }));
    const { saveTalFormAction } = await import("@/features/leases/server/tal-form.actions");

    const outcome = await saveTalFormAction(ID, undefined, form({ lName: "Proprio" }));

    expect(outcome).toEqual({ status: "done", view: { form: {}, missing: [] } });
    expect(revalidatePath).toHaveBeenCalledWith("/leases/[leaseId]", "page");
  });

  it("keeps the page as it is when the core answers with something else", async () => {
    vi.stubGlobal("fetch", answer(200, { surprise: true }));
    const { saveLeaseForm } = await import("@/features/leases/server/tal-form.service");

    await expect(saveLeaseForm(ID, form({}), "fr-CA")).resolves.toEqual({ status: "done", view: undefined });
  });

  it("refuses a bad id and a bad field without calling the core, and passes the core's refusal on", async () => {
    const fetchMock = answer(422, { code: "lease.form.incomplete", title: "Incomplet", detail: "Incomplete" });
    vi.stubGlobal("fetch", fetchMock);
    const { saveLeaseForm } = await import("@/features/leases/server/tal-form.service");

    await expect(saveLeaseForm("nope", form({}), "fr-CA")).resolves.toEqual({ status: "invalid", reason: "id" });
    await expect(saveLeaseForm(ID, form({ rooms: "x" }), "fr-CA")).resolves.toEqual({
      status: "invalid",
      reason: "number",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(saveLeaseForm(ID, form({}), "fr-CA")).resolves.toMatchObject({
      status: "refused",
      reason: "formIncomplete",
    });
  });

  it("does not refresh the page when the form is refused", async () => {
    vi.stubGlobal("fetch", answer(422, { code: "lease.out_for_signature", title: "T", detail: "D" }));
    const { saveTalFormAction } = await import("@/features/leases/server/tal-form.actions");

    await saveTalFormAction(ID, undefined, form({}));

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
