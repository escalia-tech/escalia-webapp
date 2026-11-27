"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { createOrganization, type OrganizationOutcome, renameOrganization } from "./organization.service";

export type OrganizationFormState = OrganizationOutcome | undefined;

/** The onboarding card posts here; once created, every page of the app can load the organization's data. */
export async function createOrganizationAction(
  _previous: OrganizationFormState,
  form: FormData,
): Promise<OrganizationFormState> {
  const outcome = await createOrganization(String(form.get("name") ?? ""), await getLocale());
  if (outcome.status === "saved") revalidatePath("/", "layout");
  return outcome;
}

export async function renameOrganizationAction(
  _previous: OrganizationFormState,
  form: FormData,
): Promise<OrganizationFormState> {
  const outcome = await renameOrganization(String(form.get("name") ?? ""), await getLocale());
  if (outcome.status === "saved") revalidatePath("/settings/organization", "page");
  return outcome;
}
