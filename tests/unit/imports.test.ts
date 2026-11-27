import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  baseField,
  decodeCsv,
  importRefusalKey,
  parseMapping,
  parseUpload,
  rowErrorKey,
  tenantField,
} from "@/features/imports/schemas/imports.schema";

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
const COUNTS = { total: 2, valid: 1, invalid: 1, duplicate: 0, imported: 0, failed: 0 };
const JOB = {
  id: ID,
  fileName: "parc.csv",
  status: "VALIDATED",
  headers: ["Adresse"],
  mapping: { Adresse: "address" },
  fields: ["address"],
  required: ["address"],
  counts: COUNTS,
  rows: [{ rowNumber: 1, status: "VALID", errors: {} }],
  createdAt: "2027-01-01T10:00:00Z",
};
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

function upload(content: BlobPart, name = "parc.csv") {
  const data = new FormData();
  data.append("file", new File([content], name, { type: "text/csv" }));
  return data;
}

describe("reading a CSV file", () => {
  it("decodes UTF-8, and Windows-1252 when the bytes are not valid UTF-8", () => {
    expect(decodeCsv(new TextEncoder().encode("Montréal").buffer as ArrayBuffer)).toBe("Montréal");
    expect(decodeCsv(new Uint8Array([0x4d, 0xe9]).buffer as ArrayBuffer)).toBe("Mé");
  });

  it("takes the file as typed, refuses no file and a file that is too large", async () => {
    expect(await parseUpload(upload("a;b\n1;2"))).toEqual({
      ok: true,
      body: { fileName: "parc.csv", content: "a;b\n1;2" },
    });
    expect(await parseUpload(new FormData())).toEqual({ ok: false, reason: "file" });
    expect(await parseUpload(upload(""))).toEqual({ ok: false, reason: "file" });
    expect(await parseUpload(upload("x".repeat(2_000_001)))).toEqual({ ok: false, reason: "size" });
  });

  it("sends an Excel file as base64, and refuses one whose base64 is too large", async () => {
    expect(await parseUpload(upload("abc", "parc.XLSX"))).toEqual({
      ok: true,
      body: { fileName: "parc.XLSX", content: "YWJj", base64: true },
    });
    expect(await parseUpload(upload("abc", "bail.pdf"))).toEqual({
      ok: true,
      body: { fileName: "bail.pdf", content: "YWJj", base64: true },
    });
    expect(await parseUpload(upload("x".repeat(1_600_000), "parc.xlsx"))).toEqual({ ok: false, reason: "size" });
  });

  it("keeps the columns that were given a field and ignores the others", () => {
    const form = new FormData();
    form.append("map:Adresse", "address");
    form.append("map:Note", "");
    form.append("other", "x");
    form.append("map:File", new File(["x"], "x.txt"));
    expect(parseMapping(form)).toEqual({ Adresse: "address" });
  });

  it("names the refusals, the cell errors and the fields", () => {
    expect(importRefusalKey("imports.file.too_big")).toBe("tooBig");
    expect(importRefusalKey("nope")).toBeUndefined();
    expect(importRefusalKey(undefined)).toBeUndefined();
    expect(rowErrorKey("imports.row.date")).toBe("date");
    expect(rowErrorKey("portfolio.province.unsupported")).toBe("other");
    expect(tenantField("tenant_2_email")).toEqual({ n: 2, part: "email" });
    expect(tenantField("rent")).toBeUndefined();
    expect(baseField("rent")).toBe("rent");
    expect(baseField("tenant_1_name")).toBeUndefined();
  });
});

describe("imports through the BFF", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
    revalidatePath.mockReset();
    redirect.mockReset();
  });

  it("reads the list of imports and one import", async () => {
    const { fetchImport, fetchImports } = await import("@/features/imports/server/imports.service");
    vi.stubGlobal(
      "fetch",
      answer(200, { items: [{ id: ID, fileName: "a.csv", status: "DONE", counts: COUNTS, createdAt: "2027-01-01" }] }),
    );
    expect((await fetchImports("fr-CA")).items).toHaveLength(1);
    vi.stubGlobal("fetch", answer(200, JOB));
    expect((await fetchImport(ID, "fr-CA")).rows).toHaveLength(1);
  });

  it("uploads a file and opens the import, or says what is wrong with the file", async () => {
    const { uploadImportAction } = await import("@/features/imports/server/imports.actions");
    vi.stubGlobal("fetch", answer(201, JOB));

    const done = await uploadImportAction(undefined, upload("a\n1"));

    expect(done.status).toBe("done");
    expect(redirect).toHaveBeenCalledWith({ href: `/imports/${ID}`, locale: "fr-CA" });
    redirect.mockReset();
    expect(await uploadImportAction(undefined, new FormData())).toEqual({ status: "invalid", reason: "file" });
    vi.stubGlobal("fetch", answer(200, { surprise: true }));
    await uploadImportAction(undefined, upload("a\n1"));
    expect(redirect).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", answer(400, { code: "imports.file.empty", title: "x", status: 400 }));
    expect(await uploadImportAction(undefined, upload("a\n1"))).toMatchObject({
      status: "refused",
      reason: "fileEmpty",
    });
  });

  it("saves the mapping and refreshes the page, and refuses a bad id", async () => {
    const { saveMappingAction, runImportAction } = await import("@/features/imports/server/imports.actions");
    vi.stubGlobal("fetch", answer(200, JOB));
    const form = new FormData();
    form.append("map:Adresse", "address");

    expect((await saveMappingAction(ID, undefined, form)).status).toBe("done");
    expect(revalidatePath).toHaveBeenCalledWith("/imports/[jobId]", "page");
    expect(await saveMappingAction("x", undefined, form)).toEqual({ status: "invalid", reason: "id" });
    expect(await runImportAction("x", undefined)).toEqual({ status: "invalid", reason: "id" });
    expect((await runImportAction(ID, undefined)).status).toBe("done");
  });

  it("keeps the page as it is when the core refuses", async () => {
    const { saveMappingAction, runImportAction } = await import("@/features/imports/server/imports.actions");
    vi.stubGlobal("fetch", answer(422, { code: "imports.not_checked", title: "x", status: 422 }));

    expect(await runImportAction(ID, undefined)).toMatchObject({ status: "refused", reason: "notChecked" });
    expect((await saveMappingAction(ID, undefined, new FormData())).status).toBe("refused");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("serves the rows that were not imported as a never-cached download", async () => {
    const { fetchImportErrorsCsv } = await import("@/features/imports/server/imports.csv");
    const csv = vi.fn(async () => new Response('"a";"erreur"\r\n', { status: 200 }));

    const response = await fetchImportErrorsCsv(new URLSearchParams({ jobId: ID }), csv);

    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="erreurs-import-0197a000.csv"');
    expect(String((csv.mock.calls[0] as unknown[])[0])).toBe(`http://bff.test/pages/imports/${ID}/errors.csv`);
    const status = (code: number) => vi.fn(async () => new Response(null, { status: code }));
    for (const code of [403, 404, 410]) {
      expect((await fetchImportErrorsCsv(new URLSearchParams({ jobId: ID }), status(code))).status).toBe(code);
    }
    expect((await fetchImportErrorsCsv(new URLSearchParams({ jobId: ID }), status(500))).status).toBe(502);
    expect((await fetchImportErrorsCsv(new URLSearchParams({ jobId: "x" }), status(200))).status).toBe(404);
    expect((await fetchImportErrorsCsv(new URLSearchParams(), status(200))).status).toBe(404);
  });

  it("serves nothing when no BFF is configured, and has a route that hands the query on", async () => {
    vi.stubEnv("ESCALIA_BFF_URL", "");
    const { fetchImportErrorsCsv } = await import("@/features/imports/server/imports.csv");
    expect((await fetchImportErrorsCsv(new URLSearchParams({ jobId: ID }))).status).toBe(404);
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("a\r\n", { status: 200 })),
    );
    vi.resetModules();
    const route = await import("@/app/api/bff/imports/errors/route");
    expect((await route.GET(new Request(`http://localhost/api/bff/imports/errors?jobId=${ID}`))).status).toBe(200);
  });
});
