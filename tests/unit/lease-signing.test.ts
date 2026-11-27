import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseHandDate, signingPath, type TenantSigning } from "@/features/leases/schemas/signing.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const PERSON = "0197a000-0000-7000-8000-000000000002";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const SIGNING = {
  sent: true,
  requestId: ID,
  state: "OPEN",
  signers: [{ personId: PERSON, name: "Alex Roy", role: "TENANT", order: 1, state: "INVITED" }],
  copies: [],
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

describe("signing schema (FR-LEASE-04)", () => {
  it("offers the way to sign only while it is the party's turn", () => {
    const base: TenantSigning = { requestId: ID, state: "OPEN", myState: "INVITED", signers: [] };
    expect(signingPath(base)).toBe(`/sign/${ID}`);
    expect(signingPath({ ...base, myState: "WAITING" })).toBeUndefined();
    expect(signingPath({ ...base, state: "WITHDRAWN" })).toBeUndefined();
    expect(signingPath({ ...base, requestId: null })).toBeUndefined();
  });

  it("types the hand delivery date", () => {
    expect(parseHandDate(form({ date: " 2027-01-12 " }))).toBe("2027-01-12");
    expect(parseHandDate(form({ date: "12/01/2027" }))).toBeUndefined();
    expect(parseHandDate(new FormData())).toBeUndefined();
  });
});

describe("signing service and actions (FR-LEASE-04)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the state for the landlord and for a party", async () => {
    const service = await import("@/features/leases/server/signing.service");
    vi.stubGlobal("fetch", answer(200, SIGNING));
    expect((await service.fetchLeaseSigning(ID, "fr-CA")).signers).toHaveLength(1);
    vi.stubGlobal("fetch", answer(200, { requestId: ID, state: "OPEN", myState: "INVITED", signers: [] }));
    expect((await service.fetchTenantSigning(ID, "fr-CA")).myState).toBe("INVITED");
  });

  it("sends and withdraws, and explains a refusal", async () => {
    const service = await import("@/features/leases/server/signing.service");
    const fetcher = answer(200, SIGNING);
    vi.stubGlobal("fetch", fetcher);
    expect(await service.sendForSignature(ID, "fr-CA")).toMatchObject({ status: "done", signing: { sent: true } });
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain(`/actions/send-lease-for-signature/${ID}`);
    expect(await service.withdrawSigning(ID, "fr-CA")).toMatchObject({ status: "done" });
    expect(String((fetcher.mock.calls[1] as unknown[])[0])).toContain(`/actions/withdraw-lease-signing/${ID}`);
    expect(await service.sendForSignature("x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await service.withdrawSigning("x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    vi.stubGlobal("fetch", answer(200, { odd: true }));
    expect(await service.sendForSignature(ID, "fr-CA")).toEqual({ status: "done", signing: undefined });
    vi.stubGlobal("fetch", answer(422, { code: "lease.signing.not_ready" }));
    expect(await service.sendForSignature(ID, "fr-CA")).toMatchObject({ status: "refused", reason: "signingNotReady" });
    vi.stubGlobal("fetch", answer(422, { code: "other", detail: "Non" }));
    expect(await service.withdrawSigning(ID, "fr-CA")).toMatchObject({
      status: "refused",
      reason: undefined,
      message: "Non",
    });
  });

  it("records a copy handed over", async () => {
    const service = await import("@/features/leases/server/signing.service");
    const fetcher = answer(200, SIGNING);
    vi.stubGlobal("fetch", fetcher);
    expect(await service.recordHandDelivery(ID, PERSON, form({ date: "2027-01-12" }), "fr-CA")).toMatchObject({
      status: "done",
    });
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain(`/actions/record-hand-delivery/${ID}/${PERSON}`);
    expect(await service.recordHandDelivery("x", PERSON, form({ date: "2027-01-12" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "id",
    });
    expect(await service.recordHandDelivery(ID, "x", form({ date: "2027-01-12" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "id",
    });
    expect(await service.recordHandDelivery(ID, PERSON, form({ date: "demain" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "date",
    });
  });

  it("the actions revalidate only when something changed", async () => {
    const actions = await import("@/features/leases/server/signing.actions");
    vi.stubGlobal("fetch", answer(200, SIGNING));
    await actions.sendForSignatureAction(ID);
    await actions.withdrawSigningAction(ID);
    await actions.recordHandDeliveryAction(ID, PERSON, form({ date: "2027-01-12" }));
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    vi.stubGlobal("fetch", answer(422, { code: "lease.signing.not_open" }));
    await actions.withdrawSigningAction(ID);
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });
});
