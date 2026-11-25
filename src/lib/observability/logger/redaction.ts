import {
  ALLOWED_METADATA_KEYS,
  MAX_ARRAY_ITEMS,
  MAX_DEPTH,
  MAX_STACK_LINES,
  MAX_STRING_LENGTH,
  REDACTED,
} from "./logger.config";
import type { LogMetadata } from "./logger.types";

/**
 * Isomorphic redaction (browser and server). Applied recursively to metadata, errors, stacks and
 * URLs BEFORE any emission. Keys matching `SENSITIVE_KEY` are replaced wholesale; strings are
 * scanned for secrets and personal identifiers.
 */

const SENSITIVE_KEY =
  /(pass(word|wd|phrase)?|pwd|secret|token|authorization|cookie|session|apikey|credential|otp|mfa|csrf|email|courriel|phone|telephone|mobile|firstname|lastname|fullname|givenname|surname|prenom|address|adresse|postalcode|zipcode|iban|cardnumber|cvv|cvc|signature|jwt|bearer|birth|body|payload)/i;
const SENSITIVE_EXACT_KEY = /^(sin|nas|ssn|dob|pin|cc|card|name|nom)$/i;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const AUTH_SCHEME = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const COOKIE_HEADER = /\b(set-cookie|cookie)\s*[:=]\s*[^\n]+/gi;
const URL_SECRET_PARAM =
  /([?&](?:token|access_token|refresh_token|id_token|code|password|pwd|secret|key|api_key|apikey|session|sid|otp|signature|sig|email)=)[^&#\s]+/gi;
/** Free-text assignments such as `token=abc`, `password: hunter2` or `api_key=...` (outside a URL query). */
const INLINE_SECRET_ASSIGNMENT =
  /\b(password|passwd|pwd|passphrase|secret|token|api[_-]?key|apikey|authorization|session[_-]?id|otp|signature)(\s*[=:]\s*)[^\s&,;"'}]+/gi;
const PHONE = /(?<![\w.])\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w.])/g;
const CARD_CANDIDATE = /(?<![\w.])(?:\d[ -]?){13,19}(?![\w.])/g;
const LONG_HEX = /\b[A-Fa-f0-9]{40,}\b/g;
const HOME_PATH = /(\/Users|\/home)\/[^/\s]+/g;

function luhn(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^A-Za-z0-9]/g, "");
  return SENSITIVE_KEY.test(normalized) || SENSITIVE_EXACT_KEY.test(normalized);
}

/** Redact secrets and personal identifiers inside free text (messages, URLs, stacks). */
export function redactString(input: string): string {
  let output = input
    .replace(COOKIE_HEADER, `$1: ${REDACTED}`)
    .replace(AUTH_SCHEME, `$1 ${REDACTED}`)
    .replace(JWT, `${REDACTED}:jwt`)
    .replace(URL_SECRET_PARAM, `$1${REDACTED}`)
    .replace(INLINE_SECRET_ASSIGNMENT, `$1$2${REDACTED}`)
    .replace(EMAIL, `${REDACTED}:email`)
    .replace(CARD_CANDIDATE, (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 && luhn(digits) ? `${REDACTED}:card` : match;
    })
    .replace(PHONE, `${REDACTED}:phone`)
    .replace(LONG_HEX, `${REDACTED}:token`)
    .replace(HOME_PATH, "$1/[user]");

  if (output.length > MAX_STRING_LENGTH) {
    output = `${output.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
  }
  return output;
}

function redactStack(stack: string): string {
  return stack
    .split("\n")
    .slice(0, MAX_STACK_LINES)
    .map((line) => redactString(line))
    .join("\n");
}

export interface SerializedError {
  errorName: string;
  errorMessage: string;
  errorCode?: string;
  stack?: string;
  cause?: SerializedError;
}

/** Serialise an unknown thrown value into a redacted, bounded shape. */
export function serializeError(error: unknown, depth = 0): SerializedError {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const serialized: SerializedError = {
      errorName: error.name,
      errorMessage: redactString(error.message),
    };
    if (typeof code === "string" || typeof code === "number") {
      serialized.errorCode = String(code);
    }
    if (error.stack) {
      serialized.stack = redactStack(error.stack);
    }
    if (error.cause !== undefined && depth < 2) {
      serialized.cause = serializeError(error.cause, depth + 1);
    }
    return serialized;
  }
  return {
    errorName: "NonError",
    errorMessage: typeof error === "string" ? redactString(error) : "Non-error value thrown",
  };
}

export function redactValue(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (value instanceof Error) return redactValue(serializeError(value), depth, seen);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  if (value instanceof URL) return redactString(value.toString());
  if (typeof value !== "object") return undefined;
  if (depth >= MAX_DEPTH) return "[MaxDepth]";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactValue(item, depth + 1, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactValue(nested, depth + 1, seen);
  }
  return output;
}

export interface SanitizedMetadata {
  metadata: Record<string, unknown>;
  droppedFieldCount: number;
}

/**
 * Apply the metadata allowlist, then redact what remains. Errors passed under the allowlisted key
 * `error` are expanded into `errorName`, `errorMessage`, `errorCode` and `stack`.
 */
export function sanitizeMetadata(metadata: LogMetadata | undefined): SanitizedMetadata {
  const sanitized: Record<string, unknown> = {};
  let droppedFieldCount = 0;
  if (!metadata) return { metadata: sanitized, droppedFieldCount };

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "error") {
      Object.assign(sanitized, serializeError(value));
      continue;
    }
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      droppedFieldCount += 1;
      continue;
    }
    if (isSensitiveKey(key) && key !== "errorMessage") {
      sanitized[key] = REDACTED;
      continue;
    }
    const redacted = redactValue(value);
    if (redacted !== undefined) sanitized[key] = redacted;
  }
  return { metadata: sanitized, droppedFieldCount };
}
