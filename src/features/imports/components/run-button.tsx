"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";

import { type ImportState, runImportAction } from "../server/imports.actions";

/** Imports the rows that are ready; the rows with an error stay out and are listed in the report. */
export function RunButton({ jobId, count }: { jobId: string; count: number }) {
  const t = useTranslations("imports");
  const [state, action, pending] = useActionState<ImportState>(runImportAction.bind(null, jobId), undefined);
  return (
    <form action={action} className="grid gap-2">
      {state?.status === "refused" ? (
        <Callout tone="danger">
          {state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" disabled={pending || count === 0}>
          {t("run", { count })}
        </Button>
      </div>
    </form>
  );
}
