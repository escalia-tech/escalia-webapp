import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrganizationRoute } from "@/features/organization/components/organization-route";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("organization.settings");
  return { title: t("title") };
}

export default function Page() {
  // The organization lives in the platform core; demo data has none.
  if (!getServerEnv().bffBaseUrl) notFound();
  return <OrganizationRoute />;
}
