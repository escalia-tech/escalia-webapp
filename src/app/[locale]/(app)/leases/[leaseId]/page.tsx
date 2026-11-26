import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LeaseRoute } from "@/features/leases/components/leases-route";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ leaseId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leases");
  return { title: t("one.title") };
}

export default async function LeasePage({ params }: PageProps) {
  if (!getServerEnv().bffBaseUrl) notFound();
  const { leaseId } = await params;
  return <LeaseRoute id={leaseId} />;
}
