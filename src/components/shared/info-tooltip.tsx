"use client";

import { type ReactNode, useState } from "react";

import { Info } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Accessible name of the trigger, e.g. "More information about rent due". */
  label: string;
  /** Short explanatory text (assistance, not a warning). Keep under ~140 characters. */
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * InfoTooltip (V7): Lucide `Info` icon (16px, no coloured background) with a transparent hit area
 * (24px, 44px on coarse pointers). Opens on hover after 200ms, on keyboard focus and on tap/click;
 * closes on Escape; the content is hoverable and persistent (WCAG 1.4.13) and linked to the trigger
 * through aria-describedby. It is NOT a warning: use an Alert (triangle + label) for risks.
 */
export function InfoTooltip({ label, children, className, side = "top" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen} delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(event) => {
            // Tap/click toggles (touch devices have no hover); skip Radix's close-on-click.
            event.preventDefault();
            setOpen((current) => !current);
          }}
          className={cn(
            "text-info-icon inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-transparent align-middle pointer-coarse:size-11",
            "hover:text-info-foreground focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2",
            className,
          )}
        >
          <Info className="size-4" aria-hidden />
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "border-info-border bg-info-surface text-info-foreground z-50 max-w-[280px] rounded-[6px] border px-3 py-2.5 text-[13px] leading-[18px] shadow-md",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 origin-(--radix-tooltip-content-transform-origin) duration-150",
          )}
        >
          {children}
          <TooltipPrimitive.Arrow className="fill-info-surface stroke-info-border" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
