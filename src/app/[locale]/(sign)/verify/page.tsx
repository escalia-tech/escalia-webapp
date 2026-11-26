import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { VerifyForm } from "@/features/signing/components/verify-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signing.verify");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getTranslations("signing.verify");
  return (
    <>
      <PageHeader title={t("title")} />
      <VerifyForm />
    </>
  );
}
