"use server";

import { revalidatePath } from "next/cache";

import { getLocale } from "next-intl/server";

import type { Who } from "../schemas/signing.schema";
import * as service from "./signing.service";

async function finish<T extends { status: string }>(who: Who, outcome: T): Promise<T> {
  if (outcome.status === "done" || outcome.status === "sent") {
    revalidatePath(who.kind === "session" ? "/sign/[requestId]" : "/sign/link/[token]", "page");
  }
  return outcome;
}

export async function sendCodeAction(who: Who): Promise<service.CodeOutcome> {
  return finish(who, await service.sendCode(who, await getLocale()));
}

export async function verifyCodeAction(who: Who, form: FormData): Promise<service.Outcome> {
  return finish(who, await service.verifyCode(who, form, await getLocale()));
}

export async function consentAction(who: Who): Promise<service.Outcome> {
  return finish(who, await service.consent(who, await getLocale()));
}

export async function preferPaperAction(who: Who): Promise<service.Outcome> {
  return finish(who, await service.preferPaper(who, await getLocale()));
}

export async function declineAction(who: Who, form: FormData): Promise<service.Outcome> {
  return finish(who, await service.decline(who, form, await getLocale()));
}

export async function signAction(who: Who, form: FormData): Promise<service.Outcome> {
  return finish(who, await service.sign(who, form, await getLocale()));
}
