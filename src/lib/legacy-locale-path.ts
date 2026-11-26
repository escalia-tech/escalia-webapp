import { type AppLocale, routing } from "@/i18n/routing";

/** Parses /fr-CA/login → { locale, pathname: /login } for one-time legacy redirects. */
export function parseLegacyLocalePrefix(pathname: string): { locale: AppLocale; pathname: string } | null {
  for (const locale of routing.locales) {
    const base = `/${locale}`;
    if (pathname === base) {
      return { locale, pathname: "/" };
    }
    if (pathname.startsWith(`${base}/`)) {
      const rest = pathname.slice(base.length);
      return { locale, pathname: rest.length ? rest : "/" };
    }
  }
  return null;
}
