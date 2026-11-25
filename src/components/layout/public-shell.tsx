import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Link } from "@/i18n/navigation";

/** Minimal public page frame (legal pages, 403, maintenance): logo, language, theme, legal footer. */
export async function PublicShell({ children, width = "max-w-3xl" }: { children: ReactNode; width?: string }) {
  const [t, tCommon] = await Promise.all([getTranslations("auth.shell"), getTranslations("common.a11y")]);

  return (
    <div className="flex min-h-svh flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10">
      <a
        href="#main-content"
        className="bg-background focus:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
      >
        {tCommon("skipToContent")}
      </a>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 py-2">
        <Link href="/login" aria-label="Escalia">
          <BrandLogo className="h-9 sm:h-10" priority />
        </Link>
        <div className="flex items-center gap-1.5">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={`mx-auto w-full flex-1 py-8 ${width}`}>
        {children}
      </main>
      <footer>
        <nav
          aria-label={t("legalNav")}
          className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2 text-sm"
        >
          <Link
            href="/privacy"
            className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
          >
            {t("terms")}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
