import type { BuildingType, DashboardSummary, MonthlyAmount } from "@/features/buildings/schemas/building.schema";

import type { DashboardPage } from "../schemas/dashboard.schema";

/**
 * What the dashboard shows, whether the numbers are the demo's or the real organization's. A figure the source
 * could not give is `null` and is shown as unavailable, never as zero.
 */
export interface DashboardView {
  demo: boolean;
  /** Reference month of the monetary figures (YYYY-MM). */
  period: string;
  kpis: {
    buildingCount: number | null;
    unitCount: number | null;
    rentDueCents: number | null;
    rentReceivedCents: number | null;
    receivedMissingCount: number;
  };
  monthly: MonthlyAmount[];
  unitsByBuilding: { id: string; name: string; unitCount: number }[];
  /** Only the demo has a building type; the real domain has none, so the chart is left out. */
  buildingsByType: { buildingType: BuildingType; count: number }[] | null;
}

export function fromDemo(summary: DashboardSummary): DashboardView {
  return {
    demo: true,
    period: summary.meta.period,
    kpis: summary.kpis,
    monthly: summary.monthly,
    unitsByBuilding: summary.unitsByBuilding,
    buildingsByType: summary.buildingsByType,
  };
}

/** Rent due and received are the figures of the latest month the BFF gave; without ledgers they stay unavailable. */
export function fromBff(page: DashboardPage, currentMonth: string): DashboardView {
  const latest = page.monthly.at(-1);
  return {
    demo: false,
    period: latest?.month ?? currentMonth,
    kpis: {
      buildingCount: page.buildingCount ?? null,
      unitCount: page.unitCount ?? null,
      rentDueCents: latest?.dueCents ?? null,
      rentReceivedCents: latest?.receivedCents ?? null,
      receivedMissingCount: 0,
    },
    monthly: page.monthly,
    unitsByBuilding: page.unitsByBuilding,
    buildingsByType: null,
  };
}
