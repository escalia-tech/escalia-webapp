import { z } from "zod";

/** The signing pages of escalia-bff (`SignPage` and `VerifyPage` in `pages.yaml`), as the core's models shape them. */
export const SIGNING_STATES = ["OPEN", "COMPLETED", "DECLINED", "EXPIRED", "WITHDRAWN"] as const;
export const SIGNER_STATES = ["WAITING", "INVITED", "SIGNED", "DECLINED"] as const;
export const AUTH_LEVELS = ["SESSION", "SESSION_OTP", "LINK_OTP"] as const;

export const signerViewSchema = z.object({
  requestId: z.string(),
  title: z.string(),
  language: z.enum(["fr-CA", "en-CA"]),
  purpose: z.string(),
  mode: z.enum(["SEQUENTIAL", "PARALLEL"]),
  state: z.enum(SIGNING_STATES),
  expiresAt: z.string(),
  signerState: z.enum(SIGNER_STATES),
  role: z.string(),
  authLevel: z.enum(AUTH_LEVELS),
  expectedName: z.string(),
  maskedEmail: z.string(),
  consented: z.boolean(),
  verified: z.boolean(),
  sha256: z.string(),
  consentVersion: z.string(),
});
export type SignerView = z.infer<typeof signerViewSchema>;

export const signPageSchema = z.object({ request: signerViewSchema });
export const otpSentSchema = z.object({ maskedEmail: z.string() });
export const verifyPageSchema = z.object({
  result: z.object({
    found: z.boolean(),
    title: z.string().nullish(),
    completedAt: z.string().nullish(),
    signers: z.number().int().nullish(),
  }),
});
export type SealedCheck = z.infer<typeof verifyPageSchema>["result"];

/** Who is at the door: a signed-in person with a request id, or a person who holds only a link. */
export type Who = { kind: "session"; requestId: string } | { kind: "link"; token: string };

export const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const LINK_TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
export const SHA256 = /^[0-9a-fA-F]{64}$/;
export const CODE = /^[0-9]{6}$/;
/** A drawing is at most 200 KB (FR-DOC-02 BR-4); the page sends it as the Base64 part of a PNG data URL. */
export const PNG_DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
export const MAX_DRAWING_CHARS = 270_000;

/** Core refusals the screen explains in its own words; anything else shows the core's message. */
export const REFUSAL_KEYS = {
  "signing.not_found": "notFound",
  "signing.closed": "closed",
  "signing.not_your_turn": "notYourTurn",
  "signing.otp_not_needed": "otpNotNeeded",
  "signing.otp_rate": "otpRate",
  "signing.otp_wrong": "otpWrong",
  "signing.otp_expired": "otpExpired",
  "signing.otp_blocked": "otpBlocked",
  "signing.otp_required": "otpRequired",
  "signing.consent_required": "consentRequired",
  "signing.hash_mismatch": "hashMismatch",
  "signing.name_variation": "nameVariation",
  "signing.already_done": "alreadyDone",
  "signing.batch_not_allowed": "batchNotAllowed",
  "signing.drawing_invalid": "drawingInvalid",
  "signing.verify_rate": "verifyRate",
} as const;
export type RefusalKey = (typeof REFUSAL_KEYS)[keyof typeof REFUSAL_KEYS];

export function refusalKey(code: string | undefined): RefusalKey | undefined {
  return code !== undefined && code in REFUSAL_KEYS ? REFUSAL_KEYS[code as keyof typeof REFUSAL_KEYS] : undefined;
}

export type Invalid = "id" | "code" | "name" | "reason" | "drawing" | "hash";

/** The typed name and the drawing of a signature, read from the form; the core checks the name against the account. */
export type SignatureBody = { typedName: string; confirmVariation: boolean; drawnPng?: string };

export function parseSignatureForm(form: FormData): { ok: true; body: SignatureBody } | { ok: false; reason: Invalid } {
  const typedName = String(form.get("typedName") ?? "").trim();
  if (typedName.length < 2 || typedName.length > 120) return { ok: false, reason: "name" };
  const drawing = String(form.get("drawing") ?? "");
  const body: SignatureBody = { typedName, confirmVariation: form.get("confirmVariation") === "on" };
  if (drawing !== "") {
    const match = PNG_DATA_URL.exec(drawing);
    if (!match?.[1] || match[1].length > MAX_DRAWING_CHARS) return { ok: false, reason: "drawing" };
    body.drawnPng = match[1];
  }
  return { ok: true, body };
}
