"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import { markRead, type NotificationOutcome, savePreferences } from "./notifications.service";

export type PreferencesFormState = NotificationOutcome | undefined;

async function finish(outcome: NotificationOutcome): Promise<NotificationOutcome> {
  if (outcome.status === "done") revalidatePath("/", "layout");
  return outcome;
}

export async function markAllReadAction(): Promise<NotificationOutcome> {
  return finish(await markRead(null, await getLocale()));
}

export async function markReadAction(id: string): Promise<NotificationOutcome> {
  return finish(await markRead([id], await getLocale()));
}

export async function savePreferencesAction(
  _previous: PreferencesFormState,
  form: FormData,
): Promise<PreferencesFormState> {
  return finish(await savePreferences(form, await getLocale()));
}
