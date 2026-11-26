"use client";

import { useTranslations } from "next-intl";
import { Cell, Label, Pie, PieChart } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { BuildingType } from "@/features/buildings/schemas/building.schema";

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)", "var(--chart-4)", "var(--chart-2)"];

interface TypesDonutChartProps {
  data: { buildingType: BuildingType; count: number }[];
}

/** Donut with a visible legend listing label and count for each segment (colour is never the only cue). */
export function TypesDonutChart({ data }: TypesDonutChartProps) {
  const t = useTranslations("dashboard.charts.types");
  const tTypes = useTranslations("buildings.types");
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  const rows = data.map((entry, index) => ({
    key: entry.buildingType,
    name: tTypes(entry.buildingType),
    count: entry.count,
    fill: COLORS[index % COLORS.length] ?? "var(--chart-1)",
  }));

  const config = Object.fromEntries(
    rows.map((row) => [row.key, { label: row.name, color: row.fill }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <ChartContainer config={config} className="aspect-square h-48 w-48 shrink-0">
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie
            data={rows}
            dataKey="count"
            nameKey="key"
            innerRadius={52}
            outerRadius={80}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell key={row.key} fill={row.fill} />
            ))}
            <Label
              content={({ viewBox }) =>
                viewBox && "cx" in viewBox && "cy" in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="fill-foreground text-2xl font-semibold">
                      {total}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-xs">
                      {t("total")}
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="space-y-1.5 text-sm">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: row.fill }} aria-hidden />
            <span>{row.name}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
