"use client";

import type { ReactNode } from "react";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Correlation id shown as a support reference (diagnostic label, not a secret). */
  reference?: string;
  /** Present only for safe, idempotent retries. */
  onRetry?: () => void;
  retrying?: boolean;
  /** `blocking` is persistent and large; `inline` fits inside a card or section. */
  variant?: "blocking" | "inline";
  actions?: ReactNode;
  className?: string;
}

/** Recoverable or blocking error with an optional safe retry and a support reference. */
export function ErrorState({
  title,
  description,
  reference,
  onRetry,
  retrying = false,
  variant = "inline",
  actions,
  className,
}: ErrorStateProps) {
  const t = useTranslations("feedback.error");
  const tc = useTranslations("common.actions");

  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn(
        "border-danger-foreground/30 bg-danger-surface text-danger-foreground flex flex-col items-center gap-3 rounded-lg border p-6 text-center",
        variant === "blocking" && "py-12",
        className,
      )}
    >
      <TriangleAlert className="size-6" aria-hidden />
      <div className="max-w-md space-y-1">
        <p className="text-base font-semibold">{title ?? t("title")}</p>
        <p className="text-sm">{description ?? t("description")}</p>
        {reference ? <p className="pt-1 text-xs opacity-90">{t("reference", { id: reference })}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry} disabled={retrying}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            {tc("retry")}
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
