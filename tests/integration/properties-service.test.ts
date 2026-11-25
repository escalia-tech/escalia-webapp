import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { propertyListQuerySchema } from "@/features/properties/schemas/property.schema";

async function loadService(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("@/features/properties/server/properties.service");
}

const defaultQuery = propertyListQuerySchema.parse({});

describe("properties service", () => {
  beforeEach(() => vi.stubEnv("LOG_LEVEL", "fatal"));
  afterEach(() => vi.unstubAllEnvs());

  describe("with demo mode enabled (local)", () => {
    const env = { NODE_ENV: "development", APP_ENV: "local", DEMO_MODE_ENABLED: "true" };

    it("paginates and sorts fixtures", async () => {
      const { listProperties } = await loadService(env);
      const first = await listProperties(defaultQuery);
      expect(first.items).toHaveLength(10);
      expect(first.totalCount).toBeGreaterThan(10);
      expect(first.meta.source).toBe("demo-fixtures");
      const names = first.items.map((item) => item.name);
      expect([...names].sort((a, b) => a.localeCompare(b, "fr"))).toEqual(names);
    });

    it("filters by text without diacritic sensitivity and by type", async () => {
      const { listProperties } = await loadService(env);
      const byText = await listProperties({ ...defaultQuery, q: "cedre" });
      expect(byText.items.some((item) => item.id === "demo-cedre")).toBe(true);
      const byType = await listProperties({ ...defaultQuery, type: "commercial", pageSize: 50 });
      expect(byType.items.every((item) => item.propertyType === "commercial")).toBe(true);
    });

    it("keeps rent due and rent received distinct and never turns missing data into zero", async () => {
      const { getDashboardSummary, listProperties } = await loadService(env);
      const summary = await getDashboardSummary();
      const all = await listProperties({ ...defaultQuery, pageSize: 50 });
      const missing = all.items.filter((item) => item.monthlyRentReceived.amountCents === null).length;
      expect(summary.kpis.receivedMissingCount).toBe(missing);
      expect(summary.kpis.rentDueCents).not.toBe(summary.kpis.rentReceivedCents);
    });

    it("returns a detail and maps unknown or malformed ids to not found", async () => {
      const { getProperty } = await loadService(env);
      expect((await getProperty("demo-cedre")).property.rentHistory.length).toBe(12);
      await expect(getProperty("does-not-exist")).rejects.toMatchObject({ code: "resource.not_found" });
      await expect(getProperty("../etc/passwd")).rejects.toMatchObject({ code: "resource.not_found" });
    });

    it("times out a stuck upstream through the failure scenario", async () => {
      const { listProperties } = await loadService({ ...env, BFF_UPSTREAM_TIMEOUT_MS: "200" });
      await expect(listProperties({ ...defaultQuery, scenario: "timeout" })).rejects.toMatchObject({
        code: "upstream.timeout",
      });
    });

    it("surfaces the error scenario as an upstream failure", async () => {
      const { listProperties } = await loadService(env);
      await expect(listProperties({ ...defaultQuery, scenario: "error" })).rejects.toMatchObject({
        code: "upstream.unavailable",
      });
    });
  });

  describe("fails closed", () => {
    it("refuses to serve data in production even when DEMO_MODE_ENABLED=true", async () => {
      const { listProperties, getProperty, getDashboardSummary } = await loadService({
        NODE_ENV: "production",
        APP_ENV: "production",
        DEMO_MODE_ENABLED: "true",
      });
      await expect(listProperties(defaultQuery)).rejects.toMatchObject({ code: "upstream.unavailable" });
      await expect(getProperty("demo-cedre")).rejects.toMatchObject({ code: "upstream.unavailable" });
      await expect(getDashboardSummary()).rejects.toMatchObject({ code: "upstream.unavailable" });
    });

    it("refuses without the demo flag", async () => {
      const { listProperties } = await loadService({ NODE_ENV: "development", APP_ENV: "local" });
      await expect(listProperties(defaultQuery)).rejects.toMatchObject({ code: "upstream.unavailable" });
    });
  });
});
