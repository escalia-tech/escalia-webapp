"use client";

import { useState, useTransition } from "react";

import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { TenantAnnex } from "../schemas/bylaws.schema";
import { acknowledgeAnnexAction } from "../server/bylaws.actions";

function Done({ annex }: { annex: TenantAnnex }) {
  const t = useTranslations("leases");
  const format = useFormatter();
  return (
    <Callout tone="success">
      {annex.acknowledgedAt
        ? t("annexes.done", { date: format.dateTime(new Date(annex.acknowledgedAt), { dateStyle: "medium" }) })
        : t("annexes.doneNoDate")}
    </Callout>
  );
}

/** FR-LEASE-03 BR-8, BR-9: a party reads what their role allows and acknowledges receipt, for themselves. */
export function TenantAnnexes({ leaseId, annexes }: { leaseId: string; annexes: TenantAnnex[] }) {
  const t = useTranslations("leases");
  const english = useLocale().startsWith("en");
  const [items, setItems] = useState(annexes);
  const [failed, setFailed] = useState<string | undefined>();
  const [pending, start] = useTransition();
  if (items.length === 0) return null;
  const acknowledge = (annexId: string) =>
    start(async () => {
      const outcome = await acknowledgeAnnexAction(leaseId, annexId);
      if (outcome.status === "refused") {
        setFailed(outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused")));
      } else if (outcome.status === "invalid") {
        setFailed(t("invalid.id"));
      } else {
        setFailed(undefined);
        setItems(
          (before) =>
            outcome.items ??
            before.map((one) => (one.id === annexId ? { ...one, acknowledged: true, canAcknowledge: false } : one)),
        );
      }
    });
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("annexes.tenantTitle")}</CardTitle>
        <CardDescription>{t("annexes.tenantDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {failed ? <Callout tone="danger">{failed}</Callout> : null}
        {items.map((annex) => {
          const body = english && annex.textEn ? annex.textEn : annex.text;
          return (
            <section key={annex.id} className="grid gap-2 text-sm">
              <h3 className="font-medium">{annex.title}</h3>
              {body ? (
                <p className="bg-muted/40 max-h-64 overflow-auto rounded-md p-3 whitespace-pre-wrap">{body}</p>
              ) : null}
              {english && annex.textEn ? (
                <p className="text-muted-foreground text-xs">{t("annexes.translation")}</p>
              ) : null}
              {annex.acknowledged ? <Done annex={annex} /> : null}
              {!annex.acknowledged && annex.canAcknowledge ? (
                <div>
                  <Button type="button" disabled={pending} onClick={() => acknowledge(annex.id)}>
                    {t("annexes.acknowledge")}
                  </Button>
                </div>
              ) : null}
              {!annex.acknowledged && !annex.canAcknowledge ? (
                <p className="text-muted-foreground text-xs">{t("annexes.readOnly")}</p>
              ) : null}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
