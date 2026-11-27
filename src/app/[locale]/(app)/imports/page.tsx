import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ImportsRoute } from "@/features/imports/components/imports-route";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("imports");
  return { title: t("title") };
}

export default function Page() {
  // Imports live in the platform core; the demo data has none.
  if (!getServerEnv().bffBaseUrl) notFound();
  return <ImportsRoute />;
}
