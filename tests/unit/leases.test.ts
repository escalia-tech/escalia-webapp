import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dollarsToCents,
  parseOccupantForm,
  parsePartiesForm,
  percentToBasisPoints,
  refusalKey,
} from "@/features/leases/schemas/leases.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));
const redirect = vi.fn();
vi.mock("@/i18n/navigation", () => ({ redirect: (...args: unknown[]) => redirect(...args) }));

const ID = "0197a000-0000-7000-8000-000000000001";
const PERSON = "0197a000-0000-7000-8000-000000000002";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

const lease = {
  id: ID,
  unitId: PERSON,
  status: "DRAFT",
  solidarity: "JOINT",
  solidaritySummary: { fr: "Conjointe", en: "Joint" },
  parties: [{ personId: PERSON, role: "TENANT", legalName: "Alex Test", language: "fr", shareBasisPoints: 10000 }],
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("lease schemas (FR-LEASE-05)", () => {
  it("turns percent text into basis points without floating point", () => {
    expect(percentToBasisPoints("50")).toBe(5000);
    expect(percentToBasisPoints("33,33")).toBe(3333);
    expect(percentToBasisPoints("33.3")).toBe(3330);
    expect(percentToBasisPoints("100")).toBe(10000);
    expect(percentToBasisPoints("100,5")).toBeUndefined();
    expect(percentToBasisPoints("abc")).toBeUndefined();
  });

  it("turns dollars into cents and refuses zero and junk", () => {
    expect(dollarsToCents("1500")).toBe(150000);
    expect(dollarsToCents("1500,5")).toBe(150050);
    expect(dollarsToCents("0")).toBeUndefined();
    expect(dollarsToCents("1 500")).toBeUndefined();
  });

  it("names the refusals the screen explains", () => {
    expect(refusalKey("lease.parties.shares")).toBe("shares");
    expect(refusalKey("other")).toBeUndefined();
    expect(refusalKey(undefined)).toBeUndefined();
  });

  it("reads numbered rows for tenants, occupants and guarantors", () => {
    const parsed = parsePartiesForm(
      form({
        solidarity: "SOLIDARY",
        role_0: "TENANT",
        legalName_0: " Alex Test ",
        email_0: "alex@example.test",
        share_0: "60",
        language_0: "en",
        address_0: "1 rue Test",
        role_1: "OCCUPANT",
        legalName_1: "Sam Test",
        relation_1: "enfant",
        role_2: "GUARANTOR",
        legalName_2: "Pat Test",
        phone_2: "5145550100",
        scope_2: "RENT_ONLY",
        duration_2: "INITIAL_TERM_AND_RENEWALS",
        maxAmount_2: "2000,50",
        guaranteed_2: "alex@example.test, kim@example.test",
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      body: {
        solidarity: "SOLIDARY",
        parties: [
          {
            role: "TENANT",
            legalName: "Alex Test",
            language: "en",
            email: "alex@example.test",
            postalAddress: "1 rue Test",
            shareBasisPoints: 6000,
          },
          { role: "OCCUPANT", legalName: "Sam Test", language: "fr", relation: "enfant" },
          {
            role: "GUARANTOR",
            legalName: "Pat Test",
            language: "fr",
            phone: "5145550100",
            guarantee: {
              scope: "RENT_ONLY",
              duration: "INITIAL_TERM_AND_RENEWALS",
              maxAmountCents: 200050,
              guaranteedEmails: ["alex@example.test", "kim@example.test"],
            },
          },
        ],
      },
    });
  });

  it("applies guarantee defaults and sends no solidarity when none is chosen", () => {
    const parsed = parsePartiesForm(form({ role_0: "GUARANTOR", legalName_0: "Pat", email_0: "p@example.test" }));
    expect(parsed).toEqual({
      ok: true,
      body: {
        parties: [
          {
            role: "GUARANTOR",
            legalName: "Pat",
            language: "fr",
            email: "p@example.test",
            guarantee: { scope: "ALL_OBLIGATIONS", duration: "INITIAL_TERM" },
          },
        ],
      },
    });
  });

  it("refuses an unknown role, a missing name, a bad share and a bad amount", () => {
    expect(parsePartiesForm(form({ role_0: "BOSS", legalName_0: "A" }))).toEqual({ ok: false, reason: "role" });
    expect(parsePartiesForm(form({ role_0: "TENANT", legalName_0: " " }))).toEqual({ ok: false, reason: "name" });
    expect(parsePartiesForm(form({ role_0: "TENANT", legalName_0: "A", share_0: "x" }))).toEqual({
      ok: false,
      reason: "share",
    });
    expect(parsePartiesForm(form({ role_0: "GUARANTOR", legalName_0: "A", maxAmount_0: "-3" }))).toEqual({
      ok: false,
      reason: "amount",
    });
  });

  it("reads the occupant form", () => {
    expect(parseOccupantForm(form({ legalName: " Sam ", relation: "enfant", email: "", phone: "5145550100" }))).toEqual(
      {
        ok: true,
        body: { legalName: "Sam", relation: "enfant", phone: "5145550100" },
      },
    );
    expect(parseOccupantForm(form({ legalName: " " }))).toEqual({ ok: false });
  });
});

describe("lease service and actions (FR-LEASE-05)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    redirect.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads one lease and the list, filtered by unit", async () => {
    const { fetchLease, fetchLeases } = await import("@/features/leases/server/leases.service");
    const fetcher = answer(200, { lease });
    vi.stubGlobal("fetch", fetcher);
    expect((await fetchLease(ID, "fr-CA")).solidarity).toBe("JOINT");
    vi.stubGlobal("fetch", answer(200, { items: [lease] }));
    expect(await fetchLeases("fr-CA", PERSON)).toHaveLength(1);
  });

  it("creates a draft, and says so when the id is malformed or the core refuses", async () => {
    const { createLease } = await import("@/features/leases/server/leases.service");
    vi.stubGlobal("fetch", answer(201, lease));
    expect(await createLease(PERSON, "fr-CA")).toEqual({ status: "done", leaseId: ID });
    expect(await createLease("nope", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    vi.stubGlobal("fetch", answer(404, { code: "lease.unit_not_found" }));
    expect(await createLease(PERSON, "fr-CA")).toMatchObject({ status: "refused", reason: "unitNotFound" });
    vi.stubGlobal("fetch", answer(201, { odd: true }));
    expect(await createLease(PERSON, "fr-CA")).toEqual({ status: "done", leaseId: undefined });
  });

  it("saves the parties, adds and removes an occupant", async () => {
    const service = await import("@/features/leases/server/leases.service");
    const fetcher = answer(200, lease);
    vi.stubGlobal("fetch", fetcher);
    const parties = form({ role_0: "TENANT", legalName_0: "Alex", email_0: "a@example.test" });
    expect(await service.saveParties(ID, parties, "fr-CA")).toMatchObject({ status: "done" });
    expect(await service.saveParties("x", parties, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await service.saveParties(ID, form({ role_0: "?", legalName_0: "A" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "role",
    });
    expect(await service.addOccupant(ID, form({ legalName: "Sam" }), "fr-CA")).toMatchObject({ status: "done" });
    expect(await service.addOccupant("x", form({ legalName: "Sam" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "id",
    });
    expect(await service.addOccupant(ID, form({ legalName: "" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "name",
    });
    expect(await service.removeOccupant(ID, PERSON, "fr-CA")).toMatchObject({ status: "done" });
    expect(await service.removeOccupant(ID, "x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(fetcher).toHaveBeenCalledTimes(3);
    vi.stubGlobal("fetch", answer(422, { code: "lease.parties.shares", detail: "shares" }));
    expect(await service.saveParties(ID, parties, "fr-CA")).toMatchObject({ status: "refused", reason: "shares" });
  });

  it("revalidates and redirects only when something changed", async () => {
    const actions = await import("@/features/leases/server/leases.actions");
    vi.stubGlobal("fetch", answer(201, lease));
    expect(await actions.createLeaseAction(PERSON)).toMatchObject({ status: "done" });
    expect(redirect).toHaveBeenCalledWith({ href: `/leases/${ID}`, locale: "fr-CA" });
    expect(
      await actions.savePartiesAction(
        ID,
        undefined,
        form({ role_0: "TENANT", legalName_0: "A", email_0: "a@example.test" }),
      ),
    ).toMatchObject({ status: "done" });
    expect(await actions.addOccupantAction(ID, undefined, form({ legalName: "Sam" }))).toMatchObject({
      status: "done",
    });
    expect(await actions.removeOccupantAction(ID, PERSON)).toMatchObject({ status: "done" });
    expect(revalidatePath).toHaveBeenCalledTimes(8);
    revalidatePath.mockClear();
    redirect.mockClear();
    expect(await actions.createLeaseAction("nope")).toEqual({ status: "invalid", reason: "id" });
    vi.stubGlobal("fetch", answer(201, { odd: true }));
    expect(await actions.createLeaseAction(PERSON)).toMatchObject({ status: "done", leaseId: undefined });
    expect(redirect).not.toHaveBeenCalled();
  });
});
