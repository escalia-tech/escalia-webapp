"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { RefusalKey, SignerView, Who } from "../schemas/signing.schema";
import {
  consentAction,
  declineAction,
  preferPaperAction,
  sendCodeAction,
  signAction,
  verifyCodeAction,
} from "../server/signing.actions";
import type { CodeOutcome, Outcome } from "../server/signing.service";
import { DrawingPad } from "./drawing-pad";

const INPUT = "border-input bg-background h-9 rounded-md border px-2 text-sm";

type Notice = { tone: "danger" | "success" | "info"; text: string };

function documentUrl(who: Who): string {
  const query = who.kind === "session" ? `requestId=${who.requestId}` : `token=${who.token}`;
  return `/api/bff/signing/document?${query}`;
}

/**
 * FR-DOC-02: read the document, accept to sign electronically (BR-3), prove who you are with a code when the purpose
 * asks (BR-2), then sign with a typed name and, if you like, a drawing (BR-4). Declining and preferring paper are
 * always there (BR-9).
 */
export function SignFlow({ who, view }: { who: Who; view: SignerView }) {
  const t = useTranslations("signing");
  const format = useFormatter();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<Notice | undefined>();
  const [variation, setVariation] = useState(false);
  const [drawing, setDrawing] = useState("");
  const [declining, setDeclining] = useState(false);
  const [read, setRead] = useState(false);

  const open = view.state === "OPEN" && view.signerState === "INVITED";
  const needsCode = view.authLevel !== "SESSION" && !view.verified;

  function explain(outcome: Outcome | CodeOutcome): boolean {
    if (outcome.status === "refused") {
      const key: RefusalKey | undefined = outcome.reason;
      if (key === "nameVariation") setVariation(true);
      setNotice({ tone: "danger", text: key ? t(`refusals.${key}`) : (outcome.message ?? t("refused")) });
      return false;
    }
    if (outcome.status === "invalid") {
      setNotice({ tone: "danger", text: t(`invalid.${outcome.reason}`) });
      return false;
    }
    return true;
  }

  function run(task: () => Promise<Outcome | CodeOutcome>, success?: string) {
    start(async () => {
      const outcome = await task();
      if (explain(outcome)) {
        setNotice(success ? { tone: "success", text: success } : undefined);
        router.refresh();
      }
    });
  }

  if (view.state !== "OPEN") {
    return <Callout tone="info">{t(`state.${view.state}`)}</Callout>;
  }
  if (view.signerState === "SIGNED") return <Callout tone="success">{t("state.signed")}</Callout>;
  if (view.signerState === "DECLINED") return <Callout tone="info">{t("state.declined")}</Callout>;
  if (view.signerState === "WAITING") return <Callout tone="info">{t("state.waiting")}</Callout>;

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{view.title}</CardTitle>
          <CardDescription>
            {t("meta", { role: view.role, date: format.dateTime(new Date(view.expiresAt), { dateStyle: "long" }) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <iframe
            title={t("document")}
            src={documentUrl(who)}
            className="h-[28rem] w-full rounded-md border"
            sandbox=""
          />
          <p className="text-muted-foreground text-xs break-all">
            {t("fingerprint")} {view.sha256}
          </p>
        </CardContent>
      </Card>

      <div aria-live="polite" className="grid gap-2">
        {notice ? <Callout tone={notice.tone}>{notice.text}</Callout> : null}
      </div>

      {!view.consented ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("consent.title")}</CardTitle>
            <CardDescription>{t("consent.text")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => run(() => consentAction(who))}>
              {t("consent.accept")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => preferPaperAction(who), t("consent.paperSent"))}
            >
              {t("consent.paper")}
            </Button>
          </CardContent>
        </Card>
      ) : needsCode ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("code.title")}</CardTitle>
            <CardDescription>{t("code.text", { email: view.maskedEmail })}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => sendCodeAction(who), t("code.sent", { email: view.maskedEmail }))}
              >
                {t("code.send")}
              </Button>
            </div>
            <form className="flex flex-wrap items-end gap-2" action={(form) => run(() => verifyCodeAction(who, form))}>
              <label className="grid gap-1 text-sm">
                {t("code.label")}
                <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={INPUT} />
              </label>
              <Button type="submit" disabled={pending}>
                {t("code.verify")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("sign.title")}</CardTitle>
            <CardDescription>{t("sign.text")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              action={(form) => {
                form.set("drawing", drawing);
                run(() => signAction(who, form));
              }}
            >
              <label className="grid gap-1 text-sm">
                {t("sign.name")}
                <input
                  name="typedName"
                  defaultValue={view.expectedName}
                  autoComplete="name"
                  className={`${INPUT} max-w-md`}
                />
              </label>
              {variation ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="confirmVariation" className="accent-primary size-4" />
                  {t("sign.confirmVariation", { name: view.expectedName })}
                </label>
              ) : null}
              <div className="grid gap-1 text-sm">
                {t("sign.drawing")}
                <DrawingPad onChange={setDrawing} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={read}
                  onChange={(event) => setRead(event.target.checked)}
                  className="accent-primary size-4"
                />
                {t("sign.read")}
              </label>
              <div>
                <Button type="submit" disabled={pending || !read}>
                  {t("sign.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {open ? (
        <div>
          {declining ? (
            <form className="grid max-w-md gap-2" action={(form) => run(() => declineAction(who, form))}>
              <label className="grid gap-1 text-sm">
                {t("decline.reason")}
                <textarea
                  name="reason"
                  maxLength={500}
                  rows={3}
                  className="border-input bg-background rounded-md border p-2 text-sm"
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" disabled={pending}>
                  {t("decline.submit")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDeclining(false)}>
                  {t("decline.cancel")}
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="outline" onClick={() => setDeclining(true)}>
              {t("decline.open")}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
