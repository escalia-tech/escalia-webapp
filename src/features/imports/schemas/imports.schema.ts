import { z } from "zod";

export const ROW_STATUSES = ["VALID", "INVALID", "DUPLICATE", "IMPORTED", "FAILED"] as const;
export const IMPORT_STATUSES = ["UPLOADED", "VALIDATED", "DONE", "FAILED"] as const;
export const MAX_FILE_BYTES = 2_000_000;
export const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const countsSchema = z.object({
  total: z.number().int(),
  valid: z.number().int(),
  invalid: z.number().int(),
  duplicate: z.number().int(),
  imported: z.number().int(),
  failed: z.number().int(),
});
export type ImportCounts = z.infer<typeof countsSchema>;

export const rowSchema = z.object({
  rowNumber: z.number().int(),
  status: z.enum(ROW_STATUSES),
  address: z.string().nullish(),
  unit: z.string().nullish(),
  tenants: z.number().int().nullish(),
  rentCents: z.number().int().nullish(),
  errors: z.record(z.string(), z.string()),
  leaseId: z.string().nullish(),
  buildingId: z.string().nullish(),
});
export type ImportRow = z.infer<typeof rowSchema>;

/** One import with its mapping and its rows (`ImportJob` of the core). */
export const importJobSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  status: z.enum(IMPORT_STATUSES),
  headers: z.array(z.string()),
  mapping: z.record(z.string(), z.string()),
  fields: z.array(z.string()),
  required: z.array(z.string()),
  counts: countsSchema,
  rows: z.array(rowSchema),
  createdAt: z.string(),
  finishedAt: z.string().nullish(),
});
export type ImportJob = z.infer<typeof importJobSchema>;

export const importListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      fileName: z.string(),
      status: z.enum(IMPORT_STATUSES),
      counts: countsSchema,
      createdAt: z.string(),
    }),
  ),
});
export type ImportList = z.infer<typeof importListSchema>;

export type UploadReason = "file" | "size";

export type ParsedUpload =
  | { ok: true; body: { fileName: string; content: string; base64?: true } }
  | { ok: false; reason: UploadReason };

/** The text of a CSV file: UTF-8, or Windows-1252 when the bytes are not valid UTF-8 (FR-PORT-03 section 6). */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function parseUpload(form: FormData): Promise<ParsedUpload> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, reason: "file" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: "size" };
  const fileName = file.name.slice(0, 200);
  const bytes = await file.arrayBuffer();
  if (fileName.toLowerCase().endsWith(".xlsx")) {
    // An Excel file travels as base64, which is a third larger than the file itself.
    const content = Buffer.from(bytes).toString("base64");
    if (content.length > MAX_FILE_BYTES) return { ok: false, reason: "size" };
    return { ok: true, body: { fileName, content, base64: true } };
  }
  return { ok: true, body: { fileName, content: decodeCsv(bytes) } };
}

const MAP_PREFIX = "map:";

/** The mapping the landlord chose: a header to a field code; an empty choice means the column is ignored. */
export function parseMapping(form: FormData): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [name, value] of form.entries()) {
    if (name.startsWith(MAP_PREFIX) && typeof value === "string" && value !== "") {
      mapping[name.slice(MAP_PREFIX.length)] = value;
    }
  }
  return mapping;
}

export const MAP_FIELD_PREFIX = MAP_PREFIX;

const REFUSALS = {
  "imports.file.empty": "fileEmpty",
  "imports.file.too_many_rows": "tooManyRows",
  "imports.file.too_big": "tooBig",
  "imports.file.purged": "purged",
  "imports.not_checked": "notChecked",
  "imports.mapping.invalid": "mapping",
  "imports.finished": "finished",
  "imports.not_found": "notFound",
} as const;
export type ImportRefusalKey = (typeof REFUSALS)[keyof typeof REFUSALS];

export function importRefusalKey(code: string | undefined): ImportRefusalKey | undefined {
  return code !== undefined && code in REFUSALS ? REFUSALS[code as keyof typeof REFUSALS] : undefined;
}

const ROW_ERRORS = [
  "required",
  "date",
  "amount",
  "due_day",
  "rooms",
  "choice",
  "email",
  "reach",
  "end_before_start",
] as const;
export type RowErrorName = (typeof ROW_ERRORS)[number] | "other";

/** The message key of a cell error: the row rules of the import, else a refusal of the portfolio or the lease. */
export function rowErrorKey(code: string): RowErrorName {
  const name = ROW_ERRORS.find((one) => `imports.row.${one}` === code);
  return name ?? "other";
}

export const BASE_FIELDS = [
  "address",
  "civic_number",
  "city",
  "province",
  "postal_code",
  "unit",
  "start_date",
  "end_date",
  "rent",
  "services",
  "due_day",
  "rooms",
  "use",
  "heating",
  "hot_water",
  "electricity",
  "pets",
  "smoke_free",
  "opening_balance",
  "opening_date",
] as const;
export type BaseField = (typeof BASE_FIELDS)[number];
export const TENANT_PARTS = ["name", "email", "phone", "language", "address"] as const;
export type TenantPart = (typeof TENANT_PARTS)[number];

export function baseField(code: string): BaseField | undefined {
  return BASE_FIELDS.find((one) => one === code);
}

const TENANT_FIELD = /^tenant_(\d)_(name|email|phone|language|address)$/;

/** "tenant_2_email" is a tenant field of the second tenant; any other field has a label of its own. */
export function tenantField(code: string): { n: number; part: TenantPart } | undefined {
  const match = TENANT_FIELD.exec(code);
  const part = TENANT_PARTS.find((one) => one === match?.[2]);
  return match && part ? { n: Number(match[1]), part } : undefined;
}
