"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = ["profile", "preferences", "security", "privacy", "notifications"] as const;

/** Section links of the Settings area. Horizontal and scrollable on narrow screens, vertical on desktop. */
export function SettingsNav() {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:w-56 lg:shrink-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col">
        {SECTIONS.map((section) => {
          const active = pathname === `/settings/${section}`;
          return (
            <li key={section} className="shrink-0">
              <Link
                href={`/settings/${section}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:bg-muted flex h-(--button-height) items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(section)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
