"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { addOccupant, createLease, type LeaseOutcome, removeOccupant, saveParties } from "./leases.service";

export type LeaseFormState = LeaseOutcome | undefined;

async function finish(outcome: LeaseOutcome): Promise<LeaseOutcome> {
  if (outcome.status === "done") {
    revalidatePath("/leases", "page");
    revalidatePath("/leases/[leaseId]", "page");
  }
  return outcome;
}

/** The unit page posts here; a new draft opens on its own page. */
export async function createLeaseAction(unitId: string): Promise<LeaseFormState> {
  const locale = await getLocale();
  const outcome = await finish(await createLease(unitId, locale));
  if (outcome.status === "done" && outcome.leaseId) {
    redirect({ href: `/leases/${outcome.leaseId}` as `/${string}`, locale: locale as "fr-CA" | "en-CA" });
  }
  return outcome;
}

export async function savePartiesAction(
  leaseId: string,
  _previous: LeaseFormState,
  form: FormData,
): Promise<LeaseFormState> {
  return finish(await saveParties(leaseId, form, await getLocale()));
}

export async function addOccupantAction(
  leaseId: string,
  _previous: LeaseFormState,
  form: FormData,
): Promise<LeaseFormState> {
  return finish(await addOccupant(leaseId, form, await getLocale()));
}

export async function removeOccupantAction(leaseId: string, personId: string): Promise<LeaseOutcome> {
  return finish(await removeOccupant(leaseId, personId, await getLocale()));
}
