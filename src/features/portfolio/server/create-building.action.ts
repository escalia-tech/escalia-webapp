"use server";

import { redirect } from "next/navigation";

import { getLocale } from "next-intl/server";

import { createBuilding } from "./create-building";

export type CreateBuildingState = { error: "invalid" | "refused"; message?: string } | undefined;

/** The add-building form posts here. On success the person lands on the new building. */
export async function createBuildingAction(
  _previous: CreateBuildingState,
  form: FormData,
): Promise<CreateBuildingState> {
  const locale = await getLocale();
  const outcome = await createBuilding(Object.fromEntries(form), locale);
  if (outcome.status === "created") redirect(`/${locale}/buildings/${outcome.id}`);
  if (outcome.status === "invalid") return { error: "invalid" };
  return { error: "refused", message: outcome.message };
}
