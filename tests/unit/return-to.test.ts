import { describe, expect, it } from "vitest";

import { safeReturnTo } from "@/lib/return-to";

describe("safeReturnTo", () => {
  it("accepts in-app absolute paths with a query", () => {
    expect(safeReturnTo("/buildings?q=lac&page=2", "/buildings")).toBe("/buildings?q=lac&page=2");
  });

  it.each([
    "https://evil.example/buildings",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/a:b",
    "buildings",
    "/with\nnewline",
    `/${"a".repeat(600)}`,
    "",
  ])("rejects %j", (value) => {
    expect(safeReturnTo(value, "/buildings")).toBe("/buildings");
  });

  it("falls back for undefined, null and arrays handled by first element", () => {
    expect(safeReturnTo(undefined, "/buildings")).toBe("/buildings");
    expect(safeReturnTo(null, "/buildings")).toBe("/buildings");
    expect(safeReturnTo(["/buildings?page=2", "https://evil.example"], "/buildings")).toBe("/buildings?page=2");
  });
});
