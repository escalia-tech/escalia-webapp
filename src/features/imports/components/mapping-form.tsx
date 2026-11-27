"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";

import { baseField, type ImportJob, MAP_FIELD_PREFIX, tenantField } from "../schemas/imports.schema";
import { type ImportState, saveMappingAction } from "../server/imports.actions";

type Translate = ReturnType<typeof useTranslations<"imports">>;

export function fieldLabel(t: Translate, code: string): string {
  const tenant = tenantField(code);
  if (tenant) {
    const part = t(`fields.parts.${tenant.part}`);
    return t("fields.tenant", { n: tenant.n, part });
  }
  const base = baseField(code);
  return base ? t(`fields.${base}`) : code;
}

/** Which field each column of the file fills; the proposal is already selected. */
export function MappingForm({ job }: { job: ImportJob }) {
  const t = useTranslations("imports");
  const [state, action, pending] = useActionState<ImportState, FormData>(
    saveMappingAction.bind(null, job.id),
    undefined,
  );
  const missing = job.required.filter((code) => !Object.values(job.mapping).includes(code));
  return (
    <form action={action} className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("mapping.intro")}</p>
      <div className="grid gap-2">
        {job.headers.map((header) => (
          <label key={header} className="grid gap-1 text-sm sm:grid-cols-2 sm:items-center">
            <span className="font-medium">{header}</span>
            <select
              name={`${MAP_FIELD_PREFIX}${header}`}
              defaultValue={job.mapping[header] ?? ""}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            >
              <option value="">{t("mapping.ignore")}</option>
              {job.fields.map((code) => (
                <option key={code} value={code}>
                  {fieldLabel(t, code)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {missing.length > 0 ? (
        <Callout tone="warning">
          {t("mapping.missing", { fields: missing.map((code) => fieldLabel(t, code)).join(", ") })}
        </Callout>
      ) : null}
      {state?.status === "refused" ? (
        <Callout tone="danger">
          {state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {t("mapping.check")}
        </Button>
      </div>
    </form>
  );
}
