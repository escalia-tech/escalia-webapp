"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { type AcknowledgeOutcome, acknowledgeAnnex, type SaveOutcome, saveBylaws } from "./bylaws.service";

export type BylawsFormState = SaveOutcome | undefined;

export async function saveBylawsAction(
  buildingId: string,
  _previous: BylawsFormState,
  form: FormData,
): Promise<BylawsFormState> {
  const outcome = await saveBylaws(buildingId, form, await getLocale());
  if (outcome.status === "saved") revalidatePath("/buildings/[id]/bylaws", "page");
  return outcome;
}

export async function acknowledgeAnnexAction(leaseId: string, annexId: string): Promise<AcknowledgeOutcome> {
  const outcome = await acknowledgeAnnex(leaseId, annexId, await getLocale());
  if (outcome.status === "acknowledged") revalidatePath("/tenant/[leaseId]", "page");
  return outcome;
}
