import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UnitRoute } from "@/features/portfolio/components/buildings-route";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ unitId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portfolio");
  return { title: t("unit.tabAttributes") };
}

export default async function UnitPage({ params }: PageProps) {
  // Unit attributes live in the platform core; the demo data has no units.
  if (!getServerEnv().bffBaseUrl) notFound();
  const { unitId } = await params;
  return <UnitRoute id={unitId} />;
}
