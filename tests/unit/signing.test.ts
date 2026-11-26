import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PNG_DATA_URL,
  parseSignatureForm,
  refusalKey,
  signerViewSchema,
  verifyPageSchema,
} from "@/features/signing/schemas/signing.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-0000000000e1";
const TOKEN = "t".repeat(43);
const HASH = "a".repeat(64);
const view = {
  requestId: ID,
  title: "Bail",
  language: "fr-CA",
  purpose: "LEASE",
  mode: "PARALLEL",
  state: "OPEN",
  expiresAt: "2027-01-26T15:00:00Z",
  signerState: "INVITED",
  role: "TENANT",
  authLevel: "SESSION_OTP",
  expectedName: "Alex Roy",
  maskedEmail: "al***@example.test",
  consented: false,
  verified: false,
  sha256: HASH,
  consentVersion: "esign-2026-11",
};
const answer = (status: number, body: unknown) =>
  vi.fn(async () => new Response(status === 204 ? null : JSON.stringify(body), { status }));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("signing schemas (FR-DOC-02)", () => {
  it("reads the signer's page and the public check", () => {
    expect(signerViewSchema.parse(view).authLevel).toBe("SESSION_OTP");
    expect(verifyPageSchema.parse({ result: { found: false } }).result.found).toBe(false);
  });

  it("maps core codes to screen keys", () => {
    expect(refusalKey("signing.otp_wrong")).toBe("otpWrong");
    expect(refusalKey("signing.unknown")).toBeUndefined();
    expect(refusalKey(undefined)).toBeUndefined();
  });

  it("reads the typed name and the drawing", () => {
    expect(parseSignatureForm(form({ typedName: " Alex Roy " }))).toEqual({
      ok: true,
      body: { typedName: "Alex Roy", confirmVariation: false },
    });
    const drawing = "data:image/png;base64,iVBORw0KGgo=";
    expect(PNG_DATA_URL.test(drawing)).toBe(true);
    expect(parseSignatureForm(form({ typedName: "Alex Roy", drawing, confirmVariation: "on" }))).toEqual({
      ok: true,
      body: { typedName: "Alex Roy", confirmVariation: true, drawnPng: "iVBORw0KGgo=" },
    });
    expect(parseSignatureForm(form({ typedName: "A" }))).toEqual({ ok: false, reason: "name" });
    expect(parseSignatureForm(form({ typedName: "Alex Roy", drawing: "javascript:1" }))).toEqual({
      ok: false,
      reason: "drawing",
    });
    const huge = `data:image/png;base64,${"A".repeat(270_001)}`;
    expect(parseSignatureForm(form({ typedName: "Alex Roy", drawing: huge }))).toEqual({
      ok: false,
      reason: "drawing",
    });
    expect(parseSignatureForm(new FormData())).toEqual({ ok: false, reason: "name" });
  });
});

describe("signing service and actions", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });

  async function service() {
    return import("@/features/signing/server/signing.service");
  }

  const session = { kind: "session", requestId: ID } as const;
  const link = { kind: "link", token: TOKEN } as const;

  it("fetches the page for a session and for a link", async () => {
    const fetcher = answer(200, { request: view });
    vi.stubGlobal("fetch", fetcher);
    const { fetchSignView } = await service();

    expect((await fetchSignView(session, "fr-CA")).title).toBe("Bail");
    expect((await fetchSignView(link, "fr-CA")).title).toBe("Bail");
    const urls = fetcher.mock.calls.map((call) => String((call as unknown[])[0]));
    expect(urls[0]).toContain(`/pages/sign/${ID}`);
    expect(urls[1]).toContain(`/pages/sign/link/${TOKEN}`);
  });

  it("checks a hash only when it is a hash", async () => {
    vi.stubGlobal("fetch", answer(200, { result: { found: true, title: "Bail", signers: 2 } }));
    const { fetchVerification } = await service();

    expect(await fetchVerification("zz", "fr-CA")).toBeUndefined();
    expect((await fetchVerification(HASH.toUpperCase(), "fr-CA"))?.signers).toBe(2);
  });

  it("sends each answer to the right action", async () => {
    const fetcher = answer(204, {});
    vi.stubGlobal("fetch", fetcher);
    const s = await service();

    expect(await s.consent(session, "fr-CA")).toEqual({ status: "done" });
    expect(await s.preferPaper(link, "fr-CA")).toEqual({ status: "done" });
    expect(await s.verifyCode(session, form({ code: "123456" }), "fr-CA")).toEqual({ status: "done" });
    expect(await s.decline(link, form({ reason: "No" }), "fr-CA")).toEqual({ status: "done" });
    expect(await s.sign(session, form({ typedName: "Alex Roy" }), "fr-CA")).toEqual({ status: "done" });
    const urls = fetcher.mock.calls.map((call) => String((call as unknown[])[0]));
    expect(urls).toEqual([
      `http://bff.test/actions/signing/${ID}/consent`,
      `http://bff.test/actions/signing-link/${TOKEN}/paper`,
      `http://bff.test/actions/signing/${ID}/verify-otp`,
      `http://bff.test/actions/signing-link/${TOKEN}/decline`,
      `http://bff.test/actions/signing/${ID}/sign`,
    ]);
  });

  it("refuses bad input before calling the BFF", async () => {
    const fetcher = answer(204, {});
    vi.stubGlobal("fetch", fetcher);
    const s = await service();
    const bad = { kind: "session", requestId: "x" } as const;
    const badLink = { kind: "link", token: "x" } as const;

    expect(await s.consent(bad, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await s.sendCode(badLink, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await s.verifyCode(session, form({ code: "12" }), "fr-CA")).toEqual({ status: "invalid", reason: "code" });
    expect(await s.decline(session, form({ reason: " " }), "fr-CA")).toEqual({ status: "invalid", reason: "reason" });
    expect(await s.decline(session, form({ reason: "x".repeat(501) }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "reason",
    });
    expect(await s.sign(session, form({ typedName: "" }), "fr-CA")).toEqual({ status: "invalid", reason: "name" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("explains the core's refusal and the masked address of a sent code", async () => {
    const s = await service();
    vi.stubGlobal("fetch", answer(422, { code: "signing.otp_wrong", detail: "Invalid" }));
    expect(await s.consent(session, "fr-CA")).toEqual({ status: "refused", reason: "otpWrong", message: "Invalid" });
    expect(await s.sendCode(session, "fr-CA")).toEqual({ status: "refused", reason: "otpWrong", message: "Invalid" });

    vi.stubGlobal("fetch", answer(200, { maskedEmail: "al***@example.test" }));
    expect(await s.sendCode(link, "fr-CA")).toEqual({ status: "sent", maskedEmail: "al***@example.test" });
    vi.stubGlobal("fetch", answer(200, {}));
    expect(await s.sendCode(link, "fr-CA")).toEqual({ status: "sent", maskedEmail: "" });
  });

  it("refreshes the page after an answer", async () => {
    vi.stubGlobal("fetch", answer(204, {}));
    const actions = await import("@/features/signing/server/signing.actions");
    const session = { kind: "session", requestId: ID } as const;
    const link = { kind: "link", token: TOKEN } as const;

    await actions.consentAction(session);
    expect(revalidatePath).toHaveBeenLastCalledWith("/sign/[requestId]", "page");
    await actions.preferPaperAction(link);
    expect(revalidatePath).toHaveBeenLastCalledWith("/sign/link/[token]", "page");
    await actions.verifyCodeAction(session, form({ code: "123456" }));
    await actions.declineAction(link, form({ reason: "No" }));
    await actions.signAction(session, form({ typedName: "Alex Roy" }));
    vi.stubGlobal("fetch", answer(200, { maskedEmail: "a***@b.test" }));
    await actions.sendCodeAction(session);
    revalidatePath.mockClear();
    vi.stubGlobal("fetch", answer(422, { code: "signing.closed" }));
    await actions.consentAction(session);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers a hash check, and a failure as a failed check", async () => {
    const verify = await import("@/features/signing/server/verify.actions");
    vi.stubGlobal("fetch", answer(200, { result: { found: true, title: "Bail", signers: 1 } }));
    expect((await verify.checkHashAction(HASH)).status).toBe("checked");
    expect((await verify.checkHashAction("nope")).status).toBe("failed");
    vi.stubGlobal("fetch", answer(500, {}));
    expect((await verify.checkHashAction(HASH)).status).toBe("failed");
  });

  it("serves the document of a request or a link, and nothing else", async () => {
    const { fetchSignDocument } = await import("@/features/signing/server/signing.document");
    const pdf = vi.fn(async () => new Response("%PDF-1.4", { status: 200 }));

    const byId = await fetchSignDocument(new URLSearchParams({ requestId: ID }), pdf);
    expect(byId.headers.get("content-type")).toBe("application/pdf");
    expect(await byId.text()).toBe("%PDF-1.4");
    await fetchSignDocument(new URLSearchParams({ token: TOKEN }), pdf);
    expect(String((pdf.mock.calls[1] as unknown[])[0])).toContain(`/pages/sign/link/${TOKEN}/document`);
    expect((await fetchSignDocument(new URLSearchParams({ requestId: "x" }), pdf)).status).toBe(404);
    expect((await fetchSignDocument(new URLSearchParams(), pdf)).status).toBe(404);
    expect((await fetchSignDocument(new URLSearchParams({ token: "x" }), pdf)).status).toBe(404);
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    expect((await fetchSignDocument(new URLSearchParams({ requestId: ID }), missing)).status).toBe(404);
    const down = vi.fn(async () => new Response(null, { status: 500 }));
    expect((await fetchSignDocument(new URLSearchParams({ requestId: ID }), down)).status).toBe(502);
  });

  it("has a route that hands the query on", async () => {
    vi.stubGlobal("fetch", answer(200, {}));
    const route = await import("@/app/api/bff/signing/document/route");
    const response = await route.GET(new Request(`http://localhost/api/bff/signing/document?requestId=${ID}`));
    expect(response.status).toBe(200);
  });
});
