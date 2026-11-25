import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StatusScreen } from "@/components/feedback/status-screen";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback.status.maintenance");
  return { title: t("title") };
}

export default async function MaintenancePage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("feedback.status.maintenance"),
    getTranslations("common.actions"),
  ]);
  return (
    <StatusScreen
      code={t("code")}
      title={t("title")}
      description={t("description")}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard">{tCommon("retry")}</Link>
        </Button>
      }
    />
  );
}
