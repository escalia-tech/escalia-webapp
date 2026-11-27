import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import { type RefusalKey, refusalKey } from "../schemas/leases.schema";
import { type LeaseFormView, leaseFormViewSchema, parseTalForm, type TalFormReason } from "../schemas/tal-form.schema";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function fetchLeaseForm(leaseId: string, language: string) {
  return fetchBffPage("lease.form", `/pages/leases/${encodeURIComponent(leaseId)}/form`, leaseFormViewSchema, {
    language,
  });
}

export type TalFormOutcome =
  | { status: "done"; view: LeaseFormView | undefined }
  | { status: "invalid"; reason: "id" | TalFormReason }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

/** Saves the details the official TAL form asks for; the core answers with what is still missing. */
export async function saveLeaseForm(leaseId: string, form: FormData, language: string): Promise<TalFormOutcome> {
  if (!ID.test(leaseId)) return { status: "invalid", reason: "id" };
  const parsed = parseTalForm(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  const result = await postBffAction("lease.form.save", `/actions/set-lease-form/${leaseId}`, parsed.body, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const view = leaseFormViewSchema.safeParse(result.body);
  return { status: "done", view: view.success ? view.data : undefined };
}
