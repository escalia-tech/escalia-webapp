"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { Lease } from "../schemas/leases.schema";
import {
  APPLIANCE_KEYS,
  COST_KEYS,
  EXTRA_ROWS,
  FURNITURE_KEYS,
  HEATING_SOURCES,
  type LeaseFormView,
} from "../schemas/tal-form.schema";
import { saveTalFormAction, type TalFormState } from "../server/tal-form.actions";

const INPUT = "border-input bg-background h-9 rounded-md border px-2 text-sm";
const LOCKED = ["OUT_FOR_SIGNATURE", "SIGNED", "ACTIVE", "RECORDED", "ENDED", "CANCELLED"];

type Translate = ReturnType<typeof useTranslations>;

function Text({ name, label, value, wide }: { name: string; label: string; value?: string | null; wide?: boolean }) {
  return (
    <label className={`grid gap-1 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <input name={name} defaultValue={value ?? ""} className={INPUT} />
    </label>
  );
}

function answerOf(value?: boolean | null): string {
  if (value === null || value === undefined) return "";
  return value ? "yes" : "no";
}

function YesNo({ name, label, value, t }: { name: string; label: string; value?: boolean | null; t: Translate }) {
  const current = answerOf(value);
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <select name={name} defaultValue={current} className={INPUT}>
        <option value="">{t("unanswered")}</option>
        <option value="yes">{t("yes")}</option>
        <option value="no">{t("no")}</option>
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Landlord({ form, t }: { form: LeaseFormView["form"]; t: Translate }) {
  const l = form.landlord;
  return (
    <Section title={t("landlord")}>
      <Text name="lName" label={t("lName")} value={l?.name} wide />
      <Text name="lStreet" label={t("lStreet")} value={l?.address?.street} />
      <Text name="lUnit" label={t("lUnit")} value={l?.address?.unit} />
      <Text name="lCity" label={t("lCity")} value={l?.address?.city} />
      <Text name="lPostal" label={t("lPostal")} value={l?.address?.postalCode} />
      <Text name="lPhone" label={t("lPhone")} value={l?.phone} />
      <Text name="lOtherPhone" label={t("lOtherPhone")} value={l?.otherPhone} />
      <Text name="lEmail" label={t("lEmail")} value={l?.email} />
      <Text name="lRep" label={t("lRep")} value={l?.representedBy} />
    </Section>
  );
}

function Place({
  prefix,
  label,
  place,
  t,
}: {
  prefix: string;
  label: string;
  place?: { count: number; where?: string | null } | null;
  t: Translate;
}) {
  return (
    <>
      <Text name={`${prefix}Count`} label={`${label} - ${t("places")}`} value={place ? String(place.count) : ""} />
      <Text name={`${prefix}Where`} label={`${label} - ${t("where")}`} value={place?.where} />
    </>
  );
}

function Dwelling({ form, t }: { form: LeaseFormView["form"]; t: Translate }) {
  const d = form.dwelling;
  return (
    <Section title={t("dwelling")}>
      <Text
        name="rooms"
        label={t("rooms")}
        value={d?.rooms === null || d?.rooms === undefined ? "" : String(d.rooms)}
      />
      <YesNo name="habitationOnly" label={t("habitationOnly")} value={d?.habitationOnly} t={t} />
      <Text name="mixedUse" label={t("mixedUse")} value={d?.mixedUse} wide />
      <YesNo name="condo" label={t("condo")} value={d?.condo} t={t} />
      <Place prefix="outdoor" label={t("outdoor")} place={d?.parkingOutdoor} t={t} />
      <Place prefix="indoor" label={t("indoor")} place={d?.parkingIndoor} t={t} />
      <Place prefix="storage" label={t("storage")} place={d?.storage} t={t} />
      <Text name="otherAccessories" label={t("otherAccessories")} value={d?.otherAccessories} wide />
      <YesNo name="furnished" label={t("furnished")} value={d?.furnished} t={t} />
      <div className="grid gap-1 text-sm sm:col-span-2">
        {t("appliances")}
        <div className="flex flex-wrap gap-3">
          {APPLIANCE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-1">
              <input type="checkbox" name="appliances" value={key} defaultChecked={d?.appliances?.includes(key)} />
              {key}
            </label>
          ))}
        </div>
      </div>
      {FURNITURE_KEYS.map((key) => (
        <Text
          key={key}
          name={`furniture_${key}`}
          label={`${t("furniture")} - ${key}`}
          value={d?.furniture?.[key] === undefined ? "" : String(d.furniture[key])}
        />
      ))}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="smokeAlarm" defaultChecked={d?.smokeAlarmUndertaking === true} />
        {t("smokeAlarm")}
      </label>
    </Section>
  );
}

function Services({ form, t }: { form: LeaseFormView["form"]; t: Translate }) {
  const s = form.services;
  const rent = form.rent;
  return (
    <>
      <Section title={t("rent")}>
        <label className="grid gap-1 text-sm">
          {t("period")}
          <select name="period" defaultValue={rent?.period ?? "MONTH"} className={INPUT}>
            <option value="MONTH">{t("month")}</option>
            <option value="WEEK">{t("week")}</option>
          </select>
        </label>
        <Text
          name="servicesCost"
          label={t("servicesCost")}
          value={rent?.servicesCents ? String(rent.servicesCents / 100) : ""}
        />
        <YesNo name="subsidy" label={t("subsidy")} value={rent?.subsidy} t={t} />
        <Text name="subsidyNote" label={t("subsidyNote")} value={rent?.subsidyNote} />
        <Text name="paymentPlace" label={t("paymentPlace")} value={rent?.paymentPlace} wide />
      </Section>
      <Section title={t("services")}>
        {COST_KEYS.map((key) => (
          <label key={key} className="grid gap-1 text-sm">
            {`${key} - ${t("cost")}`}
            <select name={`cost_${key}`} defaultValue={s?.costs?.[key] ?? ""} className={INPUT}>
              <option value="">{t("unanswered")}</option>
              <option value="LANDLORD">{t("landlordPays")}</option>
              <option value="TENANT">{t("tenantPays")}</option>
            </select>
          </label>
        ))}
        <label className="grid gap-1 text-sm">
          {t("heatingSource")}
          <select name="heatingSource" defaultValue={s?.heatingSource ?? ""} className={INPUT}>
            <option value="">{t("unanswered")}</option>
            {HEATING_SOURCES.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </select>
        </label>
        {(["smokeFree", "landAccess", "pets"] as const).map((key) => (
          <div key={key} className="grid gap-1 sm:col-span-2 sm:grid-cols-2">
            <YesNo name={key} label={t(key)} value={s?.[key]?.enabled} t={t} />
            <Text name={`${key}Note`} label={`${t(key)} - ${t("note")}`} value={s?.[key]?.note} />
          </div>
        ))}
        <Text name="careName" label={`${t("caretaker")} - ${t("careName")}`} value={s?.caretaker?.name} />
        <Text name="carePhone" label={t("carePhone")} value={s?.caretaker?.phone} />
        <Text name="careOtherPhone" label={t("careOtherPhone")} value={s?.caretaker?.otherPhone} />
        <Text name="careEmail" label={t("careEmail")} value={s?.caretaker?.email} />
        <Text name="worksBefore" label={t("worksBefore")} value={s?.worksBefore} wide />
        <Text name="worksDuring" label={t("worksDuring")} value={s?.worksDuring} wide />
      </Section>
    </>
  );
}

function Clauses({ form, t }: { form: LeaseFormView["form"]; t: Translate }) {
  const f = form.clauseF;
  const g = form.clauseG;
  return (
    <>
      <Section title={t("clauseF")}>
        <label className="grid gap-1 text-sm">
          {t("fKind")}
          <select name="fKind" defaultValue={f?.kind ?? ""} className={INPUT}>
            <option value="">{t("fNone")}</option>
            <option value="NEW_BUILDING">{t("newBuilding")}</option>
            <option value="CHANGE_OF_USE">{t("changeOfUse")}</option>
          </select>
        </label>
        <Text name="fReady" label={t("fReady")} value={f?.readyOn} />
      </Section>
      <Section title={t("clauseG")}>
        <Text name="gLastOn" label={t("gLastOn")} value={g?.lastRentOn} />
        <Text name="gLast" label={t("gLast")} value={g?.lastRentCents ? String(g.lastRentCents / 100) : ""} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="gSenior" defaultChecked={g?.formerSeniorResidence === true} />
          {t("gSenior")}
        </label>
        <Text
          name="gPrevious"
          label={t("gPrevious")}
          value={g?.previousRentCents ? String(g.previousRentCents / 100) : ""}
        />
        <YesNo name="unchanged" label={t("unchanged")} value={g?.unchanged} t={t} />
        <Text name="gChanges" label={t("gChanges")} value={g?.changes} wide />
      </Section>
      <Section title={t("family")}>
        <Text name="spouse" label={t("spouse")} value={form.family?.spouseName} wide />
      </Section>
      <Section title={t("extra")}>
        {Array.from({ length: EXTRA_ROWS }, (_, index) => {
          const row = form.extraServices?.[index];
          return (
            <div key={`extra-${row?.label ?? index}`} className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <Text name={`extraLabel_${index + 1}`} label={t("extraLabel")} value={row?.label} />
              <Text
                name={`extraCost_${index + 1}`}
                label={t("extraCost")}
                value={row ? String(row.costCents / 100) : ""}
              />
            </div>
          );
        })}
      </Section>
    </>
  );
}

function Outcome({ state }: { state: TalFormState }) {
  const t = useTranslations("leases");
  if (state === undefined) return null;
  if (state.status === "done") return <Callout tone="success">{t("tal.saved")}</Callout>;
  if (state.status === "invalid") return <Callout tone="danger">{t(`tal.invalid.${state.reason}`)}</Callout>;
  return (
    <Callout tone="danger">{state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}</Callout>
  );
}

/** The details the official TAL form asks beyond the terms, and what is still missing before signing (FR-LEASE-01, TAL form). */
export function TalFormPanel({ lease, view }: { lease: Lease; view: LeaseFormView }) {
  const t = useTranslations("leases.tal");
  const [state, action, pending] = useActionState(saveTalFormAction.bind(null, lease.id), undefined);
  const locked = LOCKED.includes(lease.status);
  const missing = state?.status === "done" && state.view ? state.view.missing : view.missing;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {missing.length === 0 ? (
          <Callout tone="success">{t("complete")}</Callout>
        ) : (
          <Callout tone="warning">
            {t("missingTitle")}
            <ul className="mt-1 list-disc pl-5">
              {missing.map((code) => (
                <li key={code}>{t(`missing.${code}` as never)}</li>
              ))}
            </ul>
          </Callout>
        )}
        <form action={action} className="grid gap-4">
          <fieldset disabled={locked || pending} className="grid gap-4">
            <Landlord form={view.form} t={t} />
            <Dwelling form={view.form} t={t} />
            <Services form={view.form} t={t} />
            <Clauses form={view.form} t={t} />
          </fieldset>
          <Outcome state={state} />
          {locked ? null : (
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
