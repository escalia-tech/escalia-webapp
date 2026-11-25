import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { PropertiesList } from "@/features/properties/components/properties-list";
import { parseListQuery, toSearchParams } from "@/features/properties/lib/list-query";
import type { PropertyListResult } from "@/features/properties/schemas/property.schema";
import { listProperties } from "@/features/properties/server/properties.service";
import { isApplicationError } from "@/lib/observability/errors/application-error";
import { getLogger } from "@/lib/observability/logger/logger.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("title") };
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, tNav, rawParams] = await Promise.all([
    getTranslations("properties"),
    getTranslations("shell.nav.items"),
    searchParams,
  ]);
  const query = parseListQuery(rawParams);
  const initialQueryString = toSearchParams(query).toString();

  // The first page is rendered on the server (fast first paint). A failure here must not break the
  // page: the client falls back to the BFF and shows loading / error states with a safe retry.
  // Demo failure scenarios are deliberately left to the client so the states are visible.
  let initialData: PropertyListResult | undefined;
  if (!query.scenario) {
    try {
      initialData = await listProperties(query);
    } catch (error) {
      getLogger("properties").warn("properties.list.initial_load_failed", {
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
      <PropertiesList initialData={initialData} initialQueryString={initialQueryString} />
    </>
  );
}
