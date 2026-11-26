import { describe, expect, it } from "vitest";

import {
  newBuildingSchema,
  parseBuildingsQuery,
  toCreateBuildingRequest,
} from "@/features/portfolio/schemas/portfolio.schema";

describe("parseBuildingsQuery", () => {
  it("defaults to the first page without search", () => {
    expect(parseBuildingsQuery({})).toEqual({ q: undefined, page: 1, includeArchived: false });
  });

  it("keeps a trimmed search, a valid page and the archived switch", () => {
    expect(parseBuildingsQuery({ q: [" vil ", "x"], page: "3", archived: "1" })).toEqual({
      q: "vil",
      page: 3,
      includeArchived: true,
    });
  });

  it.each(["0", "-2", "abc", "10001", "1.5"])("falls back to page 1 for %s", (page) => {
    expect(parseBuildingsQuery({ page }).page).toBe(1);
  });

  it("treats a blank search as none", () => {
    expect(parseBuildingsQuery({ q: "   " }).q).toBeUndefined();
  });
});

const address = { civicNumber: "1234A", street: "rue de Villeray", city: "Montréal", postalCode: "H2R 2B4" };

describe("newBuildingSchema and toCreateBuildingRequest", () => {
  it("builds the request with Quebec as the province and a unit count", () => {
    const parsed = newBuildingSchema.parse({ ...address, unitCount: "6", displayName: " 6-plex " });

    expect(toCreateBuildingRequest(parsed)).toEqual({
      address: { ...address, province: "CA-QC", country: "CA" },
      displayName: "6-plex",
      units: { count: 6 },
    });
  });

  it("builds the request with a range of units, and with no units at all", () => {
    expect(toCreateBuildingRequest(newBuildingSchema.parse({ ...address, unitRange: "101-106" })).units).toEqual({
      range: "101-106",
    });
    expect(toCreateBuildingRequest(newBuildingSchema.parse(address))).not.toHaveProperty("units");
  });

  it("refuses a count together with a range, and a missing address part", () => {
    expect(newBuildingSchema.safeParse({ ...address, unitCount: "6", unitRange: "1-6" }).success).toBe(false);
    expect(newBuildingSchema.safeParse({ ...address, street: " " }).success).toBe(false);
  });
});
