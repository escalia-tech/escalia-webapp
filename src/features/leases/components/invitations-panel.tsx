"use client";

import { useState, useTransition } from "react";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { INVITATION_DAYS, type Lease, type LeaseParty } from "../schemas/leases.schema";
import { inviteAction } from "../server/leases.actions";
import type { InviteOutcome } from "../server/leases.service";

const DAY_MS = 24 * 60 * 60 * 1000;

function Status({ party }: { party: LeaseParty }) {
  const t = useTranslations("leases.invitations.status");
  const format = useFormatter();
  const date = (value: Date) => format.dateTime(value, { dateStyle: "medium" });
  if (party.joinedAt) return <span>{t("joined", { date: date(new Date(party.joinedAt)) })}</span>;
  if (party.invitedAt) {
    const sent = new Date(party.invitedAt);
    return (
      <span>
        {t("invited", { date: date(sent), until: date(new Date(sent.getTime() + INVITATION_DAYS * DAY_MS)) })}
      </span>
    );
  }
  return <span>{party.email ? t("notInvited") : t("noEmail")}</span>;
}

/** FR-TEN-01: who was invited, who joined, and the way to send the links. */
export function InvitationsPanel({ lease }: { lease: Lease }) {
  const t = useTranslations("leases");
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<InviteOutcome | undefined>();
  const waiting = lease.parties.some((one) => !one.joinedAt);
  const again = lease.parties.some((one) => one.invitedAt && !one.joinedAt);
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
          {lease.parties.map((party) => (
            <li key={party.personId} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {party.legalName}{" "}
                <span className="text-muted-foreground font-normal">({t(`roles.${party.role}`)})</span>
              </span>
              <span className="text-muted-foreground">
                <Status party={party} />
              </span>
            </li>
          ))}
        </ul>
        {waiting ? (
          <div>
            <Button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setOutcome(await inviteAction(lease.id)))}
            >
              {again ? t("invitations.resend") : t("invitations.send")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
