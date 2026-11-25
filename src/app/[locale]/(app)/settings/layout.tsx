import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/features/settings/components/settings-nav";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const [t, tNav] = await Promise.all([getTranslations("settings"), getTranslations("shell.nav.items")]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: tNav("dashboard"), href: "/dashboard" }, { label: t("title") }]}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-5">{children}</div>
      </div>
    </>
  );
}
