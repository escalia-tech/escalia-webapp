"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type CreateBuildingState, createBuildingAction } from "../server/create-building.action";

function Field({
  name,
  label,
  required,
  inputMode,
}: {
  name: string;
  label: string;
  required?: boolean;
  inputMode?: "numeric";
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input id={name} name={name} required={required} inputMode={inputMode} autoComplete="off" />
    </div>
  );
}

export function NewBuildingForm() {
  const t = useTranslations("portfolio.new");
  const [state, action, pending] = useActionState<CreateBuildingState, FormData>(createBuildingAction, undefined);

  return (
    <form action={action} className="grid max-w-xl gap-4">
      {state?.error === "invalid" ? <Callout tone="danger">{t("invalid")}</Callout> : null}
      {state?.error === "refused" ? <Callout tone="danger">{state.message ?? t("refused")}</Callout> : null}
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field name="civicNumber" label={t("civicNumber")} required />
        <Field name="street" label={t("street")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field name="city" label={t("city")} required />
        <Field name="postalCode" label={t("postalCode")} required />
      </div>
      <Field name="displayName" label={t("displayName")} />
      <fieldset className="grid gap-3">
        <p className="text-muted-foreground text-sm">{t("unitsHelp")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="unitCount" label={t("unitCount")} inputMode="numeric" />
          <Field name="unitRange" label={t("unitRange")} />
        </div>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
