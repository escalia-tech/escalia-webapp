import type { ZodType } from "zod";

import { ApplicationError } from "@/lib/observability/errors/application-error";

/**
 * One GET to escalia-bff, validated against the page contract (escalia-bff `pages.yaml`). The browser's session
 * cookie is forwarded as it is: the webapp never holds a token. Failures become application errors so the page
 * can show a safe state; no body of a failed call is ever logged or shown.
 */

/** The core's answer when the signed-in person belongs to no organization yet (FR-PORT-01 BR-1). */
const MISSING_ORGANIZATION = "identity.organization.not_found";

/** The `code` of a problem body (RFC 9457), if it has one; the body is never logged. */
async function problemCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "code" in body && typeof body.code === "string") return body.code;
  } catch {
    // Not JSON: no code.
  }
  return undefined;
}

export interface BffCall<T> {
  baseUrl: string | undefined;
  path: `/pages/${string}`;
  query?: Record<string, string | undefined>;
  cookie: string;
  language: string;
  schema: ZodType<T>;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}

export async function callBffPage<T>(call: BffCall<T>): Promise<T> {
  if (!call.baseUrl) {
    throw new ApplicationError("upstream.unavailable", "The BFF is not configured", { retryable: false });
  }
  const url = new URL(call.path, call.baseUrl);
  for (const [name, value] of Object.entries(call.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(name, value);
  }
  const fetcher = call.fetcher ?? fetch;
  const response = await fetcher(url, {
    headers: { accept: "application/json", "accept-language": call.language, cookie: call.cookie },
    cache: "no-store",
    signal: call.signal,
  });
  if (response.status === 401) throw new ApplicationError("auth.unauthenticated", "Authentication is required");
  if (response.status === 403) throw new ApplicationError("auth.forbidden", "Not allowed");
  if (response.status === 404) {
    if ((await problemCode(response)) === MISSING_ORGANIZATION) {
      throw new ApplicationError("organization.missing", "The person has no organization yet");
    }
    throw new ApplicationError("resource.not_found", "Not found");
  }
  if (!response.ok) {
    throw new ApplicationError("upstream.unavailable", `The BFF answered ${response.status}`, { retryable: true });
  }
  const parsed = call.schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApplicationError("upstream.unavailable", "The BFF answered with an unexpected shape", {
      retryable: false,
    });
  }
  return parsed.data;
}

export interface BffAction {
  baseUrl: string | undefined;
  path: `/actions/${string}`;
  body: unknown;
  cookie: string;
  /** Value of the XSRF-TOKEN cookie; the BFF checks it against the header (double submit). */
  xsrfToken: string | undefined;
  language: string;
  /** Makes a repeated call do its work once, for the actions that move money (the core keeps the key). */
  idempotencyKey?: string;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}

export type BffActionResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; code: string | undefined; message: string | undefined };

/** One POST to an action of escalia-bff. A refusal of the core comes back as data (RFC 9457), never as an exception. */
export async function callBffAction(call: BffAction): Promise<BffActionResult> {
  if (!call.baseUrl) {
    throw new ApplicationError("upstream.unavailable", "The BFF is not configured", { retryable: false });
  }
  const isForm = call.body instanceof FormData;
  const headers: Record<string, string> = {
    accept: "application/json, application/problem+json",
    "accept-language": call.language,
    cookie: call.cookie,
  };
  // A multipart body gets its boundary from fetch itself, so no content type is set for it.
  if (!isForm) headers["content-type"] = "application/json";
  if (call.xsrfToken) headers["x-xsrf-token"] = call.xsrfToken;
  if (call.idempotencyKey) headers["idempotency-key"] = call.idempotencyKey;
  const response = await (call.fetcher ?? fetch)(new URL(call.path, call.baseUrl), {
    method: "POST",
    headers,
    body: call.body instanceof FormData ? call.body : JSON.stringify(call.body),
    cache: "no-store",
    signal: call.signal,
  });
  if (response.status === 401) throw new ApplicationError("auth.unauthenticated", "Authentication is required");
  if (response.status >= 500) {
    throw new ApplicationError("upstream.unavailable", `The BFF answered ${response.status}`, { retryable: true });
  }
  const payload: unknown = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, body: payload };
  const problem = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    ok: false,
    status: response.status,
    code: typeof problem.code === "string" ? problem.code : undefined,
    message: typeof problem.detail === "string" ? problem.detail : undefined,
  };
}
