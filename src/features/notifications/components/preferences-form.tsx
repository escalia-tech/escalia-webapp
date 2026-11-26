"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { NotificationPreferences } from "../schemas/notifications.schema";
import { type PreferencesFormState, savePreferencesAction } from "../server/notifications.actions";
import { PushToggle } from "./push-toggle";

const DIGEST_KEY = { DAILY: "daily", WEEKLY: "weekly", OFF: "off" } as const;

const CATEGORY_KEY = {
  LEGAL: "legal",
  ACCOUNT: "account",
  URGENT: "urgent",
  OPERATIONAL: "operational",
  DIGEST: "digest",
} as const;

/** FR-COM-02: channels per category, digest and quiet hours. Locked categories are shown, disabled. */
export function PreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  const t = useTranslations("settings.notifications");
  const [state, action, pending] = useActionState<PreferencesFormState, FormData>(savePreferencesAction, undefined);
  const operational = preferences.categories.find((one) => one.category === "OPERATIONAL");
  const locked = preferences.categories.filter((one) => one.locked);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-6">
          <div aria-live="polite" className="grid gap-2">
            {preferences.emailInvalid ? <Callout tone="danger">{t("emailInvalid")}</Callout> : null}
            {state?.status === "invalid" ? <Callout tone="danger">{t(`invalid.${state.reason}`)}</Callout> : null}
            {state?.status === "refused" ? <Callout tone="danger">{state.message ?? t("refused")}</Callout> : null}
            {state?.status === "done" ? <Callout tone="success">{t("saved")}</Callout> : null}
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t("locked.title")}</legend>
            <p className="text-muted-foreground text-sm">{t("locked.help")}</p>
            <ul className="grid gap-1 text-sm">
              {locked.map((one) => (
                <li key={one.category} className="flex items-center gap-2">
                  <input type="checkbox" checked disabled readOnly className="accent-primary size-4" />
                  {t(`categories.${CATEGORY_KEY[one.category]}`)}
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t("categories.operational")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked disabled readOnly className="accent-primary size-4" />
              {t("channels.inApp")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="operationalEmail"
                defaultChecked={operational?.channels.includes("EMAIL") ?? false}
                className="accent-primary size-4"
              />
              {t("channels.email")}
              {preferences.emailMasked ? (
                <span className="text-muted-foreground">({preferences.emailMasked})</span>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="operationalPush"
                defaultChecked={operational?.channels.includes("WEB_PUSH") ?? false}
                className="accent-primary size-4"
              />
              {t("channels.push")}
            </label>
            <p className="text-muted-foreground text-sm">{t("channels.pushHelp")}</p>
            <PushToggle vapidPublicKey={preferences.vapidPublicKey} />
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t("digest.title")}</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(["DAILY", "WEEKLY", "OFF"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value={value}
                    defaultChecked={preferences.digestFrequency === value}
                    className="accent-primary size-4"
                  />
                  {t(`digest.${DIGEST_KEY[value]}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t("quiet.title")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="quietHoursEnabled"
                defaultChecked={preferences.quietHoursEnabled}
                className="accent-primary size-4"
              />
              {t("quiet.enabled")}
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                {t("quiet.from")}
                <input
                  type="time"
                  name="quietFrom"
                  defaultValue={preferences.quietFrom ?? "21:00"}
                  className="border-input bg-background h-9 rounded-md border px-2"
                />
              </label>
              <label className="flex items-center gap-2">
                {t("quiet.to")}
                <input
                  type="time"
                  name="quietTo"
                  defaultValue={preferences.quietTo ?? "08:00"}
                  className="border-input bg-background h-9 rounded-md border px-2"
                />
              </label>
            </div>
            <p className="text-muted-foreground text-sm">{t("quiet.help")}</p>
          </fieldset>

          <div>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
