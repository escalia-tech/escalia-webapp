"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface UnitsBarChartProps {
  data: { id: string; name: string; unitCount: number }[];
}

/** Horizontal bars: units per building, each bar labelled with its value (not colour alone). */
export function UnitsBarChart({ data }: UnitsBarChartProps) {
  const t = useTranslations("dashboard.charts.units");
  const config = { unitCount: { label: t("series"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const height = Math.max(200, data.length * 40 + 24);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32 }} accessibilityLayer>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={132}
          tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 19)}…` : value)}
        />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="unitCount" fill="var(--color-unitCount)" radius={4} isAnimationActive={false}>
          <LabelList dataKey="unitCount" position="right" className="fill-foreground text-xs tabular-nums" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
