import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildingListQuerySchema } from "@/features/buildings/schemas/building.schema";

async function loadService(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("@/features/buildings/server/buildings.service");
}

const defaultQuery = buildingListQuerySchema.parse({});

describe("buildings service", () => {
  beforeEach(() => vi.stubEnv("LOG_LEVEL", "fatal"));
  afterEach(() => vi.unstubAllEnvs());

  describe("with demo mode enabled (local)", () => {
    const env = { NODE_ENV: "development", APP_ENV: "local", DEMO_MODE_ENABLED: "true" };

    it("paginates and sorts fixtures", async () => {
      const { listBuildings } = await loadService(env);
      const first = await listBuildings(defaultQuery);
      expect(first.items).toHaveLength(10);
      expect(first.totalCount).toBeGreaterThan(10);
      expect(first.meta.source).toBe("demo-fixtures");
      const names = first.items.map((item) => item.name);
      expect([...names].sort((a, b) => a.localeCompare(b, "fr"))).toEqual(names);
    });

    it("filters by text without diacritic sensitivity and by type", async () => {
      const { listBuildings } = await loadService(env);
      const byText = await listBuildings({ ...defaultQuery, q: "cedre" });
      expect(byText.items.some((item) => item.id === "demo-cedre")).toBe(true);
      const byType = await listBuildings({ ...defaultQuery, type: "commercial", pageSize: 50 });
      expect(byType.items.every((item) => item.buildingType === "commercial")).toBe(true);
    });

    it("keeps rent due and rent received distinct and never turns missing data into zero", async () => {
      const { getDashboardSummary, listBuildings } = await loadService(env);
      const summary = await getDashboardSummary();
      const all = await listBuildings({ ...defaultQuery, pageSize: 50 });
      const missing = all.items.filter((item) => item.monthlyRentReceived.amountCents === null).length;
      expect(summary.kpis.receivedMissingCount).toBe(missing);
      expect(summary.kpis.rentDueCents).not.toBe(summary.kpis.rentReceivedCents);
    });

    it("returns a detail and maps unknown or malformed ids to not found", async () => {
      const { getBuilding } = await loadService(env);
      expect((await getBuilding("demo-cedre")).building.rentHistory.length).toBe(12);
      await expect(getBuilding("does-not-exist")).rejects.toMatchObject({ code: "resource.not_found" });
      await expect(getBuilding("../etc/passwd")).rejects.toMatchObject({ code: "resource.not_found" });
    });

    it("times out a stuck upstream through the failure scenario", async () => {
      const { listBuildings } = await loadService({ ...env, BFF_UPSTREAM_TIMEOUT_MS: "200" });
      await expect(listBuildings({ ...defaultQuery, scenario: "timeout" })).rejects.toMatchObject({
        code: "upstream.timeout",
      });
    });

    it("surfaces the error scenario as an upstream failure", async () => {
      const { listBuildings } = await loadService(env);
      await expect(listBuildings({ ...defaultQuery, scenario: "error" })).rejects.toMatchObject({
        code: "upstream.unavailable",
      });
    });
  });

  describe("fails closed", () => {
    it("refuses to serve data in production even when DEMO_MODE_ENABLED=true", async () => {
      const { listBuildings, getBuilding, getDashboardSummary } = await loadService({
        NODE_ENV: "production",
        APP_ENV: "production",
        DEMO_MODE_ENABLED: "true",
      });
      await expect(listBuildings(defaultQuery)).rejects.toMatchObject({ code: "upstream.unavailable" });
      await expect(getBuilding("demo-cedre")).rejects.toMatchObject({ code: "upstream.unavailable" });
      await expect(getDashboardSummary()).rejects.toMatchObject({ code: "upstream.unavailable" });
    });

    it("refuses when demo is opted out", async () => {
      const { listBuildings } = await loadService({
        NODE_ENV: "development",
        APP_ENV: "local",
        DEMO_MODE_ENABLED: "false",
      });
      await expect(listBuildings(defaultQuery)).rejects.toMatchObject({ code: "upstream.unavailable" });
    });
  });
});
