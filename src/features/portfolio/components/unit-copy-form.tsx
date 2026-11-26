"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { GROUPS, type UnitPage } from "../schemas/unit.schema";
import { copyUnitAttributesAction, type UnitFormState } from "../server/unit.actions";

const GROUP_KEY = {
  TYPE_AND_SIZE: "typeAndSize",
  INCLUDED: "included",
  PARKING_STORAGE: "parkingStorage",
  ACCESSIBILITY: "accessibility",
} as const;

/** BR-7: copy chosen groups of this unit to other units of the building. */
export function UnitCopyForm({ unit }: { unit: UnitPage }) {
  const t = useTranslations("portfolio.unit");
  const [state, action, pending] = useActionState<UnitFormState, FormData>(
    copyUnitAttributesAction.bind(null, unit.buildingId, unit.id),
    undefined,
  );
  const targets = unit.siblings.filter((sibling) => !sibling.archived);
  const ready = unit.current != null && targets.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("copy.title")}</CardTitle>
        <CardDescription>{t("copy.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {unit.current == null ? <p className="text-muted-foreground text-sm">{t("copy.noSource")}</p> : null}
        {unit.current != null && targets.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("copy.noTargets")}</p>
        ) : null}
        {ready ? (
          <form action={action} className="grid gap-4">
            <div aria-live="polite" className="grid gap-2">
              {state?.status === "invalid" ? <Callout tone="danger">{t("copy.invalid")}</Callout> : null}
              {state?.status === "refused" ? <Callout tone="danger">{state.message ?? t("refused")}</Callout> : null}
              {state?.status === "saved" ? (
                <Callout tone="success">{t("copy.done", { count: state.count ?? 0 })}</Callout>
              ) : null}
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">{t("copy.groups")}</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {GROUPS.map((group) => (
                  <label key={group} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="groups" value={group} className="accent-primary size-4" />
                    {t(`groups.${GROUP_KEY[group]}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">{t("copy.targets")}</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {targets.map((target) => (
                  <label key={target.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="toUnitIds" value={target.id} className="accent-primary size-4" />
                    {target.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <Button type="submit" variant="outline" disabled={pending}>
                {t("copy.submit")}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
