import "server-only";

import { hasLocale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { isApplicationError } from "@/lib/observability/errors/application-error";

/**
 * When a BFF call failed because the BFF no longer knows the person, send them to the login page and bring them
 * back to `returnTo` afterwards. Any other failure is left to the caller's own error state.
 */
export function redirectIfUnauthenticated(error: unknown, locale: string, returnTo: string): void {
  if (!isApplicationError(error) || error.code !== "auth.unauthenticated") return;
  redirect({
    href: `/login?returnTo=${encodeURIComponent(returnTo)}`,
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
  });
}
