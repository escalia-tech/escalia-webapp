import { z } from "zod";

/** The leases of escalia-bff (`LeasePage` and `LeasesPage` in `pages.yaml`), as the core's `Lease` shapes them. */
export const ROLES = ["TENANT", "OCCUPANT", "GUARANTOR"] as const;
export const SOLIDARITIES = ["SOLIDARY", "JOINT", "NOT_APPLICABLE"] as const;
export const GUARANTEE_SCOPES = ["ALL_OBLIGATIONS", "RENT_ONLY"] as const;
export const GUARANTEE_DURATIONS = ["INITIAL_TERM", "INITIAL_TERM_AND_RENEWALS"] as const;
export const LANGUAGES = ["fr", "en"] as const;

export type PartyRole = (typeof ROLES)[number];

const partySchema = z.object({
  personId: z.string(),
  role: z.enum(ROLES),
  legalName: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  language: z.enum(LANGUAGES),
  postalAddress: z.string().nullish(),
  shareBasisPoints: z.number().int().nullish(),
  relation: z.string().nullish(),
  guarantee: z
    .object({
      scope: z.enum(GUARANTEE_SCOPES),
      duration: z.enum(GUARANTEE_DURATIONS),
      maxAmountCents: z.number().int().nullish(),
      guaranteedPersonIds: z.array(z.string()),
    })
    .nullish(),
  invitedAt: z.string().nullish(),
  joinedAt: z.string().nullish(),
});
export type LeaseParty = z.infer<typeof partySchema>;

export const LEASE_STATUSES = [
  "DRAFT",
  "READY",
  "OUT_FOR_SIGNATURE",
  "SIGNED",
  "ACTIVE",
  "RECORDED",
  "ENDED",
  "CANCELLED",
] as const;
export const TERM_KINDS = ["FIXED", "INDETERMINATE"] as const;
export const PAYMENT_METHODS = ["INTERAC", "CHEQUE", "CASH", "OTHER"] as const;
export const CLAUSE_G_KINDS = ["LOWEST_RENT", "TAL_DECISION", "NOT_LEASED", "CLAUSE_F"] as const;

const localized = z.object({ fr: z.string(), en: z.string() });
const termsSchema = z.object({
  termKind: z.enum(TERM_KINDS),
  startDate: z.string(),
  endDate: z.string().nullish(),
  rentCents: z.number().int(),
  dueDay: z.string(),
  firstPaymentDate: z.string(),
  firstPaymentCents: z.number().int(),
  acceptedPaymentMethods: z.array(z.enum(PAYMENT_METHODS)),
  postdatedChequesRequired: z.boolean(),
  otherConditions: z.string().nullish(),
  clauseG: z
    .object({
      kind: z.enum(CLAUSE_G_KINDS),
      amountCents: z.number().int().nullish(),
      periodStart: z.string().nullish(),
      periodEnd: z.string().nullish(),
      talDecisionRef: z.string().nullish(),
    })
    .nullish(),
  clauseF: z.object({ applies: z.boolean(), maxRentCents: z.number().int().nullish() }).nullish(),
});
export type LeaseTerms = z.infer<typeof termsSchema>;

export const findingSchema = z.object({
  outcome: z.enum(["INFO", "WARN", "BLOCK"]),
  ruleKey: z.string(),
  title: localized,
  sentence: localized,
  alternative: localized.nullish(),
  citation: z.string().nullish(),
  acknowledged: z.boolean().nullish(),
});
export type LeaseFinding = z.infer<typeof findingSchema>;

export const clauseGProposalSchema = z.object({
  amountCents: z.number().int().nullish(),
  periodStart: z.string().nullish(),
  periodEnd: z.string().nullish(),
  monthsOfHistory: z.number().int(),
});

const leaseSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  status: z.enum(LEASE_STATUSES),
  paymentReference: z.string().nullish(),
  terms: termsSchema.nullish(),
  findings: z.array(findingSchema).nullish(),
  solidarity: z.enum(SOLIDARITIES),
  solidaritySummary: z.object({ fr: z.string(), en: z.string() }),
  parties: z.array(partySchema),
});
export type Lease = z.infer<typeof leaseSchema>;

export const leasePageSchema = z.object({ lease: leaseSchema });
export const leasesPageSchema = z.object({ items: z.array(leaseSchema) });
export const leaseSchemaOnly = leaseSchema;

/** What a person who joined a lease sees of it (`TenantLeasePage` in `pages.yaml`). */
const tenantLeaseSchema = z.object({
  leaseId: z.string(),
  unitId: z.string(),
  role: z.enum(ROLES),
  status: z.enum(LEASE_STATUSES),
  access: z.enum(["ACTIVE", "PENDING"]),
  solidaritySummary: z.object({ fr: z.string(), en: z.string() }).nullish(),
  shareBasisPoints: z.number().int().nullish(),
});
export type TenantLease = z.infer<typeof tenantLeaseSchema>;
export const tenantLeasePageSchema = z.object({ lease: tenantLeaseSchema });
export const tenantLeasesPageSchema = z.object({ items: z.array(tenantLeaseSchema) });
export const invitationsSentSchema = z.object({ sent: z.number().int() });
export const invitationAcceptedSchema = z.object({ leaseId: z.string(), role: z.enum(ROLES) });

/** The versions of the documents a person accepts when joining; they change only with the documents. */
export const TERMS_VERSION = "2026-11";
export const PRIVACY_VERSION = "2026-11";
export const INVITATION_TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
/** An invitation stays valid for 30 days after it was sent (FR-TEN-01 BR-1). */
export const INVITATION_DAYS = 30;

/** Core refusals the screen explains in its own words; anything else shows the core's message. */
export const REFUSAL_KEYS = {
  "lease.parties.shares": "shares",
  "lease.parties.tenant_required": "tenantRequired",
  "lease.party.contact_required": "contactRequired",
  "lease.party.duplicate": "duplicate",
  "lease.party.email_invalid": "emailInvalid",
  "lease.party.name_required": "nameRequired",
  "lease.parties.too_many": "tooMany",
  "lease.parties.after_signing": "afterSigning",
  "lease.guarantee.unknown_tenant": "unknownTenant",
  "lease.not_found": "notFound",
  "lease.form.incomplete": "formIncomplete",
  "lease.overlap": "overlap",
  "lease.language.not_requested": "languageNotRequested",
  "lease.language.closed": "languageClosed",
  "lease.language.own_choice_only": "ownChoiceOnly",
  "lease.building_not_found": "buildingNotFound",
  "lease.bylaws_not_found": "bylawsNotFound",
  "lease.annex_not_found": "annexNotFound",
  "lease.annex.cannot_acknowledge": "cannotAcknowledge",
  "lease.terms.invalid": "termsInvalid",
  "lease.terms.missing": "noTerms",
  "lease.out_for_signature": "outForSignature",
  "lease.cannot_cancel": "cannotCancel",
  "lease.unit_not_found": "unitNotFound",
  "lease.occupant_not_found": "occupantNotFound",
  "lease.invitation.not_found": "invitationNotFound",
  "lease.invitation.expired": "invitationExpired",
  "lease.invitation.used": "invitationUsed",
  "lease.invitation.email_mismatch": "invitationAddress",
  "lease.invitation.email_required": "emailRequired",
  "lease.signing.not_ready": "signingNotReady",
  "lease.signing.contact_required": "signingContact",
  "lease.signing.not_open": "signingNotOpen",
  "lease.copy_delivery.not_found": "deliveryNotFound",
  "lease.copy_delivery.date": "deliveryDate",
  "ledger.blocked": "ledgerBlocked",
  "ledger.entry.paid": "entryPaid",
  "ledger.entry.credit_used": "creditUsed",
  "ledger.entry.exceeds_balance": "exceedsBalance",
  "ledger.payment.designated_invalid": "designatedInvalid",
} as const;
export type RefusalKey = (typeof REFUSAL_KEYS)[keyof typeof REFUSAL_KEYS];

export function refusalKey(code: string | undefined): RefusalKey | undefined {
  return code !== undefined && code in REFUSAL_KEYS ? REFUSAL_KEYS[code as keyof typeof REFUSAL_KEYS] : undefined;
}

const PERCENT = /^(\d{1,3})(?:[.,](\d{1,2}))?$/;
const DOLLARS = /^(\d{1,9})(?:[.,](\d{1,2}))?$/;

/** "33,33" becomes 3333 hundredths of a percent, by string arithmetic, never by floating point. */
export function percentToBasisPoints(text: string): number | undefined {
  const match = PERCENT.exec(text.trim());
  if (!match) return undefined;
  const value = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return value > 10000 ? undefined : value;
}

/** "1 500,50" is not accepted on purpose: digits, one separator, at most two decimals. */
export function dollarsToCents(text: string): number | undefined {
  const match = DOLLARS.exec(text.trim());
  if (!match) return undefined;
  const value = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return value > 0 ? value : undefined;
}

export interface PartyBody {
  role: PartyRole;
  legalName: string;
  language: (typeof LANGUAGES)[number];
  email?: string;
  phone?: string;
  postalAddress?: string;
  shareBasisPoints?: number;
  relation?: string;
  guarantee?: {
    scope: (typeof GUARANTEE_SCOPES)[number];
    duration: (typeof GUARANTEE_DURATIONS)[number];
    maxAmountCents?: number;
    guaranteedEmails?: string[];
  };
}
export interface PartiesBody {
  solidarity?: (typeof SOLIDARITIES)[number];
  parties: PartyBody[];
}
export type ParsedParties =
  | { ok: true; body: PartiesBody }
  | { ok: false; reason: "role" | "name" | "share" | "amount" };

const FIELD = /^legalName_(\d+)$/;

function text(form: FormData, name: string, index: number): string {
  const value = form.get(`${name}_${index}`);
  return typeof value === "string" ? value.trim() : "";
}

function optional<K extends string>(key: K, value: string): Partial<Record<K, string>> {
  return value === "" ? {} : ({ [key]: value } as Record<K, string>);
}

function oneOf<T extends string>(choices: readonly T[], value: string): T | undefined {
  return choices.find((choice) => choice === value);
}

function parseRow(
  form: FormData,
  index: number,
): { ok: true; party: PartyBody } | { ok: false; reason: "role" | "name" | "share" | "amount" } {
  const role = oneOf(ROLES, text(form, "role", index));
  if (!role) return { ok: false, reason: "role" };
  const legalName = text(form, "legalName", index);
  if (legalName === "") return { ok: false, reason: "name" };
  const party: PartyBody = {
    role,
    legalName,
    language: oneOf(LANGUAGES, text(form, "language", index)) ?? "fr",
    ...optional("email", text(form, "email", index)),
    ...optional("phone", text(form, "phone", index)),
    ...optional("postalAddress", text(form, "address", index)),
  };
  if (role === "OCCUPANT") Object.assign(party, optional("relation", text(form, "relation", index)));
  const share = text(form, "share", index);
  if (role === "TENANT" && share !== "") {
    const basisPoints = percentToBasisPoints(share);
    if (basisPoints === undefined) return { ok: false, reason: "share" };
    party.shareBasisPoints = basisPoints;
  }
  if (role === "GUARANTOR") {
    const amount = text(form, "maxAmount", index);
    const cents = amount === "" ? undefined : dollarsToCents(amount);
    if (amount !== "" && cents === undefined) return { ok: false, reason: "amount" };
    const emails = text(form, "guaranteed", index)
      .split(/[\s,;]+/)
      .filter((one) => one !== "");
    party.guarantee = {
      scope: oneOf(GUARANTEE_SCOPES, text(form, "scope", index)) ?? "ALL_OBLIGATIONS",
      duration: oneOf(GUARANTEE_DURATIONS, text(form, "duration", index)) ?? "INITIAL_TERM",
      ...(cents === undefined ? {} : { maxAmountCents: cents }),
      ...(emails.length > 0 ? { guaranteedEmails: emails } : {}),
    };
  }
  return { ok: true, party };
}

/**
 * Reads the parties editor. Rows are numbered (`legalName_3`, `role_3`, …) because the number of rows is chosen in
 * the browser; the core checks every business rule (shares, solidarity, limits), this only turns text into numbers.
 */
export function parsePartiesForm(form: FormData): ParsedParties {
  const indexes = [...form.keys()]
    .map((key) => FIELD.exec(key)?.[1])
    .filter((one): one is string => one !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
  const parties: PartyBody[] = [];
  for (const index of indexes) {
    const row = parseRow(form, index);
    if (!row.ok) return row;
    parties.push(row.party);
  }
  const solidarity = oneOf(SOLIDARITIES, String(form.get("solidarity") ?? ""));
  return { ok: true, body: { ...(solidarity ? { solidarity } : {}), parties } };
}

export interface OccupantBody {
  legalName: string;
  relation?: string;
  email?: string;
  phone?: string;
}

export function parseOccupantForm(form: FormData): { ok: true; body: OccupantBody } | { ok: false } {
  const get = (name: string) => String(form.get(name) ?? "").trim();
  const legalName = get("legalName");
  if (legalName === "") return { ok: false };
  return {
    ok: true,
    body: {
      legalName,
      ...optional("relation", get("relation")),
      ...optional("email", get("email")),
      ...optional("phone", get("phone")),
    },
  };
}

export type TermsReason = "dates" | "rent" | "payment" | "clauseG" | "clauseF";

const DUE_DAY = /^([1-9]|1[0-9]|2[0-8]|LAST)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Dollars as cents, zero allowed (a first payment can be nothing). */
export function dollarsToCentsOrZero(text: string): number | undefined {
  return text.trim().replace(/^0+(?=\d)/, "") === "0" ? 0 : dollarsToCents(text);
}

export interface TermsBody {
  termKind: (typeof TERM_KINDS)[number];
  startDate: string;
  endDate?: string;
  rentCents: number;
  dueDay: string;
  firstPaymentDate: string;
  firstPaymentCents: number;
  acceptedPaymentMethods: (typeof PAYMENT_METHODS)[number][];
  postdatedChequesRequired: boolean;
  otherConditions?: string;
  clauseG?: {
    kind: (typeof CLAUSE_G_KINDS)[number];
    amountCents?: number;
    periodStart?: string;
    periodEnd?: string;
    talDecisionRef?: string;
  };
  clauseF?: { applies: boolean; maxRentCents?: number };
  acknowledgedWarnings: string[];
}

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

function parseClauseG(form: FormData): { ok: true; value: TermsBody["clauseG"] } | { ok: false } {
  const kind = oneOf(CLAUSE_G_KINDS, field(form, "clauseGKind"));
  if (field(form, "clauseGKind") === "") return { ok: true, value: undefined };
  if (!kind) return { ok: false };
  const amountText = field(form, "clauseGAmount");
  const amountCents = amountText === "" ? undefined : dollarsToCentsOrZero(amountText);
  if (amountText !== "" && amountCents === undefined) return { ok: false };
  const start = field(form, "clauseGStart");
  const end = field(form, "clauseGEnd");
  if ((start !== "" && !DATE.test(start)) || (end !== "" && !DATE.test(end))) return { ok: false };
  return {
    ok: true,
    value: {
      kind,
      ...(amountCents === undefined ? {} : { amountCents }),
      ...optional("periodStart", start),
      ...optional("periodEnd", end),
      ...optional("talDecisionRef", field(form, "clauseGRef")),
    },
  };
}

/** Reads the terms form; the core applies every rule (limits, clause G and F, warnings), this only types the text. */
export function parseTermsForm(form: FormData): { ok: true; body: TermsBody } | { ok: false; reason: TermsReason } {
  const termKind = oneOf(TERM_KINDS, field(form, "termKind")) ?? "FIXED";
  const startDate = field(form, "startDate");
  const endDate = field(form, "endDate");
  const firstPaymentDate = field(form, "firstPaymentDate");
  if (!DATE.test(startDate) || !DATE.test(firstPaymentDate) || (endDate !== "" && !DATE.test(endDate))) {
    return { ok: false, reason: "dates" };
  }
  const rentCents = dollarsToCents(field(form, "rent"));
  const firstPaymentCents = dollarsToCentsOrZero(field(form, "firstPayment"));
  const dueDay = field(form, "dueDay");
  if (rentCents === undefined || firstPaymentCents === undefined || !DUE_DAY.test(dueDay)) {
    return { ok: false, reason: "rent" };
  }
  const methods = PAYMENT_METHODS.filter((method) => form.getAll("methods").includes(method));
  if (methods.length === 0) return { ok: false, reason: "payment" };
  const clauseG = parseClauseG(form);
  if (!clauseG.ok) return { ok: false, reason: "clauseG" };
  const body: TermsBody = {
    termKind,
    startDate,
    rentCents,
    dueDay,
    firstPaymentDate,
    firstPaymentCents,
    acceptedPaymentMethods: methods,
    postdatedChequesRequired: form.get("postdated") === "on",
    acknowledgedWarnings: form.getAll("acknowledged").map(String),
    ...optional("endDate", termKind === "FIXED" ? endDate : ""),
    ...optional("otherConditions", field(form, "otherConditions")),
  };
  if (clauseG.value) body.clauseG = clauseG.value;
  const applies = field(form, "clauseF");
  if (applies === "yes" || applies === "no") {
    const maxText = field(form, "clauseFMax");
    const maxRentCents = maxText === "" ? undefined : dollarsToCents(maxText);
    if (maxText !== "" && maxRentCents === undefined) return { ok: false, reason: "clauseF" };
    body.clauseF = { applies: applies === "yes", ...(maxRentCents === undefined ? {} : { maxRentCents }) };
  }
  return { ok: true, body };
}

export const LANGUAGE_CODES = ["fr", "en"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** What the landlord sees of the language of a lease (`LeaseLanguage` of the core). */
export const leaseLanguageSchema = z.object({
  requested: z.boolean(),
  requestedAt: z.string().nullish(),
  bindingLanguage: z.enum(LANGUAGE_CODES),
  translationProvided: z.boolean(),
  statementVersion: z.string(),
  choices: z.array(
    z.object({
      personId: z.string(),
      legalName: z.string(),
      role: z.enum(ROLES),
      choice: z.enum(LANGUAGE_CODES).nullish(),
      chosenAt: z.string().nullish(),
    }),
  ),
});
export type LeaseLanguage = z.infer<typeof leaseLanguageSchema>;

/** What a party sees of it (`TenantLanguage` of the core). */
export const tenantLanguageSchema = z.object({
  requested: z.boolean(),
  open: z.boolean(),
  bindingLanguage: z.enum(LANGUAGE_CODES),
  statementVersion: z.string(),
  myChoice: z.enum(LANGUAGE_CODES).nullish(),
});
export type TenantLanguage = z.infer<typeof tenantLanguageSchema>;
