import { hasLocale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** No tenants list in Phase 1 (page model: not planned). Tenants are reached from their lease, so the old address goes there. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/leases", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
}
