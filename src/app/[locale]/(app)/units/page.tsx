import { hasLocale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** No units list in Phase 1 (page model: not planned). Units are reached from their building, so the old address goes there. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/buildings", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
}
