import { NextRequest, NextResponse } from "next/server";

import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { COOKIE_NAMES, ONE_YEAR_SECONDS } from "@/lib/cookies";
import { parseLegacyLocalePrefix } from "@/lib/legacy-locale-path";
import {
  CORRELATION_ID_HEADER,
  formatTraceparent,
  resolveCorrelationId,
  resolveTraceContext,
  TRACEPARENT_HEADER,
} from "@/lib/observability/tracing/correlation";
import { THIRD_PARTY_STYLE_HASHES } from "@/lib/security/style-hashes";

const handleI18n = createIntlMiddleware(routing);

/**
 * Next.js 16 `proxy` (formerly middleware). Runs for page requests only (the BFF under /api is excluded):
 *  - redirects legacy locale-prefixed URLs to clean paths (compatibility, no loop);
 *  - assigns/validates the correlation id and trace context and forwards them to the server render;
 *  - generates the per-request CSP nonce (pages therefore render dynamically);
 *  - delegates clean URL routing to next-intl (`localePrefix: "never"`).
 * It deliberately performs NO authorisation: access control lives in server layouts and BFF handlers.
 */

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    isDev
      ? "style-src 'self' 'unsafe-inline'"
      : `style-src 'self' 'nonce-${nonce}' '${THIRD_PARTY_STYLE_HASHES.sonner}' '${THIRD_PARTY_STYLE_HASHES.emptyStyle}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' blob: data:`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const legacy = parseLegacyLocalePrefix(pathname);
  if (legacy) {
    const target = new URL(request.url);
    target.pathname = legacy.pathname;
    target.search = search;
    const response = NextResponse.redirect(target, 308);
    response.cookies.set(COOKIE_NAMES.locale, legacy.locale, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
    return response;
  }

  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_ID_HEADER));
  const trace = resolveTraceContext(request.headers.get(TRACEPARENT_HEADER));
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId);
  requestHeaders.set(TRACEPARENT_HEADER, formatTraceparent(trace));
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = handleI18n(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set("content-security-policy", csp);
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
