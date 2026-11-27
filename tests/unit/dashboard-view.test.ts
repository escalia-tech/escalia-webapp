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
  occupiedUnitCount: 6,
  endingSoon: { within60: 1, within90: 2, next: [] },
  waiting: { outForSignature: 1, invitationsPending: 2, neverInvited: 3 },
  vacantUnits: [{ buildingName: "6-plex Villeray", unitLabel: "2", daysVacant: 40, lastRentCents: 90000 }],
  rent: { actualCents: 250000, vacancyCents: 90000, unitsWithoutKnownRent: 0 },
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

describe("fromBff, the added metrics", () => {
  it("computes the occupancy and collection rates and passes the rest through", () => {
    const real = fromBff(page, "2026-11").real;

    expect(real?.occupancy).toEqual({ occupied: 6, total: 8, ratePercent: 75 });
    expect(real?.collectionPercent).toBe(75);
    expect(real?.waiting).toEqual({ outForSignature: 1, invitationsPending: 2, neverInvited: 3 });
    expect(real?.rent?.actualCents).toBe(250000);
    expect(real?.vacantUnits).toHaveLength(1);
    expect(real?.arrears.ledgersMissing).toBe(false);
  });

  it("shows no rate when nothing was charged or there are no units, and no occupancy when a source is missing", () => {
    const empty = fromBff(
      { ...page, unitCount: 0, occupiedUnitCount: 0, monthly: [{ month: "2026-11", dueCents: 0, receivedCents: 0 }] },
      "2026-11",
    ).real;
    const missing = fromBff(
      {
        ...page,
        occupiedUnitCount: undefined,
        endingSoon: undefined,
        waiting: undefined,
        rent: undefined,
        monthly: [],
      },
      "2026-11",
    ).real;

    expect(empty?.occupancy).toEqual({ occupied: 0, total: 0, ratePercent: null });
    expect(empty?.collectionPercent).toBeNull();
    expect(missing).toMatchObject({
      occupancy: null,
      endingSoon: null,
      waiting: null,
      rent: null,
      collectionPercent: null,
    });
  });

  it("flags missing ledgers", () => {
    expect(fromBff({ ...page, unavailable: ["ledgers"] }, "2026-11").real?.arrears.ledgersMissing).toBe(true);
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

    expect(fromDemo(summary)).toMatchObject({ demo: true, period: "2026-10", buildingsByType: [], real: null });
  });
});
