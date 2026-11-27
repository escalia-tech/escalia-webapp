import { describe, expect, it } from "vitest";

import type { DashboardSummary } from "@/features/buildings/schemas/building.schema";
import { fromBff, fromDemo } from "@/features/dashboard/lib/dashboard-view";
import { dashboardPageSchema } from "@/features/dashboard/schemas/dashboard.schema";

const ageing = { currentCents: 0, days1to7Cents: 0, days8to21Cents: 0, days22PlusCents: 0 };
const page = dashboardPageSchema.parse({
  buildingCount: 2,
  unitCount: 8,
  inForceLeaseCount: 5,
  unitsByBuilding: [{ id: "b1", name: "6-plex Villeray", unitCount: 6 }],
  monthly: [
    { month: "2026-10", dueCents: 100, receivedCents: 100 },
    { month: "2026-11", dueCents: 200, receivedCents: 150 },
  ],
  receivableCents: 50,
  creditCents: 0,
  ageing,
  unavailable: [],
});

describe("fromBff", () => {
  it("shows the latest month as the rent due and received, and has no building types", () => {
    const view = fromBff(page, "2026-11");

    expect(view).toMatchObject({
      demo: false,
      period: "2026-11",
      kpis: { buildingCount: 2, unitCount: 8, rentDueCents: 200, rentReceivedCents: 150 },
      buildingsByType: null,
    });
  });

  it("keeps a figure the BFF could not give unavailable, never zero", () => {
    const view = fromBff({ ...page, buildingCount: null, unitCount: undefined, monthly: [] }, "2026-11");

    expect(view.period).toBe("2026-11");
    expect(view.kpis).toEqual({
      buildingCount: null,
      unitCount: null,
      rentDueCents: null,
      rentReceivedCents: null,
      receivedMissingCount: 0,
    });
  });
});

describe("fromDemo", () => {
  it("carries the demo figures and keeps the building types", () => {
    const summary: DashboardSummary = {
      meta: { source: "demo-fixtures", period: "2026-10" },
      kpis: { buildingCount: 1, unitCount: 6, rentDueCents: 10, rentReceivedCents: 9, receivedMissingCount: 1 },
      monthly: [],
      unitsByBuilding: [],
      buildingsByType: [],
    };

    expect(fromDemo(summary)).toMatchObject({ demo: true, period: "2026-10", buildingsByType: [] });
  });
});
