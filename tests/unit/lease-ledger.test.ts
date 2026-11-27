import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  correctable,
  type LedgerEntry,
  openCharges,
  parseEntry,
  parsePayment,
  parseReason,
  pick,
  validKey,
} from "@/features/leases/schemas/ledger.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const ENTRY = "0197a000-0000-7000-8000-000000000002";
const KEY = "key-0001-ledger";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

const LINE: LedgerEntry = {
  id: ENTRY,
  type: "RENT_CHARGE",
  effectiveOn: "2027-01-01",
  postedAt: "2027-01-01T12:00:00Z",
  description: { fr: "Loyer de janvier 2027", en: "Rent for January 2027" },
  chargeCents: 100000,
  paymentCents: 0,
  balanceCents: 100000,
  reversed: false,
  openCents: 100000,
};
const LEDGER = {
  leaseId: ID,
  balanceCents: 100000,
  creditCents: 0,
  blocked: false,
  ageing: { currentCents: 0, days1to7Cents: 0, days8to21Cents: 0, days22PlusCents: 100000 },
  entries: [LINE],
};

describe("ledger schema (FR-LEDG-01)", () => {
  it("picks the words of the page's language", () => {
    expect(pick(LINE.description, "fr-CA")).toBe("Loyer de janvier 2027");
    expect(pick(LINE.description, "en-CA")).toBe("Rent for January 2027");
  });

  it("accepts a key of 8 to 80 characters only", () => {
    expect(validKey("12345678")).toBe(true);
    expect(validKey("1234567")).toBe(false);
    expect(validKey("x".repeat(81))).toBe(false);
  });

  it("types a payment in dollars, with its method, note and the charge to pay first", () => {
    const base = { date: "2027-01-12", amount: "1 500,50".replace(" ", ""), method: "CHEQUE" };
    expect(parsePayment(form({ ...base, note: " chèque 12 ", designated: ENTRY }))).toEqual({
      ok: true,
      body: {
        date: "2027-01-12",
        amountCents: 150050,
        method: "CHEQUE",
        note: "chèque 12",
        designatedEntryId: ENTRY,
      },
    });
    expect(parsePayment(form({ ...base, designated: "not-an-id" }))).toEqual({
      ok: true,
      body: { date: "2027-01-12", amountCents: 150050, method: "CHEQUE" },
    });
    expect(parsePayment(form({ ...base, date: "12/01/2027" }))).toEqual({ ok: false, reason: "date" });
    expect(parsePayment(form({ ...base, amount: "0" }))).toEqual({ ok: false, reason: "amount" });
    expect(parsePayment(form({ ...base, method: "BITCOIN" }))).toEqual({ ok: false, reason: "method" });
    expect(parsePayment(new FormData())).toEqual({ ok: false, reason: "date" });
  });

  it("types an entry by hand: type, day, dollars and a reason of at most 200 characters", () => {
    const base = { type: "OTHER_CHARGE", date: "2027-01-12", amount: "50", reason: " Clé perdue " };
    expect(parseEntry(form(base))).toEqual({
      ok: true,
      body: { type: "OTHER_CHARGE", effectiveOn: "2027-01-12", amountCents: 5000, reason: "Clé perdue" },
    });
    expect(parseEntry(form({ ...base, type: "RENT_CHARGE" }))).toEqual({ ok: false, reason: "type" });
    expect(parseEntry(form({ ...base, date: "demain" }))).toEqual({ ok: false, reason: "date" });
    expect(parseEntry(form({ ...base, amount: "abc" }))).toEqual({ ok: false, reason: "amount" });
    expect(parseEntry(form({ ...base, reason: "  " }))).toEqual({ ok: false, reason: "reason" });
    expect(parseEntry(form({ ...base, reason: "x".repeat(201) }))).toEqual({ ok: false, reason: "reason" });
    expect(parseEntry(new FormData())).toEqual({ ok: false, reason: "type" });
  });

  it("types the reason for a correction", () => {
    expect(parseReason(form({ reason: " Erreur " }))).toBe("Erreur");
    expect(parseReason(form({ reason: "" }))).toBeUndefined();
    expect(parseReason(form({ reason: "x".repeat(201) }))).toBeUndefined();
    expect(parseReason(new FormData())).toBeUndefined();
  });

  it("offers to pay first the charges with something left, and to correct what is not yet corrected", () => {
    const paid = { ...LINE, id: "p", openCents: 0 };
    const corrected = { ...LINE, id: "c", reversed: true };
    const payment = { ...LINE, id: "m", chargeCents: 0, paymentCents: 5, type: "PAYMENT" as const };
    const noOpen = { ...LINE, id: "n", openCents: null };
    expect(openCharges([LINE, paid, corrected, payment, noOpen]).map((one) => one.id)).toEqual([ENTRY]);
    expect(correctable(LINE)).toBe(true);
    expect(correctable(corrected)).toBe(false);
    expect(correctable({ ...LINE, type: "REVERSAL" })).toBe(false);
    expect(correctable({ ...LINE, type: "CREDIT_APPLICATION" })).toBe(false);
  });
});

describe("ledger service and actions (FR-LEDG-01)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the ledger for the landlord and for a party", async () => {
    const service = await import("@/features/leases/server/ledger.service");
    vi.stubGlobal("fetch", answer(200, LEDGER));
    expect((await service.fetchLeaseLedger(ID, "fr-CA")).balanceCents).toBe(100000);
    vi.stubGlobal("fetch", answer(200, { leaseId: ID, role: "TENANT", balanceCents: 5, creditCents: 0, entries: [] }));
    expect((await service.fetchTenantLedger(ID, "fr-CA")).role).toBe("TENANT");
  });

  it("records a payment with its key, adds an entry and corrects one", async () => {
    const service = await import("@/features/leases/server/ledger.service");
    const fetcher = answer(201, LEDGER);
    vi.stubGlobal("fetch", fetcher);

    expect(
      await service.recordPayment(ID, KEY, form({ date: "2027-01-12", amount: "100", method: "INTERAC" }), "fr-CA"),
    ).toMatchObject({ status: "done", ledger: { balanceCents: 100000 } });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(`http://bff.test/actions/record-payment/${ID}`);
    expect(init.headers).toMatchObject({ "idempotency-key": KEY });
    expect(JSON.parse(String(init.body))).toEqual({ date: "2027-01-12", amountCents: 10000, method: "INTERAC" });

    expect(
      await service.addEntry(
        ID,
        KEY,
        form({ type: "CREDIT", date: "2027-01-12", amount: "5", reason: "Rabais" }),
        "fr-CA",
      ),
    ).toMatchObject({ status: "done" });
    expect(String((fetcher.mock.calls[1] as unknown[])[0])).toContain(`/actions/add-ledger-entry/${ID}`);

    expect(await service.reverseEntry(ID, ENTRY, KEY, form({ reason: "Erreur" }), "fr-CA")).toMatchObject({
      status: "done",
    });
    expect(String((fetcher.mock.calls[2] as unknown[])[0])).toContain(`/actions/reverse-ledger-entry/${ID}/${ENTRY}`);
  });

  it("answers done without a ledger when the core's answer has an unexpected shape", async () => {
    const service = await import("@/features/leases/server/ledger.service");
    vi.stubGlobal("fetch", answer(200, { nope: true }));
    expect(await service.reverseEntry(ID, ENTRY, KEY, form({ reason: "Erreur" }), "fr-CA")).toEqual({
      status: "done",
      ledger: undefined,
    });
  });

  it("refuses an invalid request before calling the BFF", async () => {
    const service = await import("@/features/leases/server/ledger.service");
    const fetcher = answer(200, LEDGER);
    vi.stubGlobal("fetch", fetcher);
    const pay = form({ date: "2027-01-12", amount: "100", method: "INTERAC" });
    const entry = form({ type: "CREDIT", date: "2027-01-12", amount: "5", reason: "Rabais" });

    expect(await service.recordPayment("x", KEY, pay, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await service.recordPayment(ID, "short", pay, "fr-CA")).toEqual({ status: "invalid", reason: "key" });
    expect(await service.recordPayment(ID, KEY, form({}), "fr-CA")).toEqual({ status: "invalid", reason: "date" });
    expect(await service.addEntry("x", KEY, entry, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await service.addEntry(ID, "short", entry, "fr-CA")).toEqual({ status: "invalid", reason: "key" });
    expect(await service.addEntry(ID, KEY, form({}), "fr-CA")).toEqual({ status: "invalid", reason: "type" });
    expect(await service.reverseEntry("x", ENTRY, KEY, form({ reason: "a" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "id",
    });
    expect(await service.reverseEntry(ID, "x", KEY, form({ reason: "a" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "id",
    });
    expect(await service.reverseEntry(ID, ENTRY, "short", form({ reason: "a" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "key",
    });
    expect(await service.reverseEntry(ID, ENTRY, KEY, form({}), "fr-CA")).toEqual({
      status: "invalid",
      reason: "reason",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("explains a refusal with our words when we have them and the core's otherwise", async () => {
    const service = await import("@/features/leases/server/ledger.service");
    const reason = form({ reason: "Erreur" });
    vi.stubGlobal("fetch", answer(422, { code: "ledger.entry.paid", detail: "x" }));
    expect(await service.reverseEntry(ID, ENTRY, KEY, reason, "fr-CA")).toEqual({
      status: "refused",
      reason: "entryPaid",
      message: "x",
    });
    vi.stubGlobal("fetch", answer(422, { code: "ledger.late_fee.allowed", detail: "Frais de retard refusés." }));
    expect(await service.reverseEntry(ID, ENTRY, KEY, reason, "fr-CA")).toEqual({
      status: "refused",
      reason: undefined,
      message: "Frais de retard refusés.",
    });
  });

  it("refreshes the lease page after a change and not after a refusal", async () => {
    const actions = await import("@/features/leases/server/ledger.actions");
    vi.stubGlobal("fetch", answer(201, LEDGER));
    await actions.recordPaymentAction(ID, KEY, form({ date: "2027-01-12", amount: "100", method: "CASH" }));
    await actions.addEntryAction(ID, KEY, form({ type: "CREDIT", date: "2027-01-12", amount: "5", reason: "Rabais" }));
    await actions.reverseEntryAction(ID, ENTRY, KEY, form({ reason: "Erreur" }));
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(revalidatePath).toHaveBeenCalledWith("/leases/[leaseId]", "page");

    revalidatePath.mockClear();
    vi.stubGlobal("fetch", answer(422, { code: "ledger.blocked" }));
    await actions.recordPaymentAction(ID, KEY, form({ date: "2027-01-12", amount: "100", method: "CASH" }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("ledger CSV (FR-LEDG-01 section 3)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("serves the landlord's and the tenant's CSV as a never-cached download", async () => {
    const { fetchLedgerCsv } = await import("@/features/leases/server/ledger.csv");
    const csv = vi.fn(async () => new Response("date,description_fr\r\n", { status: 200 }));

    const landlord = await fetchLedgerCsv(new URLSearchParams({ leaseId: ID }), csv);
    expect(landlord.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(landlord.headers.get("cache-control")).toBe("no-store");
    expect(landlord.headers.get("content-disposition")).toBe('attachment; filename="ledger-0197a000.csv"');
    expect(await landlord.text()).toBe("date,description_fr\r\n");
    expect(String((csv.mock.calls[0] as unknown[])[0])).toBe(`http://bff.test/pages/leases/${ID}/ledger.csv`);

    await fetchLedgerCsv(new URLSearchParams({ leaseId: ID, as: "tenant" }), csv);
    expect(String((csv.mock.calls[1] as unknown[])[0])).toBe(`http://bff.test/pages/tenant/leases/${ID}/ledger.csv`);
  });

  it("keeps 403 and 404, hides every other failure behind 502, and refuses a bad id", async () => {
    const { fetchLedgerCsv } = await import("@/features/leases/server/ledger.csv");
    const status = (code: number) => vi.fn(async () => new Response(null, { status: code }));

    expect((await fetchLedgerCsv(new URLSearchParams({ leaseId: ID }), status(403))).status).toBe(403);
    expect((await fetchLedgerCsv(new URLSearchParams({ leaseId: ID }), status(404))).status).toBe(404);
    expect((await fetchLedgerCsv(new URLSearchParams({ leaseId: ID }), status(500))).status).toBe(502);
    expect((await fetchLedgerCsv(new URLSearchParams({ leaseId: "x" }), status(200))).status).toBe(404);
    expect((await fetchLedgerCsv(new URLSearchParams(), status(200))).status).toBe(404);
  });

  it("serves nothing when no BFF is configured", async () => {
    vi.stubEnv("ESCALIA_BFF_URL", "");
    const { fetchLedgerCsv } = await import("@/features/leases/server/ledger.csv");
    expect((await fetchLedgerCsv(new URLSearchParams({ leaseId: ID }))).status).toBe(404);
  });

  it("has a route that hands the query on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("date\r\n", { status: 200 })),
    );
    const route = await import("@/app/api/bff/ledger/csv/route");
    expect((await route.GET(new Request(`http://localhost/api/bff/ledger/csv?leaseId=${ID}`))).status).toBe(200);
  });
});
