import { z } from "zod";

/** The documents panel of escalia-bff (`DocumentsPage` in `pages.yaml`); the items are the core's own shape. */
export const SUBJECT_TYPES = ["BUILDING", "UNIT"] as const;
export type PanelSubject = (typeof SUBJECT_TYPES)[number];

/** Categories a landlord can file a building or unit document under (FR-DOC-01 BR-2). */
export const CATEGORIES = [
  "LEASE",
  "NOTICE",
  "AGREEMENT",
  "RECEIPT",
  "CORRESPONDENCE",
  "EVIDENCE",
  "REPAIR_MEDIA",
  "MAINTENANCE",
  "INSURANCE",
  "BUILDING_RECORDS",
  "APPLICATION",
  "IDENTITY",
  "OTHER",
] as const;
export type DocumentCategory = (typeof CATEGORIES)[number];

/** 25 MB, the core's limit: refused here first so a big file is not sent for nothing. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const documentSummarySchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  title: z.string(),
  origin: z.enum(["UPLOADED", "GENERATED", "SIGNED"]),
  visibility: z.enum(["LANDLORD_ONLY", "LEASE_PARTIES", "PERSON"]),
  currentVersion: z.number().int(),
  sizeBytes: z.number(),
  createdAt: z.string(),
  contentDestroyed: z.boolean(),
  onLegalHold: z.boolean(),
});
export type DocumentSummary = z.infer<typeof documentSummarySchema>;

const holdSchema = z.object({
  id: z.string(),
  reason: z.string(),
  placedAt: z.string(),
  expiresOn: z.string(),
  liftedAt: z.string().nullish(),
});
export type LegalHold = z.infer<typeof holdSchema>;

export const documentsPageSchema = z.object({
  subjectType: z.enum(SUBJECT_TYPES),
  subjectId: z.string(),
  total: z.number().int(),
  usage: z.object({ usedBytes: z.number(), quotaBytes: z.number(), warning: z.boolean() }),
  items: z.array(documentSummarySchema),
  holds: z.array(holdSchema),
});
export type DocumentsPage = z.infer<typeof documentsPageSchema>;

export type UploadParse = { ok: true; form: FormData } | { ok: false; reason: "file" | "tooLarge" | "category" };

/** What the upload form posted, turned into the multipart body the BFF expects. */
export function parseUploadForm(subjectType: PanelSubject, subjectId: string, raw: FormData): UploadParse {
  const file = raw.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, reason: "file" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "tooLarge" };
  const category = raw.get("category");
  if (typeof category !== "string" || !(CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, reason: "category" };
  }
  const form = new FormData();
  form.set("file", file);
  form.set("subjectType", subjectType);
  form.set("subjectId", subjectId);
  form.set("category", category);
  const title = raw.get("title");
  if (typeof title === "string" && title.trim() !== "") form.set("title", title.trim().slice(0, 120));
  return { ok: true, form };
}

/** The legal-hold form: a reason is required. */
export function parseHoldReason(raw: FormData): string | null {
  const reason = raw.get("reason");
  const text = typeof reason === "string" ? reason.trim() : "";
  return text === "" ? null : text.slice(0, 300);
}
