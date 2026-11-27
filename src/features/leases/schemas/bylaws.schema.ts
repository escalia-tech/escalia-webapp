import { z } from "zod";

import { findingSchema } from "./leases.schema";

export const ANNEX_KINDS = ["BYLAWS", "GUARANTEE", "OTHER"] as const;
export const BYLAWS_MAX = 20000;
export const NOTE_MAX = 300;

/** One saved version of the by-laws of a building (`BylawsVersion` of the core). */
export const bylawsVersionSchema = z.object({
  version: z.number().int(),
  text: z.string(),
  textEn: z.string().nullish(),
  changeNote: z.string(),
  createdAt: z.string(),
  active: z.boolean(),
  attachedToLeases: z.boolean(),
});
export type BylawsVersion = z.infer<typeof bylawsVersionSchema>;

export const bylawsListSchema = z.object({ items: z.array(bylawsVersionSchema) });
export const bylawsSavedSchema = z.object({ version: bylawsVersionSchema, findings: z.array(findingSchema) });
export type BylawsSaved = z.infer<typeof bylawsSavedSchema>;

/** What the landlord sees of an annex (`LeaseAnnex` of the core). */
export const leaseAnnexSchema = z.object({
  id: z.string(),
  kind: z.enum(ANNEX_KINDS),
  title: z.string(),
  bylawsVersion: z.number().int().nullish(),
  versionDate: z.string().nullish(),
  acknowledgedBy: z.array(z.string()),
});
export const leaseAnnexesSchema = z.object({ items: z.array(leaseAnnexSchema) });
export type LeaseAnnex = z.infer<typeof leaseAnnexSchema>;

/** What a party sees of an annex (`TenantAnnex` of the core). */
export const tenantAnnexSchema = z.object({
  id: z.string(),
  kind: z.enum(ANNEX_KINDS),
  title: z.string(),
  text: z.string().nullish(),
  textEn: z.string().nullish(),
  bylawsVersion: z.number().int().nullish(),
  acknowledged: z.boolean(),
  acknowledgedAt: z.string().nullish(),
  canAcknowledge: z.boolean(),
});
export const tenantAnnexesSchema = z.object({ items: z.array(tenantAnnexSchema) });
export type TenantAnnex = z.infer<typeof tenantAnnexSchema>;

export type BylawsBody = { text: string; changeNote: string; textEn?: string };
export type BylawsParse = { ok: true; body: BylawsBody } | { ok: false; reason: "text" | "textEn" | "note" };

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** The by-laws form as the body the core expects: the French text is required, the translation is not. */
export function parseBylawsForm(form: FormData): BylawsParse {
  const text = field(form, "text");
  const textEn = field(form, "textEn");
  const changeNote = field(form, "changeNote");
  if (text === "" || text.length > BYLAWS_MAX) return { ok: false, reason: "text" };
  if (textEn.length > BYLAWS_MAX) return { ok: false, reason: "textEn" };
  if (changeNote.length > NOTE_MAX) return { ok: false, reason: "note" };
  return { ok: true, body: { text, changeNote, ...(textEn === "" ? {} : { textEn }) } };
}
