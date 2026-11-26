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

const leaseSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  status: z.enum(["DRAFT", "SIGNED", "RECORDED", "ENDED"]),
  solidarity: z.enum(SOLIDARITIES),
  solidaritySummary: z.object({ fr: z.string(), en: z.string() }),
  parties: z.array(partySchema),
});
export type Lease = z.infer<typeof leaseSchema>;

export const leasePageSchema = z.object({ lease: leaseSchema });
export const leasesPageSchema = z.object({ items: z.array(leaseSchema) });
export const leaseSchemaOnly = leaseSchema;

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
  "lease.unit_not_found": "unitNotFound",
  "lease.occupant_not_found": "occupantNotFound",
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
