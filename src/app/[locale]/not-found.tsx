import { useTranslations } from "next-intl";

import { StatusScreen } from "@/components/feedback/status-screen";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Localised 404. Used for unknown routes and `notFound()` calls (e.g. unknown property id). */
export default function LocaleNotFound() {
  const t = useTranslations("feedback.status.notFound");
  const tCommon = useTranslations("common.actions");

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
