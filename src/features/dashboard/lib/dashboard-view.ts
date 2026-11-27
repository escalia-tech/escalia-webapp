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
  /** The figures below exist only for the real organization (FR-DASH-01); the demo has none of them. */
  real: RealFigures | null;
}

export interface RealFigures {
  occupancy: { occupied: number; total: number; ratePercent: number | null } | null;
  /** Payments received over rent charged in the latest month, in percent; null when nothing was charged. */
  collectionPercent: number | null;
  arrears: { ageing: DashboardPage["ageing"]; receivableCents: number; creditCents: number; ledgersMissing: boolean };
  endingSoon: DashboardPage["endingSoon"];
  waiting: DashboardPage["waiting"];
  vacantUnits: DashboardPage["vacantUnits"];
  rent: DashboardPage["rent"];
}

export function fromDemo(summary: DashboardSummary): DashboardView {
  return {
    demo: true,
    period: summary.meta.period,
    kpis: summary.kpis,
    monthly: summary.monthly,
    unitsByBuilding: summary.unitsByBuilding,
    buildingsByType: summary.buildingsByType,
    real: null,
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
    real: {
      occupancy: occupancy(page),
      collectionPercent:
        latest && latest.dueCents > 0 ? Math.round((latest.receivedCents / latest.dueCents) * 100) : null,
      arrears: {
        ageing: page.ageing,
        receivableCents: page.receivableCents,
        creditCents: page.creditCents,
        ledgersMissing: page.unavailable.includes("ledgers"),
      },
      endingSoon: page.endingSoon ?? null,
      waiting: page.waiting ?? null,
      vacantUnits: page.vacantUnits,
      rent: page.rent ?? null,
    },
  };
}

function occupancy(page: DashboardPage): RealFigures["occupancy"] {
  if (page.occupiedUnitCount == null || page.unitCount == null) return null;
  const total = page.unitCount;
  return {
    occupied: page.occupiedUnitCount,
    total,
    ratePercent: total > 0 ? Math.round((page.occupiedUnitCount / total) * 100) : null,
  };
}
