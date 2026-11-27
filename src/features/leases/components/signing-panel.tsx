"use client";

import { useId, useState, useTransition } from "react";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { Lease } from "../schemas/leases.schema";
import type { Copy, LeaseSigning } from "../schemas/signing.schema";
import { recordHandDeliveryAction, sendForSignatureAction, withdrawSigningAction } from "../server/signing.actions";
import type { SigningOutcome } from "../server/signing.service";

function CopyLine({
  leaseId,
  copy,
  onDone,
}: {
  leaseId: string;
  copy: Copy;
  onDone: (outcome: SigningOutcome) => void;
}) {
  const t = useTranslations("leases.signing");
  const format = useFormatter();
  const [pending, start] = useTransition();
  const field = useId();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const status = copy.manualDeliveryDate
    ? t("copyHand", { date: date(copy.manualDeliveryDate) })
    : copy.deliveredAt
      ? t("copyDone", { date: date(copy.deliveredAt) })
      : t("copyPending");
  return (
    <li className="grid gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{copy.name}</span>
        <span className="text-muted-foreground">{t("copyDue", { date: date(copy.dueBy) })}</span>
      </div>
      <div>{status}</div>
      {copy.channel !== "HAND" ? (
        <form
          className="flex flex-wrap items-center gap-2"
          action={(form) => start(async () => onDone(await recordHandDeliveryAction(leaseId, copy.personId, form)))}
        >
          <label htmlFor={field} className="text-xs">
            {t("handLabel")}
          </label>
          <Input id={field} name="date" type="date" required max={new Date().toISOString().slice(0, 10)} />
          <Button type="submit" variant="outline" disabled={pending}>
            {t("hand")}
          </Button>
        </form>
      ) : null}
    </li>
  );
}

/** FR-LEASE-04: send the lease for signature, follow the signers, withdraw, and record a copy handed over. */
export function SigningPanel({ lease, signing }: { lease: Lease; signing: LeaseSigning }) {
  const t = useTranslations("leases");
  const format = useFormatter();
  const [view, setView] = useState(signing);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | undefined>();
  const [pending, start] = useTransition();
  const open = view.state === "OPEN";
  const canSend = lease.status === "READY" && !open;
  const finish = (done: string) => (outcome: SigningOutcome) => {
    if (outcome.status === "done") {
      if (outcome.signing) setView(outcome.signing);
      setMessage({ tone: "success", text: done });
    } else if (outcome.status === "refused") {
      setMessage({
        tone: "danger",
        text: outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused")),
      });
    } else {
      setMessage({ tone: "danger", text: t(outcome.reason === "date" ? "refusals.deliveryDate" : "invalid.id") });
    }
  };
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signing.title")}</CardTitle>
        <CardDescription>{t("signing.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div aria-live="polite">{message ? <Callout tone={message.tone}>{message.text}</Callout> : null}</div>
        {!view.sent ? <p className="text-muted-foreground">{t("signing.none")}</p> : null}
        {view.sent && view.state ? <p className="font-medium">{t(`signing.state.${view.state}`)}</p> : null}
        {view.sentAt && view.expiresAt ? (
          <p className="text-muted-foreground">
            {t("signing.sentAt", { date: date(view.sentAt), until: date(view.expiresAt) })}
          </p>
        ) : null}
        <ul className="grid gap-2">
          {view.signers.map((signer) => (
            <li key={signer.personId} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {signer.name} <span className="text-muted-foreground font-normal">({t(`roles.${signer.role}`)})</span>
              </span>
              <span>
                {t(`signing.signerState.${signer.state}`)}
                {signer.signedAt ? ` · ${date(signer.signedAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>
        {view.documentSha256 ? (
          <p className="text-muted-foreground font-mono text-xs break-all">
            {t("signing.hash", { hash: view.documentSha256 })}
          </p>
        ) : null}
        {view.finalSha256 ? (
          <p className="text-muted-foreground font-mono text-xs break-all">
            {t("signing.finalHash", { hash: view.finalSha256 })}
          </p>
        ) : null}
        {view.copies.length > 0 ? (
          <section className="grid gap-2">
            <h3 className="font-medium">{t("signing.copies")}</h3>
            <ul className="grid gap-3">
              {view.copies.map((copy) => (
                <CopyLine key={copy.personId} leaseId={lease.id} copy={copy} onDone={finish(t("signing.handDone"))} />
              ))}
            </ul>
          </section>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {canSend ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => start(async () => finish(t("signing.sentOk"))(await sendForSignatureAction(lease.id)))}
            >
              {view.sent ? t("signing.resend") : t("signing.send")}
            </Button>
          ) : null}
          {open ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => start(async () => finish(t("signing.withdrawn"))(await withdrawSigningAction(lease.id)))}
            >
              {t("signing.withdraw")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
