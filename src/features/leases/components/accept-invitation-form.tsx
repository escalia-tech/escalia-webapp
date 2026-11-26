"use client";

import { useActionState, useState, useTransition } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LANGUAGES } from "../schemas/leases.schema";
import { type AcceptFormState, acceptInvitationAction, requestNewInvitationAction } from "../server/leases.actions";
import type { RequestOutcome } from "../server/leases.service";

const INPUT = "border-input bg-background h-9 rounded-md border px-2 text-sm";

/** FR-TEN-01 BR-2, BR-3: the signed-in person joins the lease and accepts the terms. */
export function AcceptInvitationForm({ token }: { token: string }) {
  const t = useTranslations("leases");
  const locale = useLocale();
  const [state, action, pending] = useActionState<AcceptFormState, FormData>(
    acceptInvitationAction.bind(null, token),
    undefined,
  );
  const [asking, ask] = useTransition();
  const [asked, setAsked] = useState<RequestOutcome | undefined>();
  const refused = state?.status === "refused" ? state : undefined;
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("accept.title")}</CardTitle>
        <CardDescription>{t("accept.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <div aria-live="polite" className="grid gap-2">
            {state?.status === "invalid" ? <Callout tone="danger">{t(`invalid.${state.reason}`)}</Callout> : null}
            {refused ? (
              <Callout tone="danger">
                {refused.reason ? t(`refusals.${refused.reason}`) : (refused.message ?? t("refused"))}
              </Callout>
            ) : null}
            {asked?.status === "requested" ? <Callout tone="success">{t("accept.requestSent")}</Callout> : null}
          </div>
          <label className="grid gap-1 text-sm">
            {t("accept.language")}
            <select name="language" defaultValue={locale.startsWith("en") ? "en" : "fr"} className={INPUT}>
              {LANGUAGES.map((one) => (
                <option key={one} value={one}>
                  {t(`languages.${one}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="terms" className="accent-primary size-4" />
            {t("accept.terms")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="privacy" className="accent-primary size-4" />
            {t("accept.privacy")}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {t("accept.submit")}
            </Button>
            {refused?.reason === "invitationExpired" ? (
              <Button
                type="button"
                variant="outline"
                disabled={asking}
                onClick={() => ask(async () => setAsked(await requestNewInvitationAction(token)))}
              >
                {t("accept.requestNew")}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
