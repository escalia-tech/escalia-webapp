import { z } from "zod";

import { dollarsToCents } from "./leases.schema";

export const ENTRY_TYPES = [
  "RENT_CHARGE",
  "PARKING_CHARGE",
  "SERVICE_CHARGE",
  "OTHER_CHARGE",
  "PAYMENT",
  "CREDIT",
  "NSF_BANK_CHARGE",
  "ARREARS_INTEREST",
  "OPENING_BALANCE",
  "WRITE_OFF",
  "REVERSAL",
  "CREDIT_APPLICATION",
] as const;
export const MANUAL_TYPES = ["OTHER_CHARGE", "CREDIT", "NSF_BANK_CHARGE", "ARREARS_INTEREST", "WRITE_OFF"] as const;
export const PAYMENT_METHODS = ["INTERAC", "CHEQUE", "CASH", "BANK_TRANSFER", "OTHER"] as const;
export const LEDGER_ROLES = ["TENANT", "GUARANTOR"] as const;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_REASON = 200;

/** One line of a lease ledger, as the landlord sees it (`LedgerEntry` of the core). */
export const ledgerEntrySchema = z.object({
  id: z.string(),
  type: z.enum(ENTRY_TYPES),
  effectiveOn: z.string(),
  postedAt: z.string(),
  description: z.object({ fr: z.string(), en: z.string() }),
  reason: z.string().nullish(),
  chargeCents: z.number().int(),
  paymentCents: z.number().int(),
  balanceCents: z.number().int(),
  reversed: z.boolean(),
  reverses: z.string().nullish(),
  documentId: z.string().nullish(),
  backdatedOn: z.string().nullish(),
  openCents: z.number().int().nullish(),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const ageingSchema = z.object({
  currentCents: z.number().int(),
  days1to7Cents: z.number().int(),
  days8to21Cents: z.number().int(),
  days22PlusCents: z.number().int(),
});
export type Ageing = z.infer<typeof ageingSchema>;

/** The landlord's ledger of a lease (`LeaseLedger` of the core). */
export const leaseLedgerSchema = z.object({
  leaseId: z.string(),
  balanceCents: z.number().int(),
  creditCents: z.number().int(),
  ageing: ageingSchema,
  blocked: z.boolean(),
  entries: z.array(ledgerEntrySchema),
});
export type LeaseLedger = z.infer<typeof leaseLedgerSchema>;

/** A party's line: the same words and amounts, without who posted it or why (`TenantLedgerEntry`). */
export const tenantEntrySchema = z.object({
  id: z.string(),
  type: z.enum(ENTRY_TYPES),
  effectiveOn: z.string(),
  description: z.object({ fr: z.string(), en: z.string() }),
  chargeCents: z.number().int(),
  paymentCents: z.number().int(),
  balanceCents: z.number().int(),
  correction: z.boolean(),
});
export type TenantEntry = z.infer<typeof tenantEntrySchema>;

export const tenantLedgerSchema = z.object({
  leaseId: z.string(),
  role: z.enum(LEDGER_ROLES),
  balanceCents: z.number().int(),
  creditCents: z.number().int(),
  entries: z.array(tenantEntrySchema),
});
export type TenantLedger = z.infer<typeof tenantLedgerSchema>;

export type ManualType = (typeof MANUAL_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** What the language of the page picks out of a French and English pair. */
export function pick(text: { fr: string; en: string }, locale: string): string {
  return locale.startsWith("en") ? text.en : text.fr;
}

/** Key that makes a double click, or a retry, post once (FR-LEDG-01 BR-9). 8 to 80 characters. */
export function validKey(key: string): boolean {
  return key.length >= 8 && key.length <= 80;
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export interface PaymentBody {
  date: string;
  amountCents: number;
  method: PaymentMethod;
  note?: string;
  designatedEntryId?: string;
}
export type ParsedPayment = { ok: true; body: PaymentBody } | { ok: false; reason: "date" | "amount" | "method" };

/** A payment typed in the form: the day received, dollars, how it was paid, a note, a charge to pay first. */
export function parsePayment(form: FormData): ParsedPayment {
  const date = field(form, "date");
  if (!DAY.test(date)) return { ok: false, reason: "date" };
  const amountCents = dollarsToCents(field(form, "amount"));
  if (amountCents === undefined) return { ok: false, reason: "amount" };
  const method = field(form, "method");
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) return { ok: false, reason: "method" };
  const note = field(form, "note");
  const designated = field(form, "designated");
  return {
    ok: true,
    body: {
      date,
      amountCents,
      method: method as PaymentMethod,
      ...(note ? { note } : {}),
      ...(ID.test(designated) ? { designatedEntryId: designated } : {}),
    },
  };
}

export interface EntryBody {
  type: ManualType;
  effectiveOn: string;
  amountCents: number;
  reason: string;
}
export type ParsedEntry = { ok: true; body: EntryBody } | { ok: false; reason: "date" | "amount" | "type" | "reason" };

/** A charge, credit, bank charge, interest or write-off typed by hand; the reason is always required. */
export function parseEntry(form: FormData): ParsedEntry {
  const type = field(form, "type");
  if (!MANUAL_TYPES.includes(type as ManualType)) return { ok: false, reason: "type" };
  const effectiveOn = field(form, "date");
  if (!DAY.test(effectiveOn)) return { ok: false, reason: "date" };
  const amountCents = dollarsToCents(field(form, "amount"));
  if (amountCents === undefined) return { ok: false, reason: "amount" };
  const reason = field(form, "reason");
  if (reason === "" || reason.length > MAX_REASON) return { ok: false, reason: "reason" };
  return { ok: true, body: { type: type as ManualType, effectiveOn, amountCents, reason } };
}

/** The reason for correcting an entry. */
export function parseReason(form: FormData): string | undefined {
  const reason = field(form, "reason");
  return reason === "" || reason.length > MAX_REASON ? undefined : reason;
}

/** Charges a payment may be told to pay first: the ones with something left to pay. */
export function openCharges(entries: LedgerEntry[]): LedgerEntry[] {
  return entries.filter((entry) => entry.chargeCents > 0 && (entry.openCents ?? 0) > 0 && !entry.reversed);
}

/** An entry that may be corrected: not a correction itself, not already corrected. */
export function correctable(entry: LedgerEntry): boolean {
  return entry.type !== "REVERSAL" && entry.type !== "CREDIT_APPLICATION" && !entry.reversed;
}
