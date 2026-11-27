"use client";

import { useState } from "react";

import { FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { bffFetch } from "@/lib/bff-client";
import { useErrorMessage } from "@/lib/use-error-message";

const USERS = ["landlord-1", "coowner-1", "tenant-1", "applicant-1"] as const;

/** Local sign-in as a test user, without DevTools. Rendered only when the server says it is available. */
export function DevSignIn({ returnTo }: { returnTo: string }) {
  const t = useTranslations("auth.devSignIn");
  const toErrorMessage = useErrorMessage();
  const [user, setUser] = useState<(typeof USERS)[number]>("landlord-1");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ message: string } | null>(null);

  async function enter() {
    setPending(true);
    setFailure(null);
    try {
      const { redirectTo } = await bffFetch<{ redirectTo: string }>("/api/bff/dev/session", {
        method: "POST",
        body: { user, returnTo },
      });
      window.location.assign(redirectTo);
    } catch (error) {
      setFailure(toErrorMessage(error));
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="dev-sign-in-title" className="mt-6 space-y-3 rounded-lg border border-dashed p-4">
      <h2 id="dev-sign-in-title" className="flex items-center gap-2 text-sm font-semibold">
        <FlaskConical className="size-4" aria-hidden />
        {t("title")}
      </h2>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <label className="block text-sm">
        <span className="mb-1 block">{t("user")}</span>
        <select
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={user}
          onChange={(event) => setUser(event.target.value as (typeof USERS)[number])}
        >
          {USERS.map((value) => (
            <option key={value} value={value}>
              {t(`users.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {failure ? (
        <Callout tone="danger" role="alert" title={t("error")}>
          {failure.message}
        </Callout>
      ) : null}
      <Button type="button" className="w-full" onClick={enter} disabled={pending} aria-busy={pending}>
        {pending ? t("entering") : t("enter")}
      </Button>
    </section>
  );
}
