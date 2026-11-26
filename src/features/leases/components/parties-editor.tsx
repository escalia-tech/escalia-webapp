"use client";

import { useActionState, useState, useTransition } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  GUARANTEE_DURATIONS,
  GUARANTEE_SCOPES,
  type Lease,
  type LeaseParty,
  type PartyRole,
  SOLIDARITIES,
} from "../schemas/leases.schema";
import {
  addOccupantAction,
  type LeaseFormState,
  removeOccupantAction,
  savePartiesAction,
} from "../server/leases.actions";

const INPUT = "border-input bg-background h-9 rounded-md border px-2 text-sm";

/** Hundredths of a percent as the text the landlord types: 3333 becomes "33,33". */
export function basisPointsText(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100)
    .padStart(2, "0")
    .replace(/0$/, "");
  return fraction === "" ? String(whole) : `${whole},${fraction}`;
}

/** Cents as the text the landlord types: 150050 becomes "1500,5". */
export function centsText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : basisPointsText(value);
}

function Outcome({ state }: { state: LeaseFormState }) {
  const t = useTranslations("leases");
  if (state === undefined) return null;
  if (state.status === "done") return <Callout tone="success">{t("saved")}</Callout>;
  if (state.status === "invalid") return <Callout tone="danger">{t(`invalid.${state.reason}`)}</Callout>;
  return (
    <Callout tone="danger">{state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}</Callout>
  );
}

interface Row {
  key: number;
  role: PartyRole;
  party: LeaseParty | undefined;
}

function PartyRow({ row, index, onRemove }: { row: Row; index: number; onRemove: () => void }) {
  const t = useTranslations("leases");
  const party = row.party;
  const name = (field: string) => `${field}_${index}`;
  return (
    <li className="grid gap-3 rounded-md border p-3">
      <input type="hidden" name={name("role")} value={row.role} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t(`roles.${row.role}`)}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          {t("party.remove")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {t("party.legalName")}
          <input name={name("legalName")} defaultValue={party?.legalName} maxLength={120} className={INPUT} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("party.email")}
          <input
            type="email"
            name={name("email")}
            defaultValue={party?.email ?? ""}
            maxLength={254}
            className={INPUT}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("party.phone")}
          <input type="tel" name={name("phone")} defaultValue={party?.phone ?? ""} maxLength={30} className={INPUT} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("party.language")}
          <select name={name("language")} defaultValue={party?.language ?? "fr"} className={INPUT}>
            <option value="fr">{t("languages.fr")}</option>
            <option value="en">{t("languages.en")}</option>
          </select>
        </label>
        {row.role === "TENANT" ? (
          <>
            <label className="grid gap-1 text-sm sm:col-span-2">
              {t("party.address")}
              <input
                name={name("address")}
                defaultValue={party?.postalAddress ?? ""}
                maxLength={300}
                className={INPUT}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("party.share")}
              <input
                name={name("share")}
                inputMode="decimal"
                defaultValue={basisPointsText(party?.shareBasisPoints)}
                placeholder={t("party.sharePlaceholder")}
                className={INPUT}
              />
            </label>
          </>
        ) : null}
        {row.role === "OCCUPANT" ? (
          <label className="grid gap-1 text-sm">
            {t("party.relation")}
            <input name={name("relation")} defaultValue={party?.relation ?? ""} maxLength={60} className={INPUT} />
          </label>
        ) : null}
        {row.role === "GUARANTOR" ? (
          <>
            <label className="grid gap-1 text-sm sm:col-span-2">
              {t("party.address")}
              <input
                name={name("address")}
                defaultValue={party?.postalAddress ?? ""}
                maxLength={300}
                className={INPUT}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("guarantee.scope")}
              <select
                name={name("scope")}
                defaultValue={party?.guarantee?.scope ?? "ALL_OBLIGATIONS"}
                className={INPUT}
              >
                {GUARANTEE_SCOPES.map((one) => (
                  <option key={one} value={one}>
                    {t(`guarantee.scopes.${one}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {t("guarantee.duration")}
              <select
                name={name("duration")}
                defaultValue={party?.guarantee?.duration ?? "INITIAL_TERM"}
                className={INPUT}
              >
                {GUARANTEE_DURATIONS.map((one) => (
                  <option key={one} value={one}>
                    {t(`guarantee.durations.${one}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {t("guarantee.maxAmount")}
              <input
                name={name("maxAmount")}
                inputMode="decimal"
                defaultValue={centsText(party?.guarantee?.maxAmountCents)}
                className={INPUT}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t("guarantee.guaranteed")}
              <input name={name("guaranteed")} placeholder={t("guarantee.guaranteedPlaceholder")} className={INPUT} />
            </label>
          </>
        ) : null}
      </div>
    </li>
  );
}

function PartiesForm({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const [state, action, pending] = useActionState<LeaseFormState, FormData>(
    savePartiesAction.bind(null, lease.id),
    undefined,
  );
  const [rows, setRows] = useState<Row[]>(() =>
    lease.parties.filter((one) => one.role !== "OCCUPANT").map((party, key) => ({ key, role: party.role, party })),
  );
  const [next, setNext] = useState(rows.length);
  const add = (role: PartyRole) => {
    setRows((current) => [...current, { key: next, role, party: undefined }]);
    setNext(next + 1);
  };

  return (
    <form action={action} className="grid gap-4">
      <div aria-live="polite">
        <Outcome state={state} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{t("solidarity.title")}</legend>
        <p className="text-muted-foreground text-sm">{t("solidarity.help")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SOLIDARITIES.filter((one) => one !== "NOT_APPLICABLE").map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="solidarity"
                value={value}
                defaultChecked={lease.solidarity === value}
                className="accent-primary size-4"
              />
              {t(`solidarity.${value}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <ul className="grid gap-3">
        {rows.map((row, index) => (
          <PartyRow
            key={row.key}
            row={row}
            index={index}
            onRemove={() => setRows((current) => current.filter((one) => one.key !== row.key))}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => add("TENANT")}>
          {t("party.addTenant")}
        </Button>
        <Button type="button" variant="outline" onClick={() => add("OCCUPANT")}>
          {t("party.addOccupant")}
        </Button>
        <Button type="button" variant="outline" onClick={() => add("GUARANTOR")}>
          {t("party.addGuarantor")}
        </Button>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function OccupantsAnytime({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const [state, action, pending] = useActionState<LeaseFormState, FormData>(
    addOccupantAction.bind(null, lease.id),
    undefined,
  );
  const [removing, startRemoving] = useTransition();
  const [removed, setRemoved] = useState<LeaseFormState>(undefined);
  const occupants = lease.parties.filter((one) => one.role === "OCCUPANT");
  return (
    <div className="grid gap-4">
      <div aria-live="polite">
        <Outcome state={state ?? removed} />
      </div>
      {occupants.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("occupants.none")}</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {occupants.map((one) => (
            <li key={one.personId} className="flex items-center justify-between gap-3">
              <span>
                {one.legalName}
                {one.relation ? <span className="text-muted-foreground"> ({one.relation})</span> : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removing}
                onClick={() =>
                  startRemoving(async () => setRemoved(await removeOccupantAction(lease.id, one.personId)))
                }
              >
                {t("party.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          {t("party.legalName")}
          <input name="legalName" maxLength={120} required className={INPUT} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("party.relation")}
          <input name="relation" maxLength={60} className={INPUT} />
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {t("occupants.add")}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** FR-LEASE-05: parties of a lease. Everything can be edited in a draft; after signing only the occupants. */
export function PartiesEditor({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const locale = useLocale();
  const draft = lease.status === "DRAFT";
  const summary = locale.startsWith("en") ? lease.solidaritySummary.en : lease.solidaritySummary.fr;
  return (
    <div className="grid gap-5">
      <Callout tone="info">{summary}</Callout>
      {draft ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("parties.title")}</CardTitle>
            <CardDescription>{t("parties.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <PartiesForm key={lease.parties.map((one) => one.personId).join()} lease={lease} />
          </CardContent>
        </Card>
      ) : (
        <Callout tone="warning">{t("refusals.afterSigning")}</Callout>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("occupants.title")}</CardTitle>
          <CardDescription>{t("occupants.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <OccupantsAnytime lease={lease} />
        </CardContent>
      </Card>
    </div>
  );
}
