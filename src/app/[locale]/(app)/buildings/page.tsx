import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { BuildingsList } from "@/features/buildings/components/buildings-list";
import { parseListQuery, toSearchParams } from "@/features/buildings/lib/list-query";
import type { BuildingListResult } from "@/features/buildings/schemas/building.schema";
import { listBuildings } from "@/features/buildings/server/buildings.service";
import { BuildingsRoute } from "@/features/portfolio/components/buildings-route";
import { isApplicationError } from "@/lib/observability/errors/application-error";
import { getLogger } from "@/lib/observability/logger/logger.server";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("buildings");
  return { title: t("title") };
}

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, tNav, rawParams] = await Promise.all([
    getTranslations("buildings"),
    getTranslations("shell.nav.items"),
    searchParams,
  ]);
  // With a BFF configured the list is the real organization's; without one the labelled demo list stays.
  if (getServerEnv().bffBaseUrl) return <BuildingsRoute rawQuery={rawParams} />;
  const query = parseListQuery(rawParams);
  const initialQueryString = toSearchParams(query).toString();

  // The first page is rendered on the server (fast first paint). A failure here must not break the
  // page: the client falls back to the BFF and shows loading / error states with a safe retry.
  // Demo failure scenarios are deliberately left to the client so the states are visible.
  let initialData: BuildingListResult | undefined;
  if (!query.scenario) {
    try {
      initialData = await listBuildings(query);
    } catch (error) {
      getLogger("buildings").warn("buildings.list.initial_load_failed", {
        errorName: error instanceof Error ? error.name : "unknown",
        errorCode: isApplicationError(error) ? error.code : undefined,
      });
    }
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        demoData
        breadcrumbs={[{ label: tNav("dashboard"), href: "/dashboard" }, { label: t("title") }]}
      />
      <BuildingsList initialData={initialData} initialQueryString={initialQueryString} />
    </>
  );
}
