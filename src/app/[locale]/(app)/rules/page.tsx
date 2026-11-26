import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { RulesTable } from "@/features/rules/components/rules-table";
import { parseRulesQuery, type RulesPage } from "@/features/rules/schemas/rules.schema";
import { getRules } from "@/features/rules/server/rules.service";
import { isApplicationError } from "@/lib/observability/errors/application-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rules");
  return { title: t("title") };
}

type FailureState = "notConnected" | "unauthenticated" | "forbidden" | "unavailable";

function failureState(error: unknown): FailureState {
  if (!isApplicationError(error)) return "unavailable";
  if (error.code === "auth.unauthenticated") return "unauthenticated";
  if (error.code === "auth.forbidden") return "forbidden";
  if (error.code === "upstream.unavailable" && !error.retryable) return "notConnected";
  return "unavailable";
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
  let failure: FailureState | undefined;
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
      {failure ? <Callout tone="warning">{t(`states.${failure}`)}</Callout> : null}
      {page ? <RulesTable page={page} search={query.q ?? ""} locale={locale} /> : null}
    </>
  );
}
