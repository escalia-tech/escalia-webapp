import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TenantLeaseRoute } from "@/features/leases/components/tenant-route";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ leaseId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leases");
  return { title: t("one.title") };
}

export default async function Page({ params }: PageProps) {
  if (!getServerEnv().bffBaseUrl) notFound();
  const { leaseId } = await params;
  return <TenantLeaseRoute id={leaseId} />;
}
