import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  type Lease,
  leasePageSchema,
  leaseSchemaOnly,
  leasesPageSchema,
  parseOccupantForm,
  parsePartiesForm,
  type RefusalKey,
  refusalKey,
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
