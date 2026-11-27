import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import { type RefusalKey, refusalKey } from "../schemas/leases.schema";
import {
  type LeaseLedger,
  leaseLedgerSchema,
  parseEntry,
  parsePayment,
  parseReason,
  tenantLedgerSchema,
  validKey,
} from "../schemas/ledger.schema";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function fetchLeaseLedger(leaseId: string, language: string) {
  return fetchBffPage("lease.ledger", `/pages/leases/${encodeURIComponent(leaseId)}/ledger`, leaseLedgerSchema, {
    language,
  });
}

export async function fetchTenantLedger(leaseId: string, language: string) {
  return fetchBffPage(
    "tenant.ledger",
    `/pages/tenant/leases/${encodeURIComponent(leaseId)}/ledger`,
    tenantLedgerSchema,
    { language },
  );
}

export type LedgerOutcome =
  | { status: "done"; ledger: LeaseLedger | undefined }
  | { status: "invalid"; reason: "id" | "key" | "date" | "amount" | "method" | "type" | "reason" }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

async function act(
  name: string,
  path: `/actions/${string}`,
  body: unknown,
  key: string,
  language: string,
): Promise<LedgerOutcome> {
  const result = await postBffAction(name, path, body, language, key);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const parsed = leaseLedgerSchema.safeParse(result.body);
  return { status: "done", ledger: parsed.success ? parsed.data : undefined };
}

/** The landlord records a payment received (FR-LEDG-01 BR-8); the key makes a double click post once. */
export async function recordPayment(
  leaseId: string,
  key: string,
  form: FormData,
  language: string,
): Promise<LedgerOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  if (!validKey(key)) return { status: "invalid", reason: "key" };
  const parsed = parsePayment(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  return act("lease.ledger.payment", `/actions/record-payment/${leaseId}`, parsed.body, key, language);
}

/** The landlord adds a charge, credit, bank charge, interest or write-off, with a reason (BR-12). */
export async function addEntry(leaseId: string, key: string, form: FormData, language: string): Promise<LedgerOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  if (!validKey(key)) return { status: "invalid", reason: "key" };
  const parsed = parseEntry(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  return act("lease.ledger.entry", `/actions/add-ledger-entry/${leaseId}`, parsed.body, key, language);
}

/** The landlord corrects an entry: the ledger posts its mirror, with the reason (BR-4). */
export async function reverseEntry(
  leaseId: string,
  entryId: string,
  key: string,
  form: FormData,
  language: string,
): Promise<LedgerOutcome> {
  if (!ID.test(leaseId) || !ID.test(entryId)) return { status: "invalid", reason: "id" };
  if (!validKey(key)) return { status: "invalid", reason: "key" };
  const reason = parseReason(form);
  if (reason === undefined) return { status: "invalid", reason: "reason" };
  return act("lease.ledger.reverse", `/actions/reverse-ledger-entry/${leaseId}/${entryId}`, { reason }, key, language);
}
