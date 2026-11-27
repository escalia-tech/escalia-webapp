"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { inviteTenantsWithoutAccountAction } from "../server/leases.actions";
import type { InviteOutcome } from "../server/leases.service";

/** "Inviter tous les locataires sans compte" (FR-TEN-01 BR-1): one click for every signed lease. */
export function InviteAllTenants() {
  const t = useTranslations("leases");
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<InviteOutcome | undefined>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invitations.bulk.title")}</CardTitle>
        <CardDescription>{t("invitations.bulk.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div aria-live="polite">
          {outcome?.status === "sent" ? (
            <Callout tone="success">{t("invitations.bulk.sent", { count: outcome.count })}</Callout>
          ) : null}
          {outcome?.status === "refused" ? (
            <Callout tone="danger">
              {outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused"))}
            </Callout>
          ) : null}
        </div>
        <div>
          <Button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => start(async () => setOutcome(await inviteTenantsWithoutAccountAction()))}
          >
            {t("invitations.bulk.action")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
