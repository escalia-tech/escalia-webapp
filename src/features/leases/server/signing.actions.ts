"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { recordHandDelivery, type SigningOutcome, sendForSignature, withdrawSigning } from "./signing.service";

async function changed(outcome: SigningOutcome): Promise<SigningOutcome> {
  if (outcome.status === "done") revalidatePath("/leases/[leaseId]", "page");
  return outcome;
}

export async function sendForSignatureAction(leaseId: string): Promise<SigningOutcome> {
  return changed(await sendForSignature(leaseId, await getLocale()));
}

export async function withdrawSigningAction(leaseId: string): Promise<SigningOutcome> {
  return changed(await withdrawSigning(leaseId, await getLocale()));
}

export async function recordHandDeliveryAction(
  leaseId: string,
  personId: string,
  form: FormData,
): Promise<SigningOutcome> {
  return changed(await recordHandDelivery(leaseId, personId, form, await getLocale()));
}
