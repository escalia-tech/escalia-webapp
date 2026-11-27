"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type OrganizationFormState, renameOrganizationAction } from "../server/organization.actions";

/** The owner renames the organization (FR-PORT-01, audited `ORGANIZATION_RENAMED` by the core). */
export function RenameOrganizationForm({ name }: { name: string }) {
  const t = useTranslations("organization.settings");
  const [state, action, pending] = useActionState<OrganizationFormState, FormData>(renameOrganizationAction, undefined);

  return (
    <form action={action} className="grid gap-3">
      <div aria-live="polite">
        {state?.status === "saved" ? <Callout tone="success">{t("renamed")}</Callout> : null}
        {state?.status === "invalid" ? <Callout tone="danger">{t("invalid")}</Callout> : null}
        {state?.status === "refused" ? <Callout tone="danger">{state.message ?? t("refused")}</Callout> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="organization-rename">{t("name")}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="organization-rename"
            name="name"
            defaultValue={name}
            required
            maxLength={120}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" disabled={pending} aria-busy={pending}>
            {t("rename")}
          </Button>
        </div>
      </div>
    </form>
  );
}
