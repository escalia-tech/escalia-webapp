"use client";

import { useSearchParams } from "next/navigation";

import { useLocale, useTranslations } from "next-intl";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LOCALE_META } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type AppLocale, isAppLocale, locales } from "@/i18n/routing";
import { COOKIE_NAMES } from "@/lib/cookies";

/** Writes the temporary (session) language override: no Max-Age, cleared on sign-out. */
export function writeLocaleSessionOverride(locale: AppLocale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAMES.localeSession}=${locale}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Immediate FR / EN switch. Keeps the current route, query string and dynamic segments, and only
 * sets a temporary session override: the permanent preference is changed exclusively in
 * Settings > Preferences.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("shell.header.locale");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    if (!isAppLocale(next) || next === locale) return;
    writeLocaleSessionOverride(next);
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
  }

  return (
    <ToggleGroup
      type="single"
      value={locale}
      onValueChange={onChange}
      variant="outline"
      size="sm"
      aria-label={t("label")}
      title={t("temporary")}
      className={className}
    >
      {locales.map((code) => (
        <ToggleGroupItem
          key={code}
          value={code}
          lang={LOCALE_META[code].htmlLang}
          aria-label={LOCALE_META[code].nativeName}
          className="min-w-9 px-2 text-xs font-semibold"
        >
          {LOCALE_META[code].short}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
