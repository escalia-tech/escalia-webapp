"use client";

import { useActionState } from "react";

import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { BYLAWS_MAX, type BylawsSaved, type BylawsVersion, NOTE_MAX } from "../schemas/bylaws.schema";
import { type BylawsFormState, saveBylawsAction } from "../server/bylaws.actions";

const AREA = "border-input bg-background rounded-md border p-2 text-sm";

function Warnings({ saved }: { saved: BylawsSaved | undefined }) {
  const t = useTranslations("leases");
  const english = useLocale().startsWith("en");
  const pick = (text: { fr: string; en: string }) => (english ? text.en : text.fr);
  if (!saved || saved.findings.length === 0) return null;
  return (
    <ul className="grid gap-2" aria-label={t("bylaws.findings")}>
      {saved.findings.map((finding) => (
        <li key={finding.ruleKey}>
          <Callout tone="warning">
            <strong>{pick(finding.title)}</strong> {pick(finding.sentence)}
            {finding.alternative ? <> {pick(finding.alternative)}</> : null}
            {finding.citation ? <span className="text-muted-foreground"> ({finding.citation})</span> : null}
          </Callout>
        </li>
      ))}
    </ul>
  );
}

function Outcome({ state }: { state: BylawsFormState }) {
  const t = useTranslations("leases");
  if (!state) return null;
  if (state.status === "invalid") return <Callout tone="danger">{t(`bylaws.invalid.${state.reason}`)}</Callout>;
  if (state.status === "refused") {
    return (
      <Callout tone="danger">{state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}</Callout>
    );
  }
  return <Callout tone="success">{t("bylaws.saved", { version: state.saved?.version.version ?? 0 })}</Callout>;
}

/** FR-LEASE-03: each save is a new version; the one in force is attached to the leases drafted after it. */
export function BylawsEditor({ buildingId, current }: { buildingId: string; current: BylawsVersion | undefined }) {
  const t = useTranslations("leases");
  const [state, action, pending] = useActionState<BylawsFormState, FormData>(
    saveBylawsAction.bind(null, buildingId),
    undefined,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bylaws.edit")}</CardTitle>
        <CardDescription>{t("bylaws.editHelp")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <label className="grid gap-1 text-sm">
            {t("bylaws.text")}
            <textarea
              name="text"
              required
              rows={10}
              maxLength={BYLAWS_MAX}
              defaultValue={current?.text ?? ""}
              className={AREA}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("bylaws.textEn")}
            <textarea
              name="textEn"
              rows={6}
              maxLength={BYLAWS_MAX}
              defaultValue={current?.textEn ?? ""}
              className={AREA}
            />
            <span className="text-muted-foreground text-xs">{t("bylaws.textEnHelp")}</span>
          </label>
          <label className="grid gap-1 text-sm">
            {t("bylaws.note")}
            <input
              name="changeNote"
              maxLength={NOTE_MAX}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            />
          </label>
          <Warnings saved={state?.status === "saved" ? state.saved : undefined} />
          <Outcome state={state} />
          <div>
            <Button type="submit" disabled={pending}>
              {t("bylaws.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** The versions of the by-laws, newest first, each with its PDF. */
export function BylawsVersions({ buildingId, versions }: { buildingId: string; versions: BylawsVersion[] }) {
  const t = useTranslations("leases");
  const format = useFormatter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bylaws.versions")}</CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? <p className="text-muted-foreground text-sm">{t("bylaws.none")}</p> : null}
        <ul className="grid gap-2 text-sm">
          {versions.map((one) => (
            <li key={one.version} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {t("bylaws.version", { version: one.version })} ·{" "}
                {format.dateTime(new Date(one.createdAt), { dateStyle: "medium" })}
                {one.active ? <strong> · {t("bylaws.inForce")}</strong> : null}
                {one.changeNote ? <span className="text-muted-foreground"> · {one.changeNote}</span> : null}
              </span>
              <a
                className="underline"
                href={`/api/bff/bylaws/pdf?buildingId=${buildingId}&version=${one.version}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("bylaws.pdf")}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
