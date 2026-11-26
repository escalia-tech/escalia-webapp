import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignRoute } from "@/features/signing/components/sign-route";
import { LINK_TOKEN } from "@/features/signing/schemas/signing.schema";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signing");
  // The link carries a secret: it must not be indexed or sent on as a referrer.
  return { title: t("title"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  if (!getServerEnv().bffBaseUrl || !LINK_TOKEN.test(token)) notFound();
  return <SignRoute who={{ kind: "link", token }} />;
}
