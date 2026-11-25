"use client";

import { useState } from "react";

import { LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { writeLocaleSessionOverride } from "@/components/layout/locale-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_META } from "@/i18n/config";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { isAppLocale, locales } from "@/i18n/routing";
import { bffFetch } from "@/lib/bff-client";
import { getClientLogger } from "@/lib/observability/logger/logger.client";

const logger = getClientLogger("account-menu");

const THEMES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

interface AccountMenuProps {
  user: { displayName: string; initials: string };
}

/**
 * Account menu of the demo session. On narrow screens (< md) the language and theme controls move
 * inside this menu to keep the header usable down to 320px.
 */
export function AccountMenu({ user }: AccountMenuProps) {
  const t = useTranslations("shell.header");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [leaving, setLeaving] = useState(false);

  async function leaveDemo() {
    setLeaving(true);
    try {
      const { redirectTo } = await bffFetch<{ redirectTo: string }>(`/api/bff/demo/session?locale=${locale}`, {
        method: "DELETE",
      });
      window.location.assign(redirectTo);
    } catch (error) {
      setLeaving(false);
      logger.warn("auth.session.leave_failed", { reason: error instanceof Error ? error.name : "unknown" });
    }
  }

  function changeLocale(next: string) {
    if (!isAppLocale(next) || next === locale) return;
    writeLocaleSessionOverride(next);
    router.replace(pathname, { locale: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={`${user.initials} — ${t("account.label")}`}
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-foreground text-sm font-medium">{user.displayName}</span>
          <span className="text-muted-foreground text-xs">{t("account.demoSession")}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings/preferences">
              <Settings aria-hidden />
              {t("account.settings")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <div className="md:hidden">
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-muted-foreground text-xs">{tc("locale.label")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
            {locales.map((code) => (
              <DropdownMenuRadioItem key={code} value={code} lang={LOCALE_META[code].htmlLang}>
                {LOCALE_META[code].nativeName}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-muted-foreground text-xs">{tc("theme.label")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
            {THEMES.map(({ value, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon aria-hidden />
                {tc(`theme.${value}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={leaving}
          onSelect={(event) => {
            event.preventDefault();
            void leaveDemo();
          }}
        >
          <LogOut aria-hidden />
          {leaving ? t("account.leaving") : t("account.leaveDemo")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
