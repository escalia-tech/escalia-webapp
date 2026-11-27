"use client";

import { useState, useTransition } from "react";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { LeaseLanguage } from "../schemas/leases.schema";
import { requestEnglishAction } from "../server/leases.actions";

/** FR-LEASE-02: French binds by default; the landlord records a request for English and sees who chose what. */
export function LanguagePanel({ leaseId, language }: { leaseId: string; language: LeaseLanguage }) {
  const t = useTranslations("leases");
  const format = useFormatter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | undefined>();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("language.title")}</CardTitle>
        <CardDescription>{t("language.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {failed ? <Callout tone="danger">{failed}</Callout> : null}
        <p className="text-sm">
          {t("language.binding")}: <strong>{t(`language.codes.${language.bindingLanguage}`)}</strong>
        </p>
        {language.requested ? (
          <>
            <p className="text-muted-foreground text-sm">{t("language.requested")}</p>
            <ul className="grid gap-1 text-sm">
              {language.choices.map((one) => (
                <li key={one.personId} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {one.legalName} ({t(`roles.${one.role}`)})
                  </span>
                  <span>
                    {one.choice && one.chosenAt
                      ? t("language.chose", {
                          choice: t(`language.codes.${one.choice}`),
                          date: format.dateTime(new Date(one.chosenAt), { dateStyle: "medium" }),
                        })
                      : t("language.waiting")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">{t("language.translationNote")}</p>
          </>
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const outcome = await requestEnglishAction(leaseId);
                  if (outcome.status === "refused") {
                    setFailed(outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused")));
                  } else if (outcome.status === "invalid") {
                    setFailed(t("invalid.id"));
                  } else {
                    setFailed(undefined);
                  }
                })
              }
            >
              {t("language.request")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
