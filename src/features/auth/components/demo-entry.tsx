"use client";

import { useState } from "react";

import { FlaskConical } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bffFetch } from "@/lib/bff-client";
import { useErrorMessage } from "@/lib/use-error-message";

/** Explicit demo entry (non-production only, rendered only when the server says it is available). */
export function DemoEntry() {
  const t = useTranslations("auth.demo");
  const tDemo = useTranslations("common.status");
  const locale = useLocale();
  const toErrorMessage = useErrorMessage();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; reference?: string } | null>(null);

  async function enter() {
    setPending(true);
    setFailure(null);
    try {
      const { redirectTo } = await bffFetch<{ redirectTo: string }>("/api/bff/demo/session", {
        method: "POST",
        body: { locale },
      });
      // Full navigation so the new HttpOnly cookie is used for the first authenticated render.
      window.location.assign(redirectTo);
    } catch (error) {
      setFailure(toErrorMessage(error));
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="demo-entry-title" className="mt-6 space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="demo-entry-title" className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="size-4" aria-hidden />
          {t("title")}
        </h2>
        <Badge variant="outline">{tDemo("demo")}</Badge>
      </div>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      {failure ? (
        <Callout tone="danger" role="alert" title={t("error")}>
          {failure.message}
          {failure.reference ? <span className="block font-mono text-xs">{failure.reference}</span> : null}
        </Callout>
      ) : null}
      <Button type="button" variant="outline" className="w-full" onClick={enter} disabled={pending} aria-busy={pending}>
        {pending ? t("entering") : t("enter")}
      </Button>
    </section>
  );
}
