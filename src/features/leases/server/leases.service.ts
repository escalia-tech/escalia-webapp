import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  INVITATION_TOKEN,
  invitationAcceptedSchema,
  invitationsSentSchema,
  type Lease,
  leasePageSchema,
  leaseSchemaOnly,
  leasesPageSchema,
  PRIVACY_VERSION,
  parseOccupantForm,
  parsePartiesForm,
  type RefusalKey,
  refusalKey,
  TERMS_VERSION,
  type TenantLease,
  tenantLeasePageSchema,
  tenantLeasesPageSchema,
} from "../schemas/leases.schema";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function fetchLeases(language: string, unitId?: string): Promise<Lease[]> {
  return (await fetchBffPage("leases.list", "/pages/leases", leasesPageSchema, { language, query: { unitId } })).items;
}

export async function fetchLease(id: string, language: string): Promise<Lease> {
  return (await fetchBffPage("leases.one", `/pages/leases/${encodeURIComponent(id)}`, leasePageSchema, { language }))
    .lease;
}

export type LeaseOutcome =
  | { status: "done"; leaseId: string | undefined }
  | { status: "invalid"; reason: "id" | "role" | "name" | "share" | "amount" }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

async function send(
  operation: string,
  path: `/actions/${string}`,
  body: unknown,
  language: string,
): Promise<LeaseOutcome> {
  const result = await postBffAction(operation, path, body, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const lease = leaseSchemaOnly.safeParse(result.body);
  return { status: "done", leaseId: lease.success ? lease.data.id : undefined };
}

/** Starts a draft on a unit. */
export async function createLease(unitId: string, language: string): Promise<LeaseOutcome> {
  if (!ID.test(unitId)) return { status: "invalid", reason: "id" };
  return send("leases.create", "/actions/create-lease", { unitId }, language);
}

export async function saveParties(leaseId: string, form: FormData, language: string): Promise<LeaseOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  const parsed = parsePartiesForm(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  return send("leases.parties", `/actions/set-lease-parties/${leaseId}`, parsed.body, language);
}

export async function addOccupant(leaseId: string, form: FormData, language: string): Promise<LeaseOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  const parsed = parseOccupantForm(form);
  if (!parsed.ok) return { status: "invalid", reason: "name" };
  return send("leases.occupant.add", `/actions/add-occupant/${leaseId}`, parsed.body, language);
}

export async function removeOccupant(leaseId: string, personId: string, language: string): Promise<LeaseOutcome> {
  if (!ID.test(leaseId) || !ID.test(personId)) return { status: "invalid", reason: "id" };
  return send("leases.occupant.remove", `/actions/remove-occupant/${leaseId}/${personId}`, {}, language);
}

export async function fetchTenantLeases(language: string): Promise<TenantLease[]> {
  return (await fetchBffPage("tenant.leases", "/pages/tenant/leases", tenantLeasesPageSchema, { language })).items;
}

export async function fetchTenantLease(id: string, language: string): Promise<TenantLease> {
  return (
    await fetchBffPage("tenant.lease", `/pages/tenant/leases/${encodeURIComponent(id)}`, tenantLeasePageSchema, {
      language,
    })
  ).lease;
}

export type InviteOutcome =
  | { status: "sent"; count: number }
  | { status: "invalid"; reason: "id" }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

/** Invites everyone on the lease who has not joined; sending again replaces the earlier link. */
export async function inviteParties(leaseId: string, language: string): Promise<InviteOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  const result = await postBffAction("leases.invite", `/actions/invite-parties/${leaseId}`, {}, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const sent = invitationsSentSchema.safeParse(result.body);
  return { status: "sent", count: sent.success ? sent.data.sent : 0 };
}

export type AcceptOutcome =
  | { status: "joined"; leaseId: string }
  | { status: "invalid"; reason: "token" | "terms" }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

/** The signed-in person takes their place on the lease; both boxes must be ticked. */
export async function acceptInvitation(token: string, form: FormData, language: string): Promise<AcceptOutcome> {
  if (!INVITATION_TOKEN.test(token)) return { status: "invalid", reason: "token" };
  if (form.get("terms") !== "on" || form.get("privacy") !== "on") return { status: "invalid", reason: "terms" };
  const chosen = form.get("language");
  const body = {
    token,
    language: chosen === "en" ? "en" : "fr",
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  };
  const result = await postBffAction("leases.accept", "/actions/accept-lease-invitation", body, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const accepted = invitationAcceptedSchema.safeParse(result.body);
  return accepted.success
    ? { status: "joined", leaseId: accepted.data.leaseId }
    : { status: "refused", reason: undefined, message: undefined };
}

export type RequestOutcome =
  | { status: "requested" }
  | { status: "invalid" }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

/** An expired link: asks the landlord for a new one. */
export async function requestNewInvitation(token: string, language: string): Promise<RequestOutcome> {
  if (!INVITATION_TOKEN.test(token)) return { status: "invalid" };
  const result = await postBffAction(
    "leases.request-new",
    "/actions/request-new-lease-invitation",
    { token },
    language,
  );
  return result.ok
    ? { status: "requested" }
    : { status: "refused", reason: refusalKey(result.code), message: result.message };
}
