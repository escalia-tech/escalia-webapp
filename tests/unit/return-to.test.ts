import { describe, expect, it } from "vitest";

import { safeReturnTo } from "@/lib/return-to";

describe("safeReturnTo", () => {
  it("accepts in-app absolute paths with a query", () => {
    expect(safeReturnTo("/properties?q=lac&page=2", "/properties")).toBe("/properties?q=lac&page=2");
  });

  it.each([
    "https://evil.example/properties",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/a:b",
    "properties",
    "/with\nnewline",
    `/${"a".repeat(600)}`,
    "",
  ])("rejects %j", (value) => {
    expect(safeReturnTo(value, "/properties")).toBe("/properties");
  });

  it("falls back for undefined, null and arrays handled by first element", () => {
    expect(safeReturnTo(undefined, "/properties")).toBe("/properties");
    expect(safeReturnTo(null, "/properties")).toBe("/properties");
    expect(safeReturnTo(["/properties?page=2", "https://evil.example"], "/properties")).toBe("/properties?page=2");
  });
});
