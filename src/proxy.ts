import { NextRequest, NextResponse } from "next/server";

import createIntlMiddleware from "next-intl/middleware";

import { isAppLocale, routing } from "@/i18n/routing";
import { COOKIE_NAMES } from "@/lib/cookies";
import {
  CORRELATION_ID_HEADER,
  formatTraceparent,
  resolveCorrelationId,
  resolveTraceContext,
  TRACEPARENT_HEADER,
} from "@/lib/observability/tracing/correlation";
import { THIRD_PARTY_STYLE_HASHES } from "@/lib/security/style-hashes";

/**
 * Next.js 16 `proxy` (formerly middleware). Runs for page requests only (the BFF under /api is excluded):
 *  - assigns/validates the correlation id and trace context and forwards them to the server render;
 *  - generates the per-request CSP nonce (pages therefore render dynamically);
 *  - resolves the language: temporary session override > saved preference (demo adapter) > next-intl
 *    detection (locale cookie > Accept-Language > fr-CA) and keeps /fr-CA | /en-CA prefixes.
 * It deliberately performs NO authorisation: access control lives in server layouts and BFF handlers.
 */

const handleI18n = createIntlMiddleware(routing);

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Element styles stay nonce-bound; the only exception is the hashed CSS Sonner injects at runtime
    // (it cannot take a nonce). Radix/Recharts only set style attributes, allowed by style-src-attr.
    // In development only, Turbopack/HMR injects unnonced <style> elements, so inline styles are allowed there.
    isDev
      ? "style-src 'self' 'unsafe-inline'"
      : `style-src 'self' 'nonce-${nonce}' '${THIRD_PARTY_STYLE_HASHES.sonner}' '${THIRD_PARTY_STYLE_HASHES.emptyStyle}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' blob: data:`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

function pathHasLocale(pathname: string): boolean {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

function savedPreferenceLocale(request: NextRequest): string | undefined {
  // Preferences are only honoured for a signed-in (demo) session; the cookie is written by the BFF.
  if (!request.cookies.get(COOKIE_NAMES.demoSession)?.value) return undefined;
  const raw = request.cookies.get(COOKIE_NAMES.preferences)?.value;
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return typeof parsed === "object" && parsed !== null && "locale" in parsed ? String(parsed.locale) : undefined;
  } catch {
    return undefined;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathHasLocale(pathname)) {
    const override = request.cookies.get(COOKIE_NAMES.localeSession)?.value;
    const preferred = isAppLocale(override) ? override : savedPreferenceLocale(request);
    if (isAppLocale(preferred)) {
      return NextResponse.redirect(new URL(`/${preferred}${pathname === "/" ? "" : pathname}${search}`, request.url));
    }
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
  // Pages only: exclude the BFF, Next internals and any path containing a file extension (assets, favicon).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
