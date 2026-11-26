"use client";

import { useLocale, useTranslations } from "next-intl";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthlyAmount } from "@/features/buildings/schemas/building.schema";
import { formatMoney, formatMonth } from "@/lib/format";

/** Monthly rent due (dashed line) vs rent received (filled area). `null` stays a gap, never zero. */
export function RentTrendChart({ data }: { data: MonthlyAmount[] }) {
  const t = useTranslations("dashboard.charts.rent");
  const locale = useLocale();

  const config = {
    received: { label: t("received"), color: "var(--chart-1)" },
    due: { label: t("due"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const rows = data.map((entry) => ({
    month: entry.month,
    due: entry.dueCents === null ? null : entry.dueCents / 100,
    received: entry.receivedCents === null ? null : entry.receivedCents / 100,
  }));

  const money = (value: unknown) => formatMoney(Math.round(Number(value) * 100), locale) ?? "";

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72">
      <ComposedChart data={rows} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => formatMonth(value, locale)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatMoney(Math.round(value * 100), locale, { compact: true }) ?? ""}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const month = payload?.[0]?.payload?.month as string | undefined;
                return month ? formatMonth(month, locale, "long") : "";
              }}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                  <span className="font-mono font-medium tabular-nums">{money(value)}</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="received"
          type="monotone"
          fill="var(--color-received)"
          fillOpacity={0.25}
          stroke="var(--color-received)"
          strokeWidth={2}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="due"
          type="monotone"
          stroke="var(--color-due)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
