"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoney } from "@/lib/format";

interface ArrearsBarChartProps {
  data: { bucket: string; label: string; cents: number }[];
}

/** Amounts owed by how late they are. Each bar carries its amount as text, not colour alone. */
export function ArrearsBarChart({ data }: ArrearsBarChartProps) {
  const t = useTranslations("dashboard.real.arrears");
  const locale = useLocale();
  const config = { amount: { label: t("series"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const rows = data.map((row) => ({ label: row.label, amount: row.cents / 100 }));
  const money = (value: unknown) => formatMoney(Math.round(Number(value) * 100), locale) ?? "";

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={rows} margin={{ left: 4, right: 12, top: 16 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={money} />
        <ChartTooltip content={<ChartTooltipContent hideIndicator formatter={(value) => money(value)} />} />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={4} isAnimationActive={false}>
          <LabelList
            dataKey="amount"
            position="top"
            formatter={money}
            className="fill-foreground text-xs tabular-nums"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
