"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { addEntry, type LedgerOutcome, recordPayment, reverseEntry } from "./ledger.service";

async function changed(outcome: LedgerOutcome): Promise<LedgerOutcome> {
  if (outcome.status === "done") revalidatePath("/leases/[leaseId]", "page");
  return outcome;
}

export async function recordPaymentAction(leaseId: string, key: string, form: FormData): Promise<LedgerOutcome> {
  return changed(await recordPayment(leaseId, key, form, await getLocale()));
}

export async function addEntryAction(leaseId: string, key: string, form: FormData): Promise<LedgerOutcome> {
  return changed(await addEntry(leaseId, key, form, await getLocale()));
}

export async function reverseEntryAction(
  leaseId: string,
  entryId: string,
  key: string,
  form: FormData,
): Promise<LedgerOutcome> {
  return changed(await reverseEntry(leaseId, entryId, key, form, await getLocale()));
}
