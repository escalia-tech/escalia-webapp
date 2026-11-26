import { describe, expect, it } from "vitest";

import { parseRulesQuery } from "@/features/rules/schemas/rules.schema";

describe("parseRulesQuery", () => {
  it("defaults to Quebec", () => {
    expect(parseRulesQuery({})).toEqual({ jurisdiction: "CA-QC" });
  });

  it("keeps a valid search, jurisdiction and date, taking the first of repeated values", () => {
    expect(parseRulesQuery({ q: [" depot ", "x"], jurisdiction: "CA-QC/montreal", date: "2027-04-01" })).toEqual({
      q: "depot",
      jurisdiction: "CA-QC/montreal",
      date: "2027-04-01",
    });
  });

  it("falls back to the defaults on anything invalid", () => {
    expect(parseRulesQuery({ jurisdiction: "../etc", date: "tomorrow" })).toEqual({ jurisdiction: "CA-QC" });
  });
});
