"use client";

import { useActionState, useState, useTransition } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CLAUSE_G_KINDS, type Lease, type LeaseFinding, PAYMENT_METHODS, TERM_KINDS } from "../schemas/leases.schema";
import {
  cancelLeaseAction,
  clauseGProposalAction,
  type LeaseFormState,
  saveTermsAction,
} from "../server/leases.actions";
import { centsText } from "./parties-editor";

const INPUT = "border-input bg-background h-9 rounded-md border px-2 text-sm";
const LOCKED = ["OUT_FOR_SIGNATURE", "SIGNED", "ACTIVE", "RECORDED", "ENDED", "CANCELLED"];

function Outcome({ state }: { state: LeaseFormState }) {
  const t = useTranslations("leases");
  if (state === undefined) return null;
  if (state.status === "done") return <Callout tone="success">{t("terms.saved")}</Callout>;
  if (state.status === "invalid") return <Callout tone="danger">{t(`invalid.${state.reason}`)}</Callout>;
  return (
    <Callout tone="danger">{state.reason ? t(`refusals.${state.reason}`) : (state.message ?? t("refused"))}</Callout>
  );
}

/** What the rules found in the terms, in the page language. A warning is accepted by ticking its box. */
export function Findings({ findings }: { findings: LeaseFinding[] }) {
  const t = useTranslations("leases");
  const english = useLocale().startsWith("en");
  const pick = (text: { fr: string; en: string }) => (english ? text.en : text.fr);
  if (findings.length === 0) return null;
  return (
    <ul className="grid gap-2" aria-label={t("terms.findings")}>
      {findings.map((finding) => (
        <li key={finding.ruleKey}>
          <Callout tone={finding.outcome === "BLOCK" ? "danger" : finding.outcome === "WARN" ? "warning" : "info"}>
            <strong>{pick(finding.title)}</strong> {pick(finding.sentence)}
            {finding.alternative ? <> {pick(finding.alternative)}</> : null}
            {finding.citation ? <span className="text-muted-foreground"> ({finding.citation})</span> : null}
            {finding.outcome === "WARN" ? (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="acknowledged"
                  value={finding.ruleKey}
                  defaultChecked={finding.acknowledged === true}
                />
                {t("terms.acknowledge")}
              </label>
            ) : null}
          </Callout>
        </li>
      ))}
    </ul>
  );
}

function ClauseG({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const clause = lease.terms?.clauseG;
  const [kind, setKind] = useState<string>(clause?.kind ?? "");
  const [amount, setAmount] = useState(centsText(clause?.amountCents));
  const [start, setStart] = useState(clause?.periodStart ?? "");
  const [end, setEnd] = useState(clause?.periodEnd ?? "");
  const [note, setNote] = useState<string | undefined>();
  const [pending, run] = useTransition();
  const propose = () =>
    run(async () => {
      const proposal = await clauseGProposalAction(lease.id);
      if (proposal.status === "proposal") {
        setKind("LOWEST_RENT");
        setAmount(centsText(proposal.amountCents));
        setStart(proposal.periodStart ?? "");
        setEnd(proposal.periodEnd ?? "");
        setNote(t("terms.clauseG.proposed"));
      } else {
        setNote(t("terms.clauseG.noHistory"));
      }
    });
  return (
    <fieldset className="grid gap-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{t("terms.clauseG.title")}</legend>
      <p className="text-muted-foreground text-sm">{t("terms.clauseG.help")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {t("terms.clauseG.kind")}
          <select name="clauseGKind" value={kind} onChange={(event) => setKind(event.target.value)} className={INPUT}>
            <option value="">{t("terms.choose")}</option>
            {CLAUSE_G_KINDS.map((one) => (
              <option key={one} value={one}>
                {t(`terms.clauseG.kinds.${one}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("terms.clauseG.amount")}
          <input
            name="clauseGAmount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={INPUT}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("terms.clauseG.start")}
          <input
            type="date"
            name="clauseGStart"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className={INPUT}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("terms.clauseG.end")}
          <input
            type="date"
            name="clauseGEnd"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className={INPUT}
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("terms.clauseG.ref")}
          <input name="clauseGRef" defaultValue={clause?.talDecisionRef ?? ""} maxLength={60} className={INPUT} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={propose}>
          {t("terms.clauseG.propose")}
        </Button>
        {note ? <span className="text-muted-foreground text-sm">{note}</span> : null}
      </div>
    </fieldset>
  );
}

function CancelButton({ leaseId }: { leaseId: string }) {
  const t = useTranslations("leases");
  const [pending, run] = useTransition();
  const [failed, setFailed] = useState<string | undefined>();
  return (
    <div className="grid gap-2">
      {failed ? <Callout tone="danger">{failed}</Callout> : null}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const outcome = await cancelLeaseAction(leaseId);
              if (outcome.status === "refused") {
                setFailed(outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused")));
              }
            })
          }
        >
          {t("terms.cancel")}
        </Button>
      </div>
    </div>
  );
}

/** The terms of the lease (FR-LEASE-01): the landlord fills, the rules answer with findings, the draft is previewed. */
export function TermsEditor({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const [state, action, pending] = useActionState<LeaseFormState, FormData>(
    saveTermsAction.bind(null, lease.id),
    undefined,
  );
  const terms = lease.terms;
  const locked = LOCKED.includes(lease.status);
  const [kind, setKind] = useState<string>(terms?.termKind ?? "FIXED");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("terms.title")}</CardTitle>
        <CardDescription>{t("terms.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {lease.paymentReference ? (
          <p className="text-sm">
            {t("terms.reference")}: <code>{lease.paymentReference}</code>
          </p>
        ) : null}
        {locked ? <Callout tone="info">{t("terms.locked")}</Callout> : null}
        <form action={action} className="grid gap-4">
          <fieldset disabled={locked} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                {t("terms.termKind")}
                <select
                  name="termKind"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  className={INPUT}
                >
                  {TERM_KINDS.map((one) => (
                    <option key={one} value={one}>
                      {t(`terms.termKinds.${one}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                {t("terms.startDate")}
                <input type="date" name="startDate" defaultValue={terms?.startDate ?? ""} required className={INPUT} />
              </label>
              {kind === "FIXED" ? (
                <label className="grid gap-1 text-sm">
                  {t("terms.endDate")}
                  <input type="date" name="endDate" defaultValue={terms?.endDate ?? ""} className={INPUT} />
                </label>
              ) : null}
              <label className="grid gap-1 text-sm">
                {t("terms.rent")}
                <input
                  name="rent"
                  inputMode="decimal"
                  defaultValue={centsText(terms?.rentCents)}
                  required
                  className={INPUT}
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t("terms.dueDay")}
                <input name="dueDay" defaultValue={terms?.dueDay ?? "1"} required className={INPUT} />
              </label>
              <label className="grid gap-1 text-sm">
                {t("terms.firstPaymentDate")}
                <input
                  type="date"
                  name="firstPaymentDate"
                  defaultValue={terms?.firstPaymentDate ?? ""}
                  required
                  className={INPUT}
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t("terms.firstPayment")}
                <input
                  name="firstPayment"
                  inputMode="decimal"
                  defaultValue={centsText(terms?.firstPaymentCents)}
                  required
                  className={INPUT}
                />
              </label>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">{t("terms.methods")}</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="methods"
                      value={method}
                      defaultChecked={terms ? terms.acceptedPaymentMethods.includes(method) : method === "INTERAC"}
                    />
                    {t(`terms.paymentMethods.${method}`)}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="postdated" defaultChecked={terms?.postdatedChequesRequired === true} />
                {t("terms.postdated")}
              </label>
            </fieldset>
            <ClauseG lease={lease} />
            <fieldset className="grid gap-3 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">{t("terms.clauseF.title")}</legend>
              <p className="text-muted-foreground text-sm">{t("terms.clauseF.help")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  {t("terms.clauseF.applies")}
                  <select
                    name="clauseF"
                    defaultValue={terms?.clauseF ? (terms.clauseF.applies ? "yes" : "no") : ""}
                    className={INPUT}
                  >
                    <option value="">{t("terms.choose")}</option>
                    <option value="yes">{t("terms.yes")}</option>
                    <option value="no">{t("terms.no")}</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  {t("terms.clauseF.max")}
                  <input
                    name="clauseFMax"
                    inputMode="decimal"
                    defaultValue={centsText(terms?.clauseF?.maxRentCents)}
                    className={INPUT}
                  />
                </label>
              </div>
            </fieldset>
            <label className="grid gap-1 text-sm">
              {t("terms.otherConditions")}
              <textarea
                name="otherConditions"
                defaultValue={terms?.otherConditions ?? ""}
                maxLength={2000}
                rows={4}
                className="border-input bg-background rounded-md border p-2 text-sm"
              />
            </label>
            <Findings findings={lease.findings ?? []} />
          </fieldset>
          <Outcome state={state} />
          <div className="flex flex-wrap items-center gap-3">
            {locked ? null : (
              <Button type="submit" disabled={pending}>
                {t("terms.save")}
              </Button>
            )}
            {terms ? (
              <a
                className="text-sm underline"
                href={`/api/bff/leases/preview?leaseId=${lease.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("terms.preview")}
              </a>
            ) : null}
          </div>
        </form>
        {terms && !locked ? <CancelButton leaseId={lease.id} /> : null}
        {terms ? <p className="text-muted-foreground text-xs">{t("terms.previewNote")}</p> : null}
      </CardContent>
    </Card>
  );
}
