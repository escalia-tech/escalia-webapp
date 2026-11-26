"use client";

import { useState } from "react";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { SealedCheck } from "../schemas/signing.schema";
import { checkHashAction } from "../server/verify.actions";

/** The SHA-256 of a file, computed in the browser: the file never leaves the device (FR-DOC-02 BR-13). */
export async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function VerifyForm() {
  const t = useTranslations("signing.verify");
  const format = useFormatter();
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<SealedCheck | undefined>();
  const [error, setError] = useState(false);

  async function choose(file: File | undefined) {
    if (!file) return;
    const computed = await sha256Hex(file);
    setHash(computed);
    const answer = await checkHashAction(computed);
    setError(answer.status !== "checked");
    setResult(answer.status === "checked" ? answer.result : undefined);
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <input
          type="file"
          accept="application/pdf"
          aria-label={t("choose")}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        {hash ? <p className="text-muted-foreground text-xs break-all">{hash}</p> : null}
        <div aria-live="polite" className="grid gap-2">
          {error ? <Callout tone="danger">{t("error")}</Callout> : null}
          {result?.found ? (
            <Callout tone="success">
              {t("found", {
                title: result.title ?? "",
                date: result.completedAt ? format.dateTime(new Date(result.completedAt), { dateStyle: "long" }) : "",
                signers: result.signers ?? 0,
              })}
            </Callout>
          ) : null}
          {result && !result.found ? <Callout tone="warning">{t("notFound")}</Callout> : null}
        </div>
      </CardContent>
    </Card>
  );
}
