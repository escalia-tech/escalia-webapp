import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { StatusScreen } from "@/components/feedback/status-screen";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback.status.forbidden");
  return { title: t("title") };
}

export default async function ForbiddenPage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("feedback.status.forbidden"),
    getTranslations("common.actions"),
  ]);
  return (
    <StatusScreen
      code={t("code")}
      title={t("title")}
      description={t("description")}
      actions={
        <Button asChild>
          <Link href="/dashboard">{tCommon("backToDashboard")}</Link>
        </Button>
      }
    />
  );
}
