import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TenantLeasesRoute } from "@/features/leases/components/tenant-route";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leases");
  return { title: t("tenant.title") };
}

export default function Page() {
  if (!getServerEnv().bffBaseUrl) notFound();
  return <TenantLeasesRoute />;
}
