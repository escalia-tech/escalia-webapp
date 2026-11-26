import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { NavKey } from "@/config/navigation";
import { Link } from "@/i18n/navigation";

export type PlannedModuleKey = Exclude<NavKey, "dashboard" | "buildings" | "rules" | "settings" | "tenant">;

/**
 * Translated placeholder for a validated-in-principle but not yet specified capability. It states
 * its status explicitly and offers NO fake action, data or workflow (docs/product/PRODUCT_SPECIFICATION.md).
 */
export async function PlannedModule({ module }: { module: PlannedModuleKey }) {
  const [t, tNav] = await Promise.all([getTranslations("modules"), getTranslations("shell.nav.items")]);

  return (
    <>
      <PageHeader
        title={t(`${module}.title`)}
        description={t(`${module}.description`)}
        breadcrumbs={[{ label: tNav("dashboard"), href: "/dashboard" }, { label: t(`${module}.title`) }]}
        actions={<Badge variant="outline">{t("status.badge")}</Badge>}
      />
      <Empty className="bg-card rounded-lg border border-dashed py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Construction aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{t("status.title")}</EmptyTitle>
          <EmptyDescription>{t("status.body")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p className="text-muted-foreground text-sm">{t("status.noActions")}</p>
          <Button asChild variant="outline">
            <Link href="/buildings">{tNav("buildings")}</Link>
          </Button>
          <p className="text-muted-foreground max-w-md text-xs">{t("status.reference")}</p>
        </EmptyContent>
      </Empty>
    </>
  );
}
