import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ImportRoute } from "@/features/imports/components/imports-route";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ jobId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("imports");
  return { title: t("title") };
}

export default async function ImportPage({ params }: PageProps) {
  if (!getServerEnv().bffBaseUrl) notFound();
  const { jobId } = await params;
  return <ImportRoute id={jobId} />;
}
