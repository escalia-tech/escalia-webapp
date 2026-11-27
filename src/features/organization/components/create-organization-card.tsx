"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createOrganizationAction, type OrganizationFormState } from "../server/organization.actions";

/**
 * First step of a landlord (FR-PORT-01 BR-1): shown wherever data needs an organization the person does not have
 * yet. The name is optional; without one the core uses the person's full name.
 */
export function CreateOrganizationCard() {
  const t = useTranslations("organization.create");
  const [state, action, pending] = useActionState<OrganizationFormState, FormData>(createOrganizationAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <div aria-live="polite">
            {state?.status === "saved" ? <Callout tone="success">{t("created")}</Callout> : null}
            {state?.status === "invalid" ? <Callout tone="danger">{t("invalid")}</Callout> : null}
            {state?.status === "refused" ? <Callout tone="danger">{state.message ?? t("refused")}</Callout> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="organization-name">{t("name")}</Label>
            <Input id="organization-name" name="name" maxLength={120} autoComplete="organization" />
            <p className="text-muted-foreground text-xs">{t("nameHelp")}</p>
          </div>
          <div>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
