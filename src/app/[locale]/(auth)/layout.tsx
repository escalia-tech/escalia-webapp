import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { AuthIllustration } from "@/features/auth/components/auth-illustration";
import { Link } from "@/i18n/navigation";

/**
 * Public authentication shell: form (55%) and decorative panel (45%) on desktop; form only on small
 * screens, with safe-area padding for WebView / notched devices. No role, organisation or fake
 * provider is ever shown here.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const [t, tCommon] = await Promise.all([getTranslations("auth.shell"), getTranslations("common.a11y")]);

  return (
    <div className="grid min-h-svh lg:grid-cols-[55fr_45fr]">
      <a
        href="#main-content"
        className="bg-background focus:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
      >
        {tCommon("skipToContent")}
      </a>

      <div className="flex min-w-0 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10">
        <header className="flex items-center justify-between gap-3 py-2">
          <Link href="/login" aria-label="Escalia">
            <BrandLogo className="h-9 sm:h-10" priority />
          </Link>
          <div className="flex items-center gap-1.5">
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          aria-label={t("mainLabel")}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8"
        >
          {children}
        </main>

        <footer>
          <nav
            aria-label={t("legalNav")}
            className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2 text-sm"
          >
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
            >
              {t("privacy")}
              <span className="sr-only"> {t("newTab")}</span>
            </Link>
            <Link
              href="/terms"
              target="_blank"
              rel="noopener"
              className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
            >
              {t("terms")}
              <span className="sr-only"> {t("newTab")}</span>
            </Link>
          </nav>
        </footer>
      </div>

      <aside className="hidden p-4 pl-0 lg:block" aria-hidden>
        <div className="bg-secondary text-secondary-foreground relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-10">
          <p lang="fr" className="max-w-xs text-2xl font-semibold tracking-tight text-balance">
            {t("tagline")}
          </p>
          <AuthIllustration className="mx-auto w-full max-w-md" />
        </div>
      </aside>
    </div>
  );
}
