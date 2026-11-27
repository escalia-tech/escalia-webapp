import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  type BylawsSaved,
  bylawsListSchema,
  bylawsSavedSchema,
  leaseAnnexesSchema,
  parseBylawsForm,
  type TenantAnnex,
  tenantAnnexesSchema,
} from "../schemas/bylaws.schema";
import { type RefusalKey, refusalKey } from "../schemas/leases.schema";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function fetchBylaws(buildingId: string, language: string) {
  return (
    await fetchBffPage("bylaws.list", `/pages/buildings/${encodeURIComponent(buildingId)}/bylaws`, bylawsListSchema, {
      language,
    })
  ).items;
}

export async function fetchLeaseAnnexes(leaseId: string, language: string) {
  return (
    await fetchBffPage("lease.annexes", `/pages/leases/${encodeURIComponent(leaseId)}/annexes`, leaseAnnexesSchema, {
      language,
    })
  ).items;
}

export async function fetchTenantAnnexes(leaseId: string, language: string) {
  return (
    await fetchBffPage(
      "tenant.annexes",
      `/pages/tenant/leases/${encodeURIComponent(leaseId)}/annexes`,
      tenantAnnexesSchema,
      { language },
    )
  ).items;
}

type Refused = { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

export type SaveOutcome =
  | { status: "saved"; saved: BylawsSaved | undefined }
  | { status: "invalid"; reason: "id" | "text" | "textEn" | "note" }
  | Refused;

/** The landlord saves a new version; warnings come back with it and never refuse the save (BR-5). */
export async function saveBylaws(buildingId: string, form: FormData, language: string): Promise<SaveOutcome> {
  if (!ID.test(buildingId)) return { status: "invalid", reason: "id" };
  const parsed = parseBylawsForm(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  const result = await postBffAction("bylaws.save", `/actions/save-bylaws/${buildingId}`, parsed.body, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const saved = bylawsSavedSchema.safeParse(result.body);
  return { status: "saved", saved: saved.success ? saved.data : undefined };
}

export type AcknowledgeOutcome =
  | { status: "acknowledged"; items: TenantAnnex[] | undefined }
  | { status: "invalid" }
  | Refused;

/** A party acknowledges receipt of an annex, for themselves (BR-8). */
export async function acknowledgeAnnex(
  leaseId: string,
  annexId: string,
  language: string,
): Promise<AcknowledgeOutcome> {
  if (!ID.test(leaseId) || !ID.test(annexId)) return { status: "invalid" };
  const result = await postBffAction(
    "annex.acknowledge",
    `/actions/acknowledge-annex/${leaseId}/${annexId}`,
    {},
    language,
  );
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const parsed = tenantAnnexesSchema.safeParse(result.body);
  return { status: "acknowledged", items: parsed.success ? parsed.data.items : undefined };
}
