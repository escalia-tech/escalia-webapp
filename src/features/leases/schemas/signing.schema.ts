import { z } from "zod";

export const SIGNING_STATES = ["OPEN", "COMPLETED", "WITHDRAWN", "EXPIRED", "DECLINED"] as const;
export const SIGNER_STATES = ["WAITING", "INVITED", "SIGNED", "DECLINED"] as const;
export const SIGNER_ROLES = ["LANDLORD", "TENANT", "GUARANTOR"] as const;
export const DELIVERY_CHANNELS = ["PORTAL", "EMAIL", "HAND"] as const;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** One signer and where they stand (`SigningSigner` of the core). */
export const signerSchema = z.object({
  personId: z.string(),
  name: z.string(),
  role: z.enum(SIGNER_ROLES),
  order: z.number().int(),
  state: z.enum(SIGNER_STATES),
  signedAt: z.string().nullish(),
});
export type Signer = z.infer<typeof signerSchema>;

export const copySchema = z.object({
  personId: z.string(),
  name: z.string(),
  channel: z.enum(DELIVERY_CHANNELS),
  deliveredAt: z.string().nullish(),
  manualDeliveryDate: z.string().nullish(),
  dueBy: z.string(),
});
export type Copy = z.infer<typeof copySchema>;

/** The landlord's view (`LeaseSigning` of the core). */
export const leaseSigningSchema = z.object({
  sent: z.boolean(),
  requestId: z.string().nullish(),
  state: z.enum(SIGNING_STATES).nullish(),
  sentAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
  documentSha256: z.string().nullish(),
  finalSha256: z.string().nullish(),
  signers: z.array(signerSchema),
  copies: z.array(copySchema),
});
export type LeaseSigning = z.infer<typeof leaseSigningSchema>;

/** A party's view: names and states only (`TenantSigning` of the core). */
export const tenantSigningSchema = z.object({
  requestId: z.string().nullish(),
  state: z.enum(SIGNING_STATES).nullish(),
  myState: z.enum(SIGNER_STATES).nullish(),
  signers: z.array(signerSchema),
});
export type TenantSigning = z.infer<typeof tenantSigningSchema>;

/** The way to sign: the party's own signing page, open only while it is their turn. */
export function signingPath(view: TenantSigning): string | undefined {
  return view.state === "OPEN" && view.myState === "INVITED" && view.requestId ? `/sign/${view.requestId}` : undefined;
}

/** A hand delivery date typed as YYYY-MM-DD, or nothing. */
export function parseHandDate(form: FormData): string | undefined {
  const value = form.get("date");
  return typeof value === "string" && DAY.test(value.trim()) ? value.trim() : undefined;
}
