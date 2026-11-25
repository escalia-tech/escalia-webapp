"use client";

import { useTranslations } from "next-intl";

/** Maps a Zod issue (whose `message` is a key of `auth.validation`) to localised text. */
export function useValidationMessage() {
  const t = useTranslations("auth.validation");
  return (issue?: { message?: string }): string | undefined => {
    if (!issue?.message) return undefined;
    const key = issue.message as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : t("required");
  };
}
