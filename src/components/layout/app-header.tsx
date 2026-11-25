"use client";

import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AccountMenu } from "@/components/layout/account-menu";
import { HelpMenu } from "@/components/layout/help-menu";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { SearchCommand } from "@/components/layout/search-command";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { NotificationsState } from "@/features/notifications/types";
import { Link } from "@/i18n/navigation";

interface AppHeaderProps {
  user: { displayName: string; initials: string };
  notifications: NotificationsState;
}

/**
 * Global header: full width, 64px, fixed. Logo (official asset) on the left, an inert slot reserved
 * for the future portfolio/organisation selector, global search, help, notifications, FR/EN, theme
 * and account. Below `md` the secondary controls move into the account menu.
 */
export function AppHeader({ user, notifications }: AppHeaderProps) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");

  return (
    <header className="pt-safe bg-header fixed inset-x-0 top-0 z-40 flex h-(--header-height) items-center gap-2 border-b px-2 sm:px-4">
      <SidebarTrigger label={t("nav.toggle")} className="size-9 shrink-0" />

      <Link href="/dashboard" aria-label={t("header.home")} className="flex shrink-0 items-center rounded-md px-1">
        <BrandLogo priority className="h-8 sm:h-10" />
      </Link>

      {/* Reserved for the future portfolio / organisation selector: intentionally inert. */}
      <div data-slot="portfolio-slot" aria-hidden className="hidden w-4 lg:block" />

      <Badge variant="secondary" className="hidden shrink-0 lg:inline-flex" title={tc("demo.description")}>
        {tc("demo.environmentLabel")}
      </Badge>

      <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-4">
        <SearchCommand />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div className="hidden md:block">
          <HelpMenu />
        </div>
        <NotificationsMenu state={notifications} />
        <div className="hidden md:block">
          <LocaleSwitcher />
        </div>
        <div className="hidden md:block">
          <ThemeSwitcher />
        </div>
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
