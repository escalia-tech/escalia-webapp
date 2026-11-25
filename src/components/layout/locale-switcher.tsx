"use client";

import { useSearchParams } from "next/navigation";

import { ChevronDown, Globe2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`${LOCALE_META[locale].short} — ${t("label")}`}
          title={t("temporary")}
          className={`h-9 gap-1.5 px-2 text-xs font-semibold ${className ?? ""}`}
        >
          <Globe2 className="size-4" aria-hidden />
          <span>{LOCALE_META[locale].short}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuRadioGroup value={locale} onValueChange={onChange} aria-label={t("label")}>
          {locales.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={LOCALE_META[code].htmlLang} className="py-2">
              {LOCALE_META[code].nativeName}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
