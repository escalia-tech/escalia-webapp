"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { copyUnitAttributes, saveUnitAttributes } from "./unit.service";

export type UnitFormState =
  | { status: "saved"; version?: number; count?: number }
  | { status: "invalid" }
  | { status: "refused"; message?: string }
  | undefined;

function formRecord(form: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const record: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(form.keys())) {
    const values = form.getAll(key);
    record[key] = values.length > 1 ? values : (values[0] as FormDataEntryValue);
  }
  return record;
}

/** The unit form posts here; the page shows the new version on the next render. */
export async function saveUnitAttributesAction(
  unitId: string,
  _previous: UnitFormState,
  form: FormData,
): Promise<UnitFormState> {
  const outcome = await saveUnitAttributes(unitId, formRecord(form), await getLocale());
  if (outcome.status === "saved") {
    revalidatePath("/units/[unitId]", "page");
    return { status: "saved", version: outcome.version };
  }
  return outcome.status === "invalid" ? { status: "invalid" } : { status: "refused", message: outcome.message };
}

/** The copy form posts here. */
export async function copyUnitAttributesAction(
  buildingId: string,
  unitId: string,
  _previous: UnitFormState,
  form: FormData,
): Promise<UnitFormState> {
  const outcome = await copyUnitAttributes(buildingId, unitId, formRecord(form), await getLocale());
  if (outcome.status === "copied") {
    revalidatePath("/units/[unitId]", "page");
    return { status: "saved", count: outcome.count };
  }
  return outcome.status === "invalid" ? { status: "invalid" } : { status: "refused", message: outcome.message };
}
