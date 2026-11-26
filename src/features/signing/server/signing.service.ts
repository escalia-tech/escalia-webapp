import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  CODE,
  type Invalid,
  LINK_TOKEN,
  otpSentSchema,
  parseSignatureForm,
  REQUEST_ID,
  type RefusalKey,
  refusalKey,
  type SealedCheck,
  SHA256,
  type SignerView,
  signPageSchema,
  verifyPageSchema,
  type Who,
} from "../schemas/signing.schema";

export type Outcome =
  | { status: "done" }
  | { status: "invalid"; reason: Invalid }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

export type CodeOutcome =
  | { status: "sent"; maskedEmail: string }
  | { status: "invalid"; reason: Invalid }
  | { status: "refused"; reason: RefusalKey | undefined; message: string | undefined };

function valid(who: Who): boolean {
  return who.kind === "session" ? REQUEST_ID.test(who.requestId) : LINK_TOKEN.test(who.token);
}

function actionPath(who: Who, operation: string): `/actions/${string}` {
  return who.kind === "session"
    ? `/actions/signing/${who.requestId}/${operation}`
    : `/actions/signing-link/${who.token}/${operation}`;
}

/** The request as the signer sees it. */
export async function fetchSignView(who: Who, language: string): Promise<SignerView> {
  const path = who.kind === "session" ? `/pages/sign/${who.requestId}` : `/pages/sign/link/${who.token}`;
  return (await fetchBffPage("signing.page", path as `/pages/${string}`, signPageSchema, { language })).request;
}

/** The public check of a file's hash; it answers with the title, the date and the number of signers only. */
export async function fetchVerification(sha256: string, language: string): Promise<SealedCheck | undefined> {
  if (!SHA256.test(sha256)) return undefined;
  return (await fetchBffPage("signing.verify", `/pages/verify/${sha256.toLowerCase()}`, verifyPageSchema, { language }))
    .result;
}

async function send(who: Who, operation: string, body: unknown, language: string): Promise<Outcome> {
  if (!valid(who)) return { status: "invalid", reason: "id" };
  const result = await postBffAction(`signing.${operation}`, actionPath(who, operation), body, language);
  return result.ok
    ? { status: "done" }
    : { status: "refused", reason: refusalKey(result.code), message: result.message };
}

/** BR-2: asks for a code by email. */
export async function sendCode(who: Who, language: string): Promise<CodeOutcome> {
  if (!valid(who)) return { status: "invalid", reason: "id" };
  const result = await postBffAction("signing.send-otp", actionPath(who, "send-otp"), {}, language);
  if (!result.ok) return { status: "refused", reason: refusalKey(result.code), message: result.message };
  const sent = otpSentSchema.safeParse(result.body);
  return { status: "sent", maskedEmail: sent.success ? sent.data.maskedEmail : "" };
}

export async function verifyCode(who: Who, form: FormData, language: string): Promise<Outcome> {
  const code = String(form.get("code") ?? "").trim();
  if (!CODE.test(code)) return { status: "invalid", reason: "code" };
  return send(who, "verify-otp", { code }, language);
}

/** BR-3: consent to sign electronically. */
export async function consent(who: Who, language: string): Promise<Outcome> {
  return send(who, "consent", {}, language);
}

export async function preferPaper(who: Who, language: string): Promise<Outcome> {
  return send(who, "paper", {}, language);
}

/** BR-9: a decline needs a reason. */
export async function decline(who: Who, form: FormData, language: string): Promise<Outcome> {
  const reason = String(form.get("reason") ?? "").trim();
  if (reason === "" || reason.length > 500) return { status: "invalid", reason: "reason" };
  return send(who, "decline", { reason }, language);
}

/** BR-4 to BR-7: the typed name, with the drawing when there is one. */
export async function sign(who: Who, form: FormData, language: string): Promise<Outcome> {
  const parsed = parseSignatureForm(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  return send(who, "sign", parsed.body, language);
}
