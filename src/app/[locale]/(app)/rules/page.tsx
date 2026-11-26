import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { RulesTable } from "@/features/rules/components/rules-table";
import { parseRulesQuery, type RulesPage } from "@/features/rules/schemas/rules.schema";
import { getRules } from "@/features/rules/server/rules.service";
import { failureState } from "@/server/bff-pages/failure";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rules");
  return { title: t("title") };
}

export default async function RulesRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [t, tNav, locale, rawParams] = await Promise.all([
    getTranslations("rules"),
    getTranslations("shell.nav.items"),
    getLocale(),
    searchParams,
  ]);
  const query = parseRulesQuery(rawParams);

  let page: RulesPage | undefined;
  let failure: ReturnType<typeof failureState> | undefined;
  try {
    page = await getRules(query, locale);
  } catch (error) {
    failure = failureState(error);
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: tNav("dashboard"), href: "/dashboard" }, { label: t("title") }]}
      />
      {failure ? (
        <Callout tone="warning">{t(`states.${failure === "notFound" ? "unavailable" : failure}`)}</Callout>
      ) : null}
      {page ? <RulesTable page={page} search={query.q ?? ""} locale={locale} /> : null}
    </>
  );
}
