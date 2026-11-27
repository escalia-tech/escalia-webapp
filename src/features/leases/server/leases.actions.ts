"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import {
  type AcceptOutcome,
  acceptInvitation,
  addOccupant,
  cancelLease,
  createLease,
  fetchClauseGProposal,
  type InviteOutcome,
  inviteParties,
  type LeaseOutcome,
  type ProposalOutcome,
  type RequestOutcome,
  removeOccupant,
  requestNewInvitation,
  saveParties,
  saveTerms,
} from "./leases.service";

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

export async function inviteAction(leaseId: string): Promise<InviteOutcome> {
  const outcome = await inviteParties(leaseId, await getLocale());
  if (outcome.status === "sent") revalidatePath("/leases/[leaseId]", "page");
  return outcome;
}

export type AcceptFormState = AcceptOutcome | undefined;

/** The invitation page posts here; a person who joined lands on their lease. */
export async function acceptInvitationAction(
  token: string,
  _previous: AcceptFormState,
  form: FormData,
): Promise<AcceptFormState> {
  const locale = await getLocale();
  const outcome = await acceptInvitation(token, form, locale);
  if (outcome.status === "joined") {
    revalidatePath("/tenant", "page");
    redirect({ href: `/tenant/${outcome.leaseId}` as `/${string}`, locale: locale as "fr-CA" | "en-CA" });
  }
  return outcome;
}

export async function requestNewInvitationAction(token: string): Promise<RequestOutcome> {
  return requestNewInvitation(token, await getLocale());
}

export async function saveTermsAction(
  leaseId: string,
  _previous: LeaseFormState,
  form: FormData,
): Promise<LeaseFormState> {
  return finish(await saveTerms(leaseId, form, await getLocale()));
}

export async function cancelLeaseAction(leaseId: string): Promise<LeaseOutcome> {
  return finish(await cancelLease(leaseId, await getLocale()));
}

export async function clauseGProposalAction(leaseId: string): Promise<ProposalOutcome> {
  return fetchClauseGProposal(leaseId, await getLocale());
}
