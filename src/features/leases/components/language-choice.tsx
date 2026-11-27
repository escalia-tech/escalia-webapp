"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { LanguageCode, TenantLanguage } from "../schemas/leases.schema";
import { chooseLanguageAction } from "../server/leases.actions";

/**
 * FR-LEASE-02 BR-6: each party chooses for themselves, on a screen that shows French first and English second. The
 * wording is the same in both page languages on purpose: the choice is only valid if it is understood in both.
 */
export function LanguageChoice({ leaseId, state }: { leaseId: string; state: TenantLanguage }) {
  const t = useTranslations("leases");
  const [current, setCurrent] = useState(state);
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | undefined>();
  if (!current.requested) return null;
  const choose = (choice: LanguageCode) =>
    start(async () => {
      const outcome = await chooseLanguageAction(leaseId, choice);
      if (outcome.status === "refused") {
        setFailed(outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused")));
      } else if (outcome.status === "invalid") {
        setFailed(t("invalid.id"));
      } else {
        setFailed(undefined);
        setCurrent((before) => outcome.state ?? { ...before, myChoice: choice });
      }
    });
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("choice.title")}</CardTitle>
        <CardDescription>{t("choice.question")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {failed ? <Callout tone="danger">{failed}</Callout> : null}
        {current.myChoice ? <Callout tone="success">{t(`choice.done.${current.myChoice}`)}</Callout> : null}
        {current.open ? (
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={pending} onClick={() => choose("fr")}>
              {t("choice.keepFrench")}
            </Button>
            <Button type="button" disabled={pending} onClick={() => choose("en")}>
              {t("choice.wantEnglish")}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("choice.closed")}</p>
        )}
        <p className="text-muted-foreground text-xs">{t("choice.note")}</p>
      </CardContent>
    </Card>
  );
}
