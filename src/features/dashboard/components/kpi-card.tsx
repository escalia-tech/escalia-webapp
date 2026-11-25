import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  /** Pre-formatted value. Use a dash plus `valueLabel` when the value is unavailable. */
  value: string;
  info: string;
  infoLabel: string;
  icon: LucideIcon;
  note?: ReactNode;
}

/** Key figure card. Tabular numerals keep digits aligned; the info tooltip is assistance, not a warning. */
export function KpiCard({ label, value, info, infoLabel, icon: Icon, note }: KpiCardProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{label}</span>
            <InfoTooltip label={infoLabel}>{info}</InfoTooltip>
          </span>
          <Icon className="size-4 shrink-0" aria-hidden />
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
