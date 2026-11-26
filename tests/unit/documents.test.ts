import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  documentsPageSchema,
  MAX_UPLOAD_BYTES,
  parseHoldReason,
  parseUploadForm,
} from "@/features/portfolio/schemas/documents.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const DOC = "0197a000-0000-7000-8000-0000000000d1";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

function upload(extra: Record<string, string | File> = {}) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([1, 2, 3])], "plan.pdf", { type: "application/pdf" }));
  form.set("category", "BUILDING_RECORDS");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

describe("documents form parsing (FR-DOC-01)", () => {
  it("builds the multipart body the BFF expects", () => {
    const parsed = parseUploadForm("UNIT", ID, upload({ title: "  Plan  " }));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.form.get("subjectType")).toBe("UNIT");
      expect(parsed.form.get("subjectId")).toBe(ID);
      expect(parsed.form.get("title")).toBe("Plan");
    }
    const untitled = parseUploadForm("UNIT", ID, upload());
    expect(untitled.ok && untitled.form.has("title")).toBe(false);
  });

  it("refuses a missing, empty or oversized file and an unknown category", () => {
    const none = new FormData();
    expect(parseUploadForm("UNIT", ID, none)).toEqual({ ok: false, reason: "file" });
    expect(parseUploadForm("UNIT", ID, upload({ file: new File([], "a.pdf") }))).toEqual({
      ok: false,
      reason: "file",
    });
    const big = new File([new Uint8Array(1)], "big.pdf");
    Object.defineProperty(big, "size", { value: MAX_UPLOAD_BYTES + 1 });
    expect(parseUploadForm("UNIT", ID, upload({ file: big }))).toEqual({ ok: false, reason: "tooLarge" });
    expect(parseUploadForm("UNIT", ID, upload({ category: "NOPE" }))).toEqual({ ok: false, reason: "category" });
    const noCategory = upload();
    noCategory.delete("category");
    expect(parseUploadForm("UNIT", ID, noCategory)).toEqual({ ok: false, reason: "category" });
  });

  it("needs a reason for a hold", () => {
    const form = new FormData();
    expect(parseHoldReason(form)).toBeNull();
    form.set("reason", "   ");
    expect(parseHoldReason(form)).toBeNull();
    form.set("reason", "  Dispute ");
    expect(parseHoldReason(form)).toBe("Dispute");
  });

  it("reads the page of the BFF", () => {
    const page = {
      subjectType: "BUILDING",
      subjectId: ID,
      total: 1,
      usage: { usedBytes: 45, quotaBytes: 100, warning: false },
      items: [
        {
          id: DOC,
          category: "OTHER",
          title: "a.pdf",
          origin: "UPLOADED",
          visibility: "LANDLORD_ONLY",
          currentVersion: 1,
          sizeBytes: 45,
          createdAt: "2026-11-26T15:00:00Z",
          contentDestroyed: false,
          onLegalHold: false,
        },
      ],
      holds: [{ id: DOC, reason: "x", placedAt: "2026-11-26T15:00:00Z", expiresOn: "2029-11-26" }],
    };
    expect(documentsPageSchema.parse(page).items).toHaveLength(1);
  });
});

describe("documents server code (FR-DOC-01)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockReset();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the documents of a subject", async () => {
    const fetcher = answer(200, {
      subjectType: "UNIT",
      subjectId: ID,
      total: 0,
      usage: { usedBytes: 0, quotaBytes: 10, warning: false },
      items: [],
      holds: [],
    });
    vi.stubGlobal("fetch", fetcher);
    const { fetchDocuments } = await import("@/features/portfolio/server/documents.service");

    expect((await fetchDocuments("UNIT", ID, "fr-CA")).total).toBe(0);
    const [url] = fetcher.mock.calls[0] as unknown as [URL];
    expect(url.search).toBe(`?subjectType=UNIT&subjectId=${ID}`);
  });

  it("uploads as multipart with the CSRF token and no JSON content type", async () => {
    const fetcher = answer(201, {});
    vi.stubGlobal("fetch", fetcher);
    const { uploadDocument } = await import("@/features/portfolio/server/documents.service");

    expect(await uploadDocument("BUILDING", ID, upload(), "fr-CA")).toEqual({ status: "done" });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/actions/upload-document");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).toMatchObject({ "x-xsrf-token": "tok" });
    expect(init.headers).not.toHaveProperty("content-type");
    expect(await uploadDocument("BUILDING", "x", upload(), "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await uploadDocument("BUILDING", ID, new FormData(), "fr-CA")).toEqual({
      status: "invalid",
      reason: "file",
    });
  });

  it("shows the core's refusal of an infected file", async () => {
    vi.stubGlobal("fetch", answer(422, { code: "documents.file.infected", detail: "Refusé par l'antivirus." }));
    const { uploadDocument } = await import("@/features/portfolio/server/documents.service");

    expect(await uploadDocument("BUILDING", ID, upload(), "fr-CA")).toEqual({
      status: "refused",
      message: "Refusé par l'antivirus.",
    });
  });

  it("shares, unshares and links a document", async () => {
    const fetcher = answer(200, { url: "https://files.example/x" });
    vi.stubGlobal("fetch", fetcher);
    const { changeSharing, downloadLink } = await import("@/features/portfolio/server/documents.service");

    expect(await changeSharing(DOC, true, "fr-CA")).toEqual({ status: "done" });
    expect(await changeSharing(DOC, false, "fr-CA")).toEqual({ status: "done" });
    expect(await downloadLink(DOC, "fr-CA")).toEqual({ status: "link", url: "https://files.example/x" });
    expect(await changeSharing("x", true, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await downloadLink("x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(fetcher.mock.calls.map((call) => (call as unknown as [URL])[0].pathname)).toEqual([
      `/actions/share-document/${DOC}`,
      `/actions/unshare-document/${DOC}`,
      `/actions/document-download-url/${DOC}`,
    ]);
  });

  it("refuses a share or a link the core refuses, and an answer without a link", async () => {
    vi.stubGlobal("fetch", answer(422, { detail: "Non partageable." }));
    const { changeSharing, downloadLink } = await import("@/features/portfolio/server/documents.service");
    expect(await changeSharing(DOC, true, "fr-CA")).toEqual({ status: "refused", message: "Non partageable." });
    expect(await downloadLink(DOC, "fr-CA")).toEqual({ status: "refused", message: "Non partageable." });

    vi.resetModules();
    vi.stubGlobal("fetch", answer(200, {}));
    const again = await import("@/features/portfolio/server/documents.service");
    expect(await again.downloadLink(DOC, "fr-CA")).toEqual({ status: "refused", message: undefined });
  });

  it("places and lifts a legal hold", async () => {
    const fetcher = answer(201, {});
    vi.stubGlobal("fetch", fetcher);
    const { liftHold, placeHold } = await import("@/features/portfolio/server/documents.service");
    const reason = new FormData();
    reason.set("reason", "Dispute");

    expect(await placeHold("BUILDING", ID, reason, "fr-CA")).toEqual({ status: "done" });
    expect(JSON.parse((fetcher.mock.calls[0] as unknown as [URL, RequestInit])[1].body as string)).toEqual({
      subjectType: "BUILDING",
      subjectId: ID,
      reason: "Dispute",
    });
    expect(await placeHold("BUILDING", ID, new FormData(), "fr-CA")).toEqual({ status: "invalid", reason: "reason" });
    expect(await placeHold("BUILDING", "x", reason, "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(await liftHold(DOC, "fr-CA")).toEqual({ status: "done" });
    expect(await liftHold("x", "fr-CA")).toEqual({ status: "invalid", reason: "id" });
  });

  it("refuses a hold the core refuses", async () => {
    vi.stubGlobal("fetch", answer(404, { detail: "Sujet introuvable." }));
    const { liftHold, placeHold } = await import("@/features/portfolio/server/documents.service");
    const reason = new FormData();
    reason.set("reason", "x");
    expect(await placeHold("BUILDING", ID, reason, "fr-CA")).toEqual({
      status: "refused",
      message: "Sujet introuvable.",
    });
    expect(await liftHold(DOC, "fr-CA")).toEqual({ status: "refused", message: "Sujet introuvable." });
  });

  it("revalidates the pages after a change, not after a failure or a link", async () => {
    vi.stubGlobal("fetch", answer(200, { url: "https://files.example/x" }));
    const actions = await import("@/features/portfolio/server/documents.actions");

    expect(await actions.sharingAction(DOC, true)).toEqual({ status: "done" });
    expect(revalidatePath).toHaveBeenCalledTimes(2);
    revalidatePath.mockReset();
    expect(await actions.downloadAction(DOC)).toEqual({ status: "link", url: "https://files.example/x" });
    expect(await actions.liftHoldAction("x")).toEqual({ status: "invalid", reason: "id" });
    const form = upload();
    expect(await actions.uploadDocumentAction("UNIT", ID, undefined, form)).toEqual({ status: "done" });
    const reason = new FormData();
    reason.set("reason", "Dispute");
    expect(await actions.placeHoldAction("UNIT", ID, undefined, reason)).toEqual({ status: "done" });
    expect(revalidatePath).toHaveBeenCalledTimes(4);
  });
});
