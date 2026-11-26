import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { hasLocale } from "next-intl";

import { AppShell } from "@/components/layout/app-shell";
import { getNotifications } from "@/features/notifications/server/notifications.service";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { COOKIE_NAMES } from "@/lib/cookies";
import { getSession } from "@/server/auth/session";

/**
 * Authenticated application area. Access control happens HERE (server side), not in the proxy and
 * not by hiding menu items: without a session the visitor is redirected to the public login screen.
 * Only the explicit demo session can exist today (no identity provider has been selected).
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;

  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale: resolvedLocale });
    return null;
  }

  const [cookieStore, notifications] = await Promise.all([cookies(), getNotifications(resolvedLocale)]);
  const defaultSidebarOpen = cookieStore.get(COOKIE_NAMES.sidebar)?.value !== "false";

  return (
    <AppShell
      defaultSidebarOpen={defaultSidebarOpen}
      user={{ displayName: session.user.displayName, initials: session.user.initials }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
