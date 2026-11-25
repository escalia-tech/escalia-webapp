"use client";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";

/**
 * Shown after a valid submission while no identity provider exists. It states plainly that nothing was
 * sent and no session was created: forms never fake a success.
 */
export function UnavailableNotice({ id }: { id?: string }) {
  const t = useTranslations("auth.unavailable");
  return (
    <Callout id={id} tone="warning" role="status" title={t("title")}>
      {t("body")}
    </Callout>
  );
}
