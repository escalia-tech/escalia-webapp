"use client";

import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { StatusScreen } from "@/components/feedback/status-screen";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/observability/errors/error-reporter";

/** Error boundary for public routes (outside the authenticated shell). */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("feedback.status.serverError");
  const tFeedback = useTranslations("feedback");
  const tCommon = useTranslations("common.actions");

  useEffect(() => {
    reportClientError(error, "locale-route");
  }, [error]);

  return (
    <div role="alert">
      <StatusScreen
        variant="page"
        code={t("code")}
        title={t("title")}
        description={t("description")}
        reference={error.digest ? tFeedback("status.reference", { id: error.digest }) : undefined}
        actions={
          <Button type="button" onClick={reset}>
            {tCommon("retry")}
          </Button>
        }
      />
    </div>
  );
}
