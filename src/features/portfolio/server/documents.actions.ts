"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import type { PanelSubject } from "../schemas/documents.schema";
import {
  changeSharing,
  type DocumentOutcome,
  downloadLink,
  liftHold,
  placeHold,
  uploadDocument,
} from "./documents.service";

export type DocumentFormState = DocumentOutcome | undefined;

async function finish(outcome: DocumentOutcome): Promise<DocumentOutcome> {
  if (outcome.status === "done") {
    revalidatePath("/buildings/[id]", "page");
    revalidatePath("/units/[unitId]", "page");
  }
  return outcome;
}

export async function uploadDocumentAction(
  subjectType: PanelSubject,
  subjectId: string,
  _previous: DocumentFormState,
  form: FormData,
): Promise<DocumentFormState> {
  return finish(await uploadDocument(subjectType, subjectId, form, await getLocale()));
}

export async function sharingAction(documentId: string, share: boolean): Promise<DocumentOutcome> {
  return finish(await changeSharing(documentId, share, await getLocale()));
}

export async function downloadAction(documentId: string): Promise<DocumentOutcome> {
  return downloadLink(documentId, await getLocale());
}

export async function placeHoldAction(
  subjectType: PanelSubject,
  subjectId: string,
  _previous: DocumentFormState,
  form: FormData,
): Promise<DocumentFormState> {
  return finish(await placeHold(subjectType, subjectId, form, await getLocale()));
}

export async function liftHoldAction(holdId: string): Promise<DocumentOutcome> {
  return finish(await liftHold(holdId, await getLocale()));
}
