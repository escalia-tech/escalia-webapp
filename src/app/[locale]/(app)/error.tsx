"use client";

import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { StatusScreen } from "@/components/feedback/status-screen";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { reportClientError } from "@/lib/observability/errors/error-reporter";

/** Route-level error boundary for the authenticated area. Logs once, shows a safe message. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("feedback.status.serverError");
  const tFeedback = useTranslations("feedback");
  const tCommon = useTranslations("common.actions");

  useEffect(() => {
    reportClientError(error, "app-route");
  }, [error]);

  return (
    <div role="alert">
      <StatusScreen
        code={t("code")}
        title={t("title")}
        description={t("description")}
        reference={error.digest ? tFeedback("status.reference", { id: error.digest }) : undefined}
        actions={
          <>
            <Button type="button" onClick={reset}>
              {tCommon("retry")}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">{tCommon("backToDashboard")}</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
