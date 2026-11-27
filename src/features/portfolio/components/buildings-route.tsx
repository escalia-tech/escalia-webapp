import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { UnitLeases } from "@/features/leases/components/leases-route";
import { CreateOrganizationCard } from "@/features/organization/components/create-organization-card";
import { failureState, isMissingOrganization } from "@/server/bff-pages/failure";

import { parseBuildingsQuery } from "../schemas/portfolio.schema";
import { fetchDocuments } from "../server/documents.service";
import { fetchBuilding, fetchBuildings } from "../server/portfolio.service";
import { fetchUnit } from "../server/unit.service";
import { BuildingView } from "./building-view";
import { BuildingsTable } from "./buildings-table";
import { DocumentsPanel } from "./documents-panel";
import { NewBuildingForm } from "./new-building-form";
import { UnitAttributesForm } from "./unit-attributes-form";
import { UnitCopyForm } from "./unit-copy-form";
import { UnitHistory } from "./unit-history";

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
        {isMissingOrganization(error) ? (
          <CreateOrganizationCard />
        ) : (
          <Callout tone="warning">{t(`states.${failureState(error)}`)}</Callout>
        )}
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
        <div className="mt-5">
          <DocumentsSection subjectType="BUILDING" subjectId={building.id} />
        </div>
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

/** The documents panel of a building or unit; a failure shows a message and leaves the rest of the page. */
async function DocumentsSection({ subjectType, subjectId }: { subjectType: "BUILDING" | "UNIT"; subjectId: string }) {
  const [t, locale] = await Promise.all([getTranslations("portfolio"), getLocale()]);
  try {
    return <DocumentsPanel page={await fetchDocuments(subjectType, subjectId, locale)} />;
  } catch (error) {
    return <Callout tone="warning">{t(`states.${failureState(error)}`)}</Callout>;
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

/** One unit: its attributes (FR-PORT-02), copy to other units, and history. */
export async function UnitRoute({ id }: { id: string }) {
  const [t, locale] = await Promise.all([getTranslations("portfolio"), getLocale()]);
  try {
    const unit = await fetchUnit(id, locale);
    const title = t("unit.title", { label: unit.label });
    return (
      <>
        <PageHeader
          title={title}
          description={`${unit.buildingName} (${unit.buildingCode})`}
          breadcrumbs={[
            ...(await crumbs(t("list.title"))).slice(0, 1),
            { label: unit.buildingName, href: `/buildings/${unit.buildingId}` as `/${string}` },
            { label: title },
          ]}
        />
        <div className="grid gap-5">
          {unit.archived ? <Callout tone="warning">{t("unit.archived")}</Callout> : null}
          <p className="text-muted-foreground text-sm">{t("unit.intro")}</p>
          <UnitAttributesForm key={unit.current?.version ?? 0} unitId={unit.id} current={unit.current?.attributes} />
          <UnitCopyForm unit={unit} />
          <UnitLeases unitId={unit.id} />
          <UnitHistory history={unit.history} />
          <DocumentsSection subjectType="UNIT" subjectId={unit.id} />
        </div>
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
