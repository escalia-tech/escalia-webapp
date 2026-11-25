import { hasLocale } from "next-intl";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** The locale root has no content of its own: send visitors to the app (which sends them to sign-in when needed). */
export default async function LocaleRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
}
