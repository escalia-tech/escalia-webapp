import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LeasesRoute } from "@/features/leases/components/leases-route";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leases");
  return { title: t("title") };
}

export default function Page() {
  // Leases live in the platform core; the demo data has none.
  if (!getServerEnv().bffBaseUrl) notFound();
  return <LeasesRoute />;
}
