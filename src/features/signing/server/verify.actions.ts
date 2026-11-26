"use server";

import { getLocale } from "next-intl/server";

import type { SealedCheck } from "../schemas/signing.schema";
import { fetchVerification } from "./signing.service";

export type CheckOutcome = { status: "checked"; result: SealedCheck } | { status: "failed" };

/** BR-13: asks whether a hash is a sealed Escalia document. A refusal (too many checks) shows as a failure. */
export async function checkHashAction(sha256: string): Promise<CheckOutcome> {
  try {
    const result = await fetchVerification(sha256, await getLocale());
    return result ? { status: "checked", result } : { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}
