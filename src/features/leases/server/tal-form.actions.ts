"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { saveLeaseForm, type TalFormOutcome } from "./tal-form.service";

export type TalFormState = TalFormOutcome | undefined;

export async function saveTalFormAction(
  leaseId: string,
  _previous: TalFormState,
  form: FormData,
): Promise<TalFormOutcome> {
  const outcome = await saveLeaseForm(leaseId, form, await getLocale());
  if (outcome.status === "done") revalidatePath("/leases/[leaseId]", "page");
  return outcome;
}
