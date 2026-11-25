import type { ComponentProps, ReactNode } from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const calloutVariants = cva("flex gap-3 rounded-lg border p-3 text-sm leading-5", {
  variants: {
    tone: {
      info: "border-info-border bg-info-surface text-info-foreground",
      warning: "border-warning-foreground/30 bg-warning-surface text-warning-foreground",
      danger: "border-danger-foreground/30 bg-danger-surface text-danger-foreground",
      success: "border-success-foreground/30 bg-success-surface text-success-foreground",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  danger: OctagonAlert,
  success: CheckCircle2,
} as const;

interface CalloutProps extends Omit<ComponentProps<"div">, "title">, VariantProps<typeof calloutVariants> {
  title?: ReactNode;
  children?: ReactNode;
}

/**
 * Inline message with a semantic icon (never colour alone). Static messages carry no live-region
 * role; pass `role="status"` (polite) or `role="alert"` (assertive) for dynamic feedback.
 * Assistance (Info) is distinct from a warning (triangle + label).
 */
export function Callout({ tone = "info", title, children, className, ...props }: CalloutProps) {
  const Icon = ICONS[tone ?? "info"];
  return (
    <div data-slot="callout" data-tone={tone} className={cn(calloutVariants({ tone }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
