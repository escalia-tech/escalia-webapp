"use client";

import { useTranslations } from "next-intl";

import { BffError } from "@/lib/bff-client";

/** Translate any thrown value into a safe, localised message plus its support reference. */
export function useErrorMessage() {
  const t = useTranslations("feedback.error");

  return (error: unknown): { message: string; reference?: string } => {
    if (error instanceof BffError) {
      const key = `codes.${error.code.replace(".", "_")}` as Parameters<typeof t>[0];
      return {
        message: t.has(key) ? t(key) : t("description"),
        reference: error.correlationId,
      };
    }
    return { message: t("description") };
  };
}
