import { ApplicationError } from "@/lib/observability/errors/application-error";

/**
 * CSRF defence for BFF mutations: the request must come from the application's own origin.
 * `Origin` is compared with the `Host` the request was addressed to. A missing Origin is rejected
 * unless the browser states `Sec-Fetch-Site: same-origin`. Authentication and tenant checks are
 * performed independently by the caller; this check never replaces them.
 */
export function assertSameOrigin(headers: Pick<Headers, "get">): void {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");

  if (origin) {
    let originHost: string | undefined;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = undefined;
    }
    if (originHost && host && originHost === host) return;
    throw new ApplicationError("request.invalid_origin", "Cross-origin mutation rejected");
  }

  if (headers.get("sec-fetch-site") === "same-origin") return;
  throw new ApplicationError("request.invalid_origin", "Missing Origin header on mutation");
}
