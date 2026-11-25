import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.notifications");
  return { title: t("title") };
}

export default async function NotificationsSettingsPage() {
  const t = await getTranslations("settings.notifications");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState icon={BellOff} title={t("unavailableTitle")} description={t("unavailableBody")} />
      </CardContent>
    </Card>
  );
}
