import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NewBuildingRoute } from "@/features/portfolio/components/buildings-route";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portfolio.new");
  return { title: t("title") };
}

export default function NewBuildingPage() {
  // Adding a building needs the real platform; the demo data has no such action.
  if (!getServerEnv().bffBaseUrl) notFound();
  return <NewBuildingRoute />;
}
