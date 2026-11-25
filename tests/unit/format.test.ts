import { describe, expect, it } from "vitest";

import { formatMoney, formatMonth, formatNumber, formatPercent } from "@/lib/format";

const normalize = (value: string | null) => value?.replace(/\u00a0|\u202f/g, " ");

describe("format helpers", () => {
  it("formats cents as CAD in both locales", () => {
    expect(normalize(formatMoney(123456, "fr-CA"))).toBe("1 234,56 $");
    expect(normalize(formatMoney(123456, "en-CA"))).toBe("$1,234.56");
  });

  it("never turns an unavailable amount into zero", () => {
    expect(formatMoney(null, "fr-CA")).toBeNull();
    expect(formatPercent(null, "fr-CA")).toBeNull();
    expect(normalize(formatMoney(0, "en-CA"))).toBe("$0.00");
  });

  it("formats numbers, percentages and months without day drift", () => {
    expect(normalize(formatNumber(12345, "fr-CA"))).toBe("12 345");
    expect(normalize(formatPercent(0.965, "en-CA"))).toBe("96.5%");
    expect(formatMonth("2026-01", "en-CA", "long")).toBe("January 2026");
    expect(formatMonth("2026-12", "fr-CA", "long")).toMatch(/décembre 2026/);
  });
});
