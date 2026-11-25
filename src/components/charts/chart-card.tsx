import type { ReactNode } from "react";

import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description: string;
  info?: string;
  infoLabel?: string;
  /** Text summary announced for the chart (the chart is a figure with a textual alternative). */
  summary: string;
  tableToggleLabel: string;
  table: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Card wrapper for a chart: title, assistance tooltip, accessible summary and a data-table alternative. */
export function ChartCard({
  title,
  description,
  info,
  infoLabel,
  summary,
  tableToggleLabel,
  table,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          <span>{title}</span>
          {info && infoLabel ? <InfoTooltip label={infoLabel}>{info}</InfoTooltip> : null}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <figure className="m-0">
          <div role="img" aria-label={summary}>
            {children}
          </div>
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
        <details className="group text-sm">
          <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 cursor-pointer items-center rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-2">
            {tableToggleLabel}
          </summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      </CardContent>
    </Card>
  );
}
