import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { failureState } from "@/server/bff-pages/failure";

import { parseBuildingsQuery } from "../schemas/portfolio.schema";
import { fetchBuilding, fetchBuildings } from "../server/portfolio.service";
import { BuildingView } from "./building-view";
import { BuildingsTable } from "./buildings-table";
import { NewBuildingForm } from "./new-building-form";

type RawQuery = Record<string, string | string[] | undefined>;

async function crumbs(title: string) {
  const tNav = await getTranslations("shell.nav.items");
  return [{ label: tNav("dashboard"), href: "/dashboard" as const }, { label: title }];
}

/** The buildings list, fed by the platform core through the BFF. */
export async function BuildingsRoute({ rawQuery }: { rawQuery: RawQuery }) {
  const [t, locale] = await Promise.all([getTranslations("portfolio"), getLocale()]);
  const query = parseBuildingsQuery(rawQuery);
  const header = (
    <PageHeader
      title={t("list.title")}
      description={t("list.description")}
      breadcrumbs={await crumbs(t("list.title"))}
    />
  );
  try {
    const data = await fetchBuildings(query, locale);
    return (
      <>
        {header}
        <BuildingsTable data={data} query={query} />
      </>
    );
  } catch (error) {
    return (
      <>
        {header}
        <Callout tone="warning">{t(`states.${failureState(error)}`)}</Callout>
      </>
    );
  }
}

/** One building with its units and common areas. */
export async function BuildingRoute({ id }: { id: string }) {
  const [t, locale] = await Promise.all([getTranslations("portfolio"), getLocale()]);
  try {
    const building = await fetchBuilding(id, locale);
    return (
      <>
        <PageHeader title={building.displayName} breadcrumbs={await crumbs(building.displayName)} />
        <BuildingView building={building} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title={t("list.title")} breadcrumbs={await crumbs(t("list.title"))} />
        <Callout tone="warning">{t(`states.${failureState(error)}`)}</Callout>
      </>
    );
  }
}

/** The add-building form. */
export async function NewBuildingRoute() {
  const t = await getTranslations("portfolio");
  return (
    <>
      <PageHeader
        title={t("new.title")}
        description={t("new.description")}
        breadcrumbs={await crumbs(t("new.title"))}
      />
      <NewBuildingForm />
    </>
  );
}
