import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import { type RefusalKey, refusalKey } from "../schemas/leases.schema";
import { type LeaseSigning, leaseSigningSchema, parseHandDate, tenantSigningSchema } from "../schemas/signing.schema";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function fetchLeaseSigning(leaseId: string, language: string) {
  return fetchBffPage("lease.signing", `/pages/leases/${encodeURIComponent(leaseId)}/signing`, leaseSigningSchema, {
    language,
  });
}

export async function fetchTenantSigning(leaseId: string, language: string) {
  return fetchBffPage(
    "tenant.signing",
    `/pages/tenant/leases/${encodeURIComponent(leaseId)}/signing`,
    tenantSigningSchema,
    { language },
  );
}

export type SigningOutcome =
  | { status: "done"; signing: LeaseSigning | undefined }
  | { status: "invalid"; reason: "id" | "date" }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

async function act(name: string, path: `/actions/${string}`, body: unknown, language: string): Promise<SigningOutcome> {
  const result = await postBffAction(name, path, body, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const parsed = leaseSigningSchema.safeParse(result.body);
  return { status: "done", signing: parsed.success ? parsed.data : undefined };
}

/** The landlord freezes the lease and sends it to be signed (FR-LEASE-04 BR-1). */
export async function sendForSignature(leaseId: string, language: string): Promise<SigningOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  return act("lease.signing.send", `/actions/send-lease-for-signature/${leaseId}`, {}, language);
}

/** The landlord withdraws the lease from signature (BR-9). */
export async function withdrawSigning(leaseId: string, language: string): Promise<SigningOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  return act("lease.signing.withdraw", `/actions/withdraw-lease-signing/${leaseId}`, {}, language);
}

/** The landlord records a copy handed over in person (BR-11). */
export async function recordHandDelivery(
  leaseId: string,
  personId: string,
  form: FormData,
  language: string,
): Promise<SigningOutcome> {
  if (!ID.test(leaseId) || !ID.test(personId)) return { status: "invalid", reason: "id" };
  const date = parseHandDate(form);
  if (date === undefined) return { status: "invalid", reason: "date" };
  return act("lease.signing.hand", `/actions/record-hand-delivery/${leaseId}/${personId}`, { date }, language);
}
