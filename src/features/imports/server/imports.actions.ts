"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { type ImportOutcome, runImport, saveImportMapping, uploadImport } from "./imports.service";

export type ImportState = ImportOutcome | undefined;

/** The upload form posts here; a file that was read opens on its own page. */
export async function uploadImportAction(_previous: ImportState, form: FormData): Promise<ImportOutcome> {
  const locale = await getLocale();
  const outcome = await uploadImport(form, locale);
  if (outcome.status === "done" && outcome.job) {
    redirect({ href: `/imports/${outcome.job.id}` as `/${string}`, locale: locale as "fr-CA" | "en-CA" });
  }
  return outcome;
}

export async function saveMappingAction(jobId: string, _previous: ImportState, form: FormData): Promise<ImportOutcome> {
  const outcome = await saveImportMapping(jobId, form, await getLocale());
  if (outcome.status === "done") revalidatePath("/imports/[jobId]", "page");
  return outcome;
}

export async function runImportAction(jobId: string, _previous: ImportState): Promise<ImportOutcome> {
  const outcome = await runImport(jobId, await getLocale());
  if (outcome.status === "done") revalidatePath("/imports/[jobId]", "page");
  return outcome;
}
