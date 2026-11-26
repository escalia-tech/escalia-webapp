import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PreferencesForm } from "@/features/notifications/components/preferences-form";
import { getPreferences } from "@/features/notifications/server/notifications.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.notifications");
  return { title: t("title") };
}

export default async function NotificationsSettingsPage() {
  const t = await getTranslations("settings.notifications");
  const preferences = await getPreferences(await getLocale());

  if (preferences) return <PreferencesForm preferences={preferences} />;

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
