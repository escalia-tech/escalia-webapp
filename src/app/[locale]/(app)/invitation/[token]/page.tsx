import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InvitationRoute } from "@/features/leases/components/tenant-route";
import { getServerEnv } from "@/server/config/env";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leases");
  // The link carries a secret: it must not be indexed or sent on as a referrer.
  return { title: t("accept.title"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function Page({ params }: PageProps) {
  if (!getServerEnv().bffBaseUrl) notFound();
  const { token } = await params;
  return <InvitationRoute token={token} />;
}
