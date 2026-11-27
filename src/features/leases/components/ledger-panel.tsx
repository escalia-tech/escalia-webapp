"use client";

import { useId, useState, useTransition } from "react";

import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  correctable,
  type LeaseLedger,
  type LedgerEntry,
  MANUAL_TYPES,
  openCharges,
  PAYMENT_METHODS,
  pick,
} from "../schemas/ledger.schema";
import { addEntryAction, recordPaymentAction, reverseEntryAction } from "../server/ledger.actions";
import type { LedgerOutcome } from "../server/ledger.service";

const SELECT = "border-input bg-background h-9 rounded-md border px-2 text-sm";
type Message = { tone: "success" | "danger"; text: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newKey(): string {
  return crypto.randomUUID();
}

/** Says what happened in the page's words: the core's refusal when we have no words of our own. */
function useOutcome(onLedger: (ledger: LeaseLedger) => void, setMessage: (message: Message) => void) {
  const t = useTranslations("leases");
  return (done: string) => (outcome: LedgerOutcome) => {
    if (outcome.status === "done") {
      if (outcome.ledger) onLedger(outcome.ledger);
      setMessage({ tone: "success", text: done });
    } else if (outcome.status === "refused") {
      setMessage({
        tone: "danger",
        text: outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused")),
      });
    } else {
      setMessage({ tone: "danger", text: t(`ledger.invalid.${outcome.reason}`) });
    }
  };
}

function Money({ cents }: { cents: number }) {
  const format = useFormatter();
  return <span>{format.number(cents / 100, { style: "currency", currency: "CAD" })}</span>;
}

function EntryRow({
  leaseId,
  entry,
  onDone,
}: {
  leaseId: string;
  entry: LedgerEntry;
  onDone: (outcome: LedgerOutcome) => void;
}) {
  const t = useTranslations("leases.ledger");
  const locale = useLocale();
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(newKey);
  const [pending, start] = useTransition();
  const field = useId();
  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-3 whitespace-nowrap">
        {format.dateTime(new Date(`${entry.effectiveOn}T12:00:00`), { dateStyle: "medium" })}
      </td>
      <td className="py-2 pr-3">
        <div>{pick(entry.description, locale)}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {entry.reversed ? <Badge variant="outline">{t("corrected")}</Badge> : null}
          {entry.reverses ? <Badge variant="secondary">{t("correction")}</Badge> : null}
          {entry.backdatedOn ? (
            <Badge variant="outline">
              {t("backdated", {
                date: format.dateTime(new Date(`${entry.backdatedOn}T12:00:00`), { dateStyle: "medium" }),
              })}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="py-2 pr-3 text-right">{entry.chargeCents > 0 ? <Money cents={entry.chargeCents} /> : null}</td>
      <td className="py-2 pr-3 text-right">{entry.paymentCents > 0 ? <Money cents={entry.paymentCents} /> : null}</td>
      <td className="py-2 pr-3 text-right font-medium">
        <Money cents={entry.balanceCents} />
      </td>
      <td className="py-2">
        {correctable(entry) && !open ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            {t("correct")}
          </Button>
        ) : null}
        {correctable(entry) && open ? (
          <form
            className="grid gap-1"
            action={(form) =>
              start(async () => {
                const outcome = await reverseEntryAction(leaseId, entry.id, key, form);
                if (outcome.status === "done") setOpen(false);
                setKey(newKey());
                onDone(outcome);
              })
            }
          >
            <label htmlFor={field} className="text-xs">
              {t("correctReason")}
            </label>
            <Input id={field} name="reason" required maxLength={200} />
            <Button type="submit" variant="outline" disabled={pending}>
              {t("correctConfirm")}
            </Button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}

function PaymentForm({
  leaseId,
  view,
  onDone,
}: {
  leaseId: string;
  view: LeaseLedger;
  onDone: (o: LedgerOutcome) => void;
}) {
  const t = useTranslations("leases.ledger");
  const locale = useLocale();
  const [key, setKey] = useState(newKey);
  const [pending, start] = useTransition();
  const id = useId();
  const charges = openCharges(view.entries);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      action={(form) =>
        start(async () => {
          const outcome = await recordPaymentAction(leaseId, key, form);
          if (outcome.status === "done") setKey(newKey());
          onDone(outcome);
        })
      }
    >
      <h3 className="font-medium sm:col-span-2">{t("payment.title")}</h3>
      <label htmlFor={`${id}-date`} className="grid gap-1 text-sm">
        {t("payment.date")}
        <Input id={`${id}-date`} name="date" type="date" required defaultValue={today()} max={today()} />
      </label>
      <label htmlFor={`${id}-amount`} className="grid gap-1 text-sm">
        {t("payment.amount")}
        <Input id={`${id}-amount`} name="amount" inputMode="decimal" required />
      </label>
      <label htmlFor={`${id}-method`} className="grid gap-1 text-sm">
        {t("payment.method")}
        <select id={`${id}-method`} name="method" defaultValue="INTERAC" className={SELECT}>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {t(`methods.${method}`)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-designated`} className="grid gap-1 text-sm">
        {t("payment.designated")}
        <select id={`${id}-designated`} name="designated" defaultValue="" className={SELECT}>
          <option value="">{t("payment.oldest")}</option>
          {charges.map((charge) => (
            <option key={charge.id} value={charge.id}>
              {pick(charge.description, locale)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-note`} className="grid gap-1 text-sm sm:col-span-2">
        {t("payment.note")}
        <Input id={`${id}-note`} name="note" maxLength={200} />
      </label>
      <p className="text-muted-foreground text-xs sm:col-span-2">{t("payment.hint")}</p>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || view.blocked}>
          {t("payment.submit")}
        </Button>
      </div>
    </form>
  );
}

function EntryForm({
  leaseId,
  blocked,
  onDone,
}: {
  leaseId: string;
  blocked: boolean;
  onDone: (o: LedgerOutcome) => void;
}) {
  const t = useTranslations("leases.ledger");
  const [key, setKey] = useState(newKey);
  const [pending, start] = useTransition();
  const id = useId();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      action={(form) =>
        start(async () => {
          const outcome = await addEntryAction(leaseId, key, form);
          if (outcome.status === "done") setKey(newKey());
          onDone(outcome);
        })
      }
    >
      <h3 className="font-medium sm:col-span-2">{t("entry.title")}</h3>
      <label htmlFor={`${id}-type`} className="grid gap-1 text-sm">
        {t("entry.type")}
        <select id={`${id}-type`} name="type" defaultValue="OTHER_CHARGE" className={SELECT}>
          {MANUAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-date`} className="grid gap-1 text-sm">
        {t("entry.date")}
        <Input id={`${id}-date`} name="date" type="date" required defaultValue={today()} />
      </label>
      <label htmlFor={`${id}-amount`} className="grid gap-1 text-sm">
        {t("entry.amount")}
        <Input id={`${id}-amount`} name="amount" inputMode="decimal" required />
      </label>
      <label htmlFor={`${id}-reason`} className="grid gap-1 text-sm">
        {t("entry.reason")}
        <Input id={`${id}-reason`} name="reason" required maxLength={200} />
      </label>
      <p className="text-muted-foreground text-xs sm:col-span-2">{t("entry.hint")}</p>
      <div className="sm:col-span-2">
        <Button type="submit" variant="outline" disabled={pending || blocked}>
          {t("entry.submit")}
        </Button>
      </div>
    </form>
  );
}

/** FR-LEDG-01: what the tenants owe and paid, the age of the debt, a payment, an entry by hand and a correction. */
export function LedgerPanel({ leaseId, ledger }: { leaseId: string; ledger: LeaseLedger }) {
  const t = useTranslations("leases.ledger");
  const [view, setView] = useState(ledger);
  const [message, setMessage] = useState<Message | undefined>();
  const outcome = useOutcome(setView, setMessage);
  const ageing = [
    ["current", view.ageing.currentCents],
    ["d1", view.ageing.days1to7Cents],
    ["d8", view.ageing.days8to21Cents],
    ["d22", view.ageing.days22PlusCents],
  ] as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 text-sm">
        <div aria-live="polite">{message ? <Callout tone={message.tone}>{message.text}</Callout> : null}</div>
        {view.blocked ? <Callout tone="warning">{t("blocked")}</Callout> : null}
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("balance")}</dt>
            <dd className="text-2xl font-semibold">
              <Money cents={view.balanceCents} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("credit")}</dt>
            <dd className="text-2xl font-semibold">
              <Money cents={view.creditCents} />
            </dd>
          </div>
        </dl>
        <div>
          <h3 className="mb-1 font-medium">{t("ageing.title")}</h3>
          <dl className="grid gap-2 sm:grid-cols-4">
            {ageing.map(([name, cents]) => (
              <div key={name}>
                <dt className="text-muted-foreground text-xs">{t(`ageing.${name}`)}</dt>
                <dd>
                  <Money cents={cents} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <PaymentForm leaseId={leaseId} view={view} onDone={outcome(t("payment.done"))} />
        <EntryForm leaseId={leaseId} blocked={view.blocked} onDone={outcome(t("entry.done"))} />
        <div className="overflow-x-auto">
          {view.entries.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="pr-3 font-normal">{t("columns.date")}</th>
                  <th className="pr-3 font-normal">{t("columns.description")}</th>
                  <th className="pr-3 text-right font-normal">{t("columns.charge")}</th>
                  <th className="pr-3 text-right font-normal">{t("columns.payment")}</th>
                  <th className="pr-3 text-right font-normal">{t("columns.balance")}</th>
                  <th className="font-normal">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {view.entries.map((entry) => (
                  <EntryRow key={entry.id} leaseId={leaseId} entry={entry} onDone={outcome(t("entry.corrected"))} />
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <a className="underline" href={`/api/bff/ledger/csv?leaseId=${leaseId}`} download>
            {t("csv")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
