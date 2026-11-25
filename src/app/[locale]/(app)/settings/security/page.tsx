import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.security");
  return { title: t("title") };
}

export default async function SecurityPage() {
  const t = await getTranslations("settings.security");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Callout tone="warning" title={t("providerTitle")}>
          {t("providerBody")}
        </Callout>
        <section aria-labelledby="security-session" className="space-y-1">
          <h2 id="security-session" className="text-sm font-semibold">
            {t("sessionTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("sessionBody")}</p>
        </section>
      </CardContent>
    </Card>
  );
}
