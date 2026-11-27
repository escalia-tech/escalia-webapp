import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { failureState } from "@/server/bff-pages/failure";

import { fetchBylaws } from "../server/bylaws.service";
import { BylawsEditor, BylawsVersions } from "./bylaws-editor";

/** The by-laws of a building: the text in force, its versions, and the way to save a new one (FR-LEASE-03). */
export async function BylawsRoute({ buildingId }: { buildingId: string }) {
  const [t, tPortfolio, tNav, locale] = await Promise.all([
    getTranslations("leases"),
    getTranslations("portfolio"),
    getTranslations("shell.nav.items"),
    getLocale(),
  ]);
  const breadcrumbs = [{ label: tNav("dashboard"), href: "/dashboard" as const }, { label: t("bylaws.title") }];
  try {
    const versions = (await fetchBylaws(buildingId, locale)).toSorted((a, b) => b.version - a.version);
    return (
      <>
        <PageHeader title={t("bylaws.title")} description={t("bylaws.description")} breadcrumbs={breadcrumbs} />
        <div className="grid gap-5 lg:grid-cols-2">
          <BylawsEditor buildingId={buildingId} current={versions.find((one) => one.active)} />
          <BylawsVersions buildingId={buildingId} versions={versions} />
        </div>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title={t("bylaws.title")} breadcrumbs={breadcrumbs} />
        <Callout tone="warning">{tPortfolio(`states.${failureState(error)}`)}</Callout>
      </>
    );
  }
}
