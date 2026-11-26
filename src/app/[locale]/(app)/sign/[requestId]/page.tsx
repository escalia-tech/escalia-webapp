import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignRoute } from "@/features/signing/components/sign-route";
import { REQUEST_ID } from "@/features/signing/schemas/signing.schema";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ requestId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signing");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps) {
  const { requestId } = await params;
  if (!getServerEnv().bffBaseUrl || !REQUEST_ID.test(requestId)) notFound();
  return <SignRoute who={{ kind: "session", requestId }} />;
}
