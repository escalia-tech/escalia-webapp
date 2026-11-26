import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { failureState } from "@/server/bff-pages/failure";

import type { Who } from "../schemas/signing.schema";
import { fetchSignView } from "../server/signing.service";
import { SignFlow } from "./sign-flow";

/** The page of one signature request, for a signed-in signer or for a signer who holds only a link (FR-DOC-02). */
export async function SignRoute({ who }: { who: Who }) {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("signing"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  try {
    const view = await fetchSignView(who, locale);
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <SignFlow who={who} view={view} />
      </>
    );
  } catch (error) {
    const state = failureState(error);
    return (
      <>
        <PageHeader title={t("title")} />
        <Callout tone="warning">{state === "notFound" ? t("gone") : tPortfolio(`states.${state}`)}</Callout>
      </>
    );
  }
}
