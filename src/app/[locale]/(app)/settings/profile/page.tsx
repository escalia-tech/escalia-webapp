import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const [t, session] = await Promise.all([getTranslations("settings.profile"), getSession()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Callout tone="info" title={t("readOnlyTitle")}>
          {t("readOnlyBody")}
        </Callout>
        <dl className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground text-sm">{t("name")}</dt>
          <dd className="text-sm font-medium break-words">{session?.user.displayName}</dd>
          <dt className="text-muted-foreground text-sm">{t("email")}</dt>
          <dd className="text-sm font-medium break-all">{session?.user.email}</dd>
          <dt className="text-muted-foreground text-sm">{t("session")}</dt>
          <dd className="text-sm font-medium">{t("sessionValue")}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
