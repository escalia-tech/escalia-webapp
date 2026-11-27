import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dollarsToCentsOrZero, parseTermsForm } from "@/features/leases/schemas/leases.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));

const ID = "0197a000-0000-7000-8000-000000000001";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const one of Array.isArray(value) ? value : [value]) data.append(key, one);
  }
  return data;
}

const LEASE = {
  id: ID,
  unitId: ID,
  status: "DRAFT",
  solidarity: "JOINT",
  solidaritySummary: { fr: "a", en: "b" },
  parties: [],
};

const BASE = {
  termKind: "FIXED",
  startDate: "2027-07-01",
  endDate: "2028-06-30",
  rent: "1200,50",
  dueDay: "1",
  firstPaymentDate: "2027-07-01",
  firstPayment: "1200,50",
  methods: ["INTERAC", "CHEQUE"],
};

describe("lease terms form (FR-LEASE-01)", () => {
  it("types the text into the body the core expects", () => {
    const parsed = parseTermsForm(
      form({
        ...BASE,
        postdated: "on",
        otherConditions: " Pas d'animaux ",
        clauseGKind: "LOWEST_RENT",
        clauseGAmount: "1100",
        clauseGStart: "2026-07-01",
        clauseGEnd: "2027-06-30",
        clauseGRef: "R-1",
        clauseF: "yes",
        clauseFMax: "1300",
        acknowledged: ["a.b", "c.d"],
      }),
    );
    expect(parsed).toEqual({
      ok: true,
      body: {
        termKind: "FIXED",
        startDate: "2027-07-01",
        endDate: "2028-06-30",
        rentCents: 120050,
        dueDay: "1",
        firstPaymentDate: "2027-07-01",
        firstPaymentCents: 120050,
        acceptedPaymentMethods: ["INTERAC", "CHEQUE"],
        postdatedChequesRequired: true,
        otherConditions: "Pas d'animaux",
        clauseG: {
          kind: "LOWEST_RENT",
          amountCents: 110000,
          periodStart: "2026-07-01",
          periodEnd: "2027-06-30",
          talDecisionRef: "R-1",
        },
        clauseF: { applies: true, maxRentCents: 130000 },
        acknowledgedWarnings: ["a.b", "c.d"],
      },
    });
  });

  it("drops the end date of an indeterminate term, and clauses left empty", () => {
    const parsed = parseTermsForm(form({ ...BASE, termKind: "INDETERMINATE", clauseF: "no", firstPayment: "0" }));
    expect(parsed).toMatchObject({ ok: true });
    if (parsed.ok) {
      expect(parsed.body.endDate).toBeUndefined();
      expect(parsed.body.clauseG).toBeUndefined();
      expect(parsed.body.clauseF).toEqual({ applies: false });
      expect(parsed.body.firstPaymentCents).toBe(0);
    }
    const notLeased = parseTermsForm(form({ ...BASE, clauseGKind: "NOT_LEASED" }));
    expect(notLeased).toMatchObject({ ok: true, body: { clauseG: { kind: "NOT_LEASED" } } });
    const unknown = parseTermsForm(form({ ...BASE, termKind: "X" }));
    expect(unknown).toMatchObject({ ok: true, body: { termKind: "FIXED" } });
  });

  it("reads zero dollars as zero and refuses junk", () => {
    expect(dollarsToCentsOrZero("0")).toBe(0);
    expect(dollarsToCentsOrZero("00")).toBe(0);
    expect(dollarsToCentsOrZero("12,5")).toBe(1250);
    expect(dollarsToCentsOrZero("x")).toBeUndefined();
  });

  it("names what is wrong", () => {
    expect(parseTermsForm(form({ ...BASE, startDate: "demain" }))).toEqual({ ok: false, reason: "dates" });
    expect(parseTermsForm(form({ ...BASE, endDate: "x" }))).toEqual({ ok: false, reason: "dates" });
    expect(parseTermsForm(form({ ...BASE, rent: "abc" }))).toEqual({ ok: false, reason: "rent" });
    expect(parseTermsForm(form({ ...BASE, firstPayment: "abc" }))).toEqual({ ok: false, reason: "rent" });
    expect(parseTermsForm(form({ ...BASE, dueDay: "31" }))).toEqual({ ok: false, reason: "rent" });
    expect(parseTermsForm(form({ ...BASE, methods: [] }))).toEqual({ ok: false, reason: "payment" });
    expect(parseTermsForm(form({ ...BASE, clauseGKind: "WHAT" }))).toEqual({ ok: false, reason: "clauseG" });
    expect(parseTermsForm(form({ ...BASE, clauseGKind: "LOWEST_RENT", clauseGAmount: "x" }))).toEqual({
      ok: false,
      reason: "clauseG",
    });
    expect(parseTermsForm(form({ ...BASE, clauseGKind: "LOWEST_RENT", clauseGStart: "x" }))).toEqual({
      ok: false,
      reason: "clauseG",
    });
    expect(parseTermsForm(form({ ...BASE, clauseGKind: "LOWEST_RENT", clauseGEnd: "x" }))).toEqual({
      ok: false,
      reason: "clauseG",
    });
    expect(parseTermsForm(form({ ...BASE, clauseF: "yes", clauseFMax: "x" }))).toEqual({
      ok: false,
      reason: "clauseF",
    });
  });
});

describe("lease terms service, actions and preview (FR-LEASE-01)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves the terms, cancels, and explains refusals", async () => {
    const service = await import("@/features/leases/server/leases.service");
    const fetcher = answer(200, LEASE);
    vi.stubGlobal("fetch", fetcher);
    expect(await service.saveTerms(ID, form(BASE), "fr-CA")).toEqual({ status: "done", leaseId: ID });
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain(`/actions/set-lease-terms/${ID}`);
    expect(await service.saveTerms("x", form(BASE), "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await service.saveTerms(ID, form({ ...BASE, methods: [] }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "payment",
    });
    expect(await service.cancelLease(ID, "fr-CA")).toEqual({ status: "done", leaseId: ID });
    expect(await service.cancelLease("x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    vi.stubGlobal("fetch", answer(422, { code: "lease.overlap" }));
    expect(await service.saveTerms(ID, form(BASE), "fr-CA")).toMatchObject({ status: "refused", reason: "overlap" });
  });

  it("proposes clause G only with a year of history", async () => {
    const service = await import("@/features/leases/server/leases.service");
    vi.stubGlobal(
      "fetch",
      answer(200, { amountCents: 110000, periodStart: "2026-07-01", periodEnd: "2027-06-30", monthsOfHistory: 12 }),
    );
    expect(await service.fetchClauseGProposal(ID, "fr-CA")).toEqual({
      status: "proposal",
      amountCents: 110000,
      periodStart: "2026-07-01",
      periodEnd: "2027-06-30",
    });
    vi.stubGlobal("fetch", answer(200, { amountCents: 110000, monthsOfHistory: 12 }));
    expect(await service.fetchClauseGProposal(ID, "fr-CA")).toMatchObject({ periodStart: undefined });
    vi.stubGlobal("fetch", answer(200, { monthsOfHistory: 3 }));
    expect(await service.fetchClauseGProposal(ID, "fr-CA")).toEqual({ status: "none", monthsOfHistory: 3 });
    expect(await service.fetchClauseGProposal("x", "fr-CA")).toEqual({ status: "invalid" });
  });

  it("the actions revalidate once the terms are saved or the lease cancelled", async () => {
    const actions = await import("@/features/leases/server/leases.actions");
    vi.stubGlobal("fetch", answer(200, LEASE));
    expect(await actions.saveTermsAction(ID, undefined, form(BASE))).toMatchObject({ status: "done" });
    expect(await actions.cancelLeaseAction(ID)).toMatchObject({ status: "done" });
    expect(revalidatePath).toHaveBeenCalled();
    vi.stubGlobal("fetch", answer(200, { monthsOfHistory: 0 }));
    expect(await actions.clauseGProposalAction(ID)).toEqual({ status: "none", monthsOfHistory: 0 });
  });

  it("serves the draft preview as a never-cached PDF", async () => {
    const { fetchLeasePreview } = await import("@/features/leases/server/leases.preview");
    const pdf = vi.fn(async () => new Response("%PDF-1.4", { status: 200 }));
    const ok = await fetchLeasePreview(new URLSearchParams({ leaseId: ID }), pdf);
    expect(ok.headers.get("content-type")).toBe("application/pdf");
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(await ok.text()).toBe("%PDF-1.4");
    expect((await fetchLeasePreview(new URLSearchParams({ leaseId: "x" }), pdf)).status).toBe(404);
    expect((await fetchLeasePreview(new URLSearchParams(), pdf)).status).toBe(404);
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    expect((await fetchLeasePreview(new URLSearchParams({ leaseId: ID }), missing)).status).toBe(404);
    const down = vi.fn(async () => new Response(null, { status: 500 }));
    expect((await fetchLeasePreview(new URLSearchParams({ leaseId: ID }), down)).status).toBe(502);
  });

  it("serves nothing when no BFF is configured", async () => {
    vi.stubEnv("ESCALIA_BFF_URL", "");
    const { fetchLeasePreview } = await import("@/features/leases/server/leases.preview");
    const pdf = vi.fn(async () => new Response("%PDF-1.4", { status: 200 }));
    expect((await fetchLeasePreview(new URLSearchParams({ leaseId: ID }), pdf)).status).toBe(404);
  });

  it("has a route that hands the query on", async () => {
    vi.stubGlobal("fetch", answer(200, {}));
    const route = await import("@/app/api/bff/leases/preview/route");
    const response = await route.GET(new Request(`http://localhost/api/bff/leases/preview?leaseId=${ID}`));
    expect(response.status).toBe(200);
  });
});

describe("lease language (FR-LEASE-02)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  const language = {
    requested: true,
    bindingLanguage: "fr",
    translationProvided: true,
    statementVersion: "2026-11",
    choices: [{ personId: ID, legalName: "Alex", role: "TENANT", choice: "en", chosenAt: "2027-01-01T00:00:00Z" }],
  };
  const mine = { requested: true, open: true, bindingLanguage: "fr", statementVersion: "2026-11", myChoice: "en" };

  it("reads the language of a lease for the landlord and for the party", async () => {
    const service = await import("@/features/leases/server/leases.service");
    vi.stubGlobal("fetch", answer(200, language));
    expect((await service.fetchLeaseLanguage(ID, "fr-CA")).choices).toHaveLength(1);
    vi.stubGlobal("fetch", answer(200, mine));
    expect((await service.fetchTenantLanguage(ID, "fr-CA")).myChoice).toBe("en");
  });

  it("asks for English, and explains a refusal", async () => {
    const service = await import("@/features/leases/server/leases.service");
    vi.stubGlobal("fetch", answer(200, language));
    expect(await service.requestEnglish(ID, "fr-CA")).toEqual({ status: "done", leaseId: ID });
    expect(await service.requestEnglish("x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    vi.stubGlobal("fetch", answer(422, { code: "lease.language.closed" }));
    expect(await service.requestEnglish(ID, "fr-CA")).toMatchObject({ status: "refused", reason: "languageClosed" });
  });

  it("sends only fr or en as the party's choice", async () => {
    const service = await import("@/features/leases/server/leases.service");
    const fetcher = answer(200, mine);
    vi.stubGlobal("fetch", fetcher);
    expect(await service.chooseLanguage(ID, "en", "fr-CA")).toMatchObject({
      status: "chosen",
      state: { myChoice: "en" },
    });
    expect(JSON.parse(String((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({
      choice: "en",
    });
    expect(await service.chooseLanguage(ID, "de", "fr-CA")).toEqual({ status: "invalid" });
    expect(await service.chooseLanguage("x", "fr", "fr-CA")).toEqual({ status: "invalid" });
    vi.stubGlobal("fetch", answer(200, { odd: true }));
    expect(await service.chooseLanguage(ID, "fr", "fr-CA")).toEqual({ status: "chosen", state: undefined });
    vi.stubGlobal("fetch", answer(403, { code: "lease.language.own_choice_only" }));
    expect(await service.chooseLanguage(ID, "en", "fr-CA")).toMatchObject({
      status: "refused",
      reason: "ownChoiceOnly",
    });
  });

  it("the actions revalidate only when something changed", async () => {
    const actions = await import("@/features/leases/server/leases.actions");
    vi.stubGlobal("fetch", answer(200, language));
    await actions.requestEnglishAction(ID);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    vi.stubGlobal("fetch", answer(200, mine));
    await actions.chooseLanguageAction(ID, "en");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    vi.stubGlobal("fetch", answer(422, { code: "lease.language.closed" }));
    await actions.requestEnglishAction(ID);
    await actions.chooseLanguageAction(ID, "en");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });
});
