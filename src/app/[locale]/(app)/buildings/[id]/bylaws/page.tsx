import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BylawsRoute } from "@/features/leases/components/bylaws-route";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leases");
  return { title: t("bylaws.title") };
}

export default async function BuildingBylawsPage({ params }: PageProps) {
  if (!getServerEnv().bffBaseUrl) notFound();
  const { id } = await params;
  return <BylawsRoute buildingId={id} />;
}
