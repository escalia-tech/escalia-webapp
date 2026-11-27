"use client";

import { useState, useTransition } from "react";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { type InvitationState, invitationState, type Lease } from "../schemas/leases.schema";
import { inviteAction } from "../server/leases.actions";
import type { InviteOutcome } from "../server/leases.service";

function Status({ state }: { state: InvitationState }) {
  const t = useTranslations("leases.invitations.status");
  const format = useFormatter();
  const date = (value: Date) => format.dateTime(value, { dateStyle: "medium" });
  switch (state.kind) {
    case "joined":
      return <span>{t("joined", { date: date(state.at) })}</span>;
    case "invited":
      return <span>{t("invited", { date: date(state.at), until: date(state.until) })}</span>;
    case "expired":
      return <span className="text-destructive">{t("expired", { date: date(state.at) })}</span>;
    default:
      return <span>{t(state.kind)}</span>;
  }
}

/**
 * FR-TEN-01 BR-11: who was invited, who joined, whose link expired, and the way to send the links. The lease-wide
 * button invites tenants and guarantors; an occupant is invited only by their own button (FR-LEASE-05 section 6).
 */
export function InvitationsPanel({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<InviteOutcome | undefined>();
  const now = new Date();
  const parties = lease.parties.map((party) => ({ party, state: invitationState(party, now) }));
  const waiting = parties.some(
    ({ party, state }) => party.role !== "OCCUPANT" && state.kind !== "joined" && state.kind !== "noEmail",
  );
  const again = parties.some(({ state }) => state.kind === "invited" || state.kind === "expired");
  const send = (personId?: string) => start(async () => setOutcome(await inviteAction(lease.id, personId)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invitations.title")}</CardTitle>
        <CardDescription>{t("invitations.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div aria-live="polite">
          {outcome?.status === "sent" ? (
            <Callout tone="success">{t("invitations.sent", { count: outcome.count })}</Callout>
          ) : null}
          {outcome?.status === "invalid" ? <Callout tone="danger">{t("invalid.id")}</Callout> : null}
          {outcome?.status === "refused" ? (
            <Callout tone="danger">
              {outcome.reason ? t(`refusals.${outcome.reason}`) : (outcome.message ?? t("refused"))}
            </Callout>
          ) : null}
        </div>
        <ul className="grid gap-2 text-sm">
          {parties.map(({ party, state }) => (
            <li key={party.personId} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {party.legalName}{" "}
                <span className="font-normal text-muted-foreground">({t(`roles.${party.role}`)})</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Status state={state} />
                {state.kind === "joined" || state.kind === "noEmail" ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    aria-label={t(state.kind === "notInvited" ? "invitations.inviteOne" : "invitations.resendOne", {
                      name: party.legalName,
                    })}
                    onClick={() => send(party.personId)}
                  >
                    {state.kind === "notInvited" ? t("invitations.invite") : t("invitations.resend")}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {waiting ? (
          <div>
            <Button type="button" disabled={pending} onClick={() => send()}>
              {again ? t("invitations.resendAll") : t("invitations.send")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
