import type { NextRequest } from "next/server";

import { type AppLocale, defaultLocale, isAppLocale } from "@/i18n/routing";
import { COOKIE_NAMES } from "@/lib/cookies";

function localeFromAcceptLanguage(header: string | null): AppLocale | undefined {
  if (!header) return undefined;
  const tags = header
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim().split(";")[0])
    .filter(Boolean);
  for (const tag of tags) {
    if (tag.startsWith("en")) return "en-CA";
    if (tag.startsWith("fr")) return "fr-CA";
  }
  return undefined;
}

function savedPreferenceLocale(request: NextRequest): string | undefined {
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

/** Temporary session override or saved demo preference (if signed in). */
export function resolveEscaliaLocalePriority(request: NextRequest): AppLocale | undefined {
  const sessionOverride = request.cookies.get(COOKIE_NAMES.localeSession)?.value;
  if (isAppLocale(sessionOverride)) return sessionOverride;
  const preferred = savedPreferenceLocale(request);
  if (isAppLocale(preferred)) return preferred;
  return undefined;
}

/** Session override > saved demo preference > locale cookie > Accept-Language > fr-CA. */
export function resolvePublicLocale(request: NextRequest): AppLocale {
  const priority = resolveEscaliaLocalePriority(request);
  if (priority) return priority;
  const saved = request.cookies.get(COOKIE_NAMES.locale)?.value;
  if (isAppLocale(saved)) return saved;

  return localeFromAcceptLanguage(request.headers.get("accept-language")) ?? defaultLocale;
}
