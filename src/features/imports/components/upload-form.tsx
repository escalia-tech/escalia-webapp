"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";

import { type ImportState, uploadImportAction } from "../server/imports.actions";

/** Picks a CSV file; the core reads it, and the page of the import opens on the columns. */
export function UploadForm() {
  const t = useTranslations("imports");
  const [state, action, pending] = useActionState<ImportState, FormData>(uploadImportAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        {t("upload.label")}
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="border-input bg-background rounded-md border p-2 text-sm"
        />
      </label>
      <p className="text-muted-foreground text-xs">{t("upload.hint")}</p>
      {state?.status === "invalid" ? <Callout tone="danger">{t(`invalid.${state.reason}`)}</Callout> : null}
      {state?.status === "refused" ? (
        <Callout tone="danger">
          {state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {t("upload.submit")}
        </Button>
      </div>
    </form>
  );
}
