import { describe, expect, it } from "vitest";

import { parseListQuery, toSearchParams } from "@/features/buildings/lib/list-query";

describe("parseListQuery", () => {
  it("returns defaults for empty input", () => {
    expect(parseListQuery({})).toMatchObject({ page: 1, pageSize: 10, sort: "name", dir: "asc" });
  });

  it("parses valid parameters", () => {
    const query = parseListQuery({
      q: " lac ",
      type: "condominium",
      page: "2",
      pageSize: "20",
      sort: "city",
      dir: "desc",
    });
    expect(query).toMatchObject({ q: "lac", type: "condominium", page: 2, pageSize: 20, sort: "city", dir: "desc" });
  });

  it("salvages valid fields when another is invalid", () => {
    const query = parseListQuery({ q: "lac", page: "-4", type: "spaceship", pageSize: "13" });
    expect(query.q).toBe("lac");
    expect(query.page).toBe(1);
    expect(query.type).toBeUndefined();
    expect(query.pageSize).toBe(10);
  });

  it("uses the first value of repeated parameters and accepts URLSearchParams", () => {
    expect(parseListQuery({ q: ["a", "b"] }).q).toBe("a");
    expect(parseListQuery(new URLSearchParams("type=commercial&page=3")).page).toBe(3);
  });
});

describe("toSearchParams", () => {
  it("omits defaults so equal queries produce one canonical string", () => {
    expect(toSearchParams(parseListQuery({})).toString()).toBe("");
    expect(toSearchParams(parseListQuery({ page: "1", sort: "name", dir: "asc" })).toString()).toBe("");
  });

  it("round-trips a non-default query", () => {
    const original = parseListQuery({
      q: "lac",
      type: "commercial",
      page: "2",
      pageSize: "50",
      sort: "unitCount",
      dir: "desc",
    });
    expect(parseListQuery(toSearchParams(original))).toEqual(original);
  });
});
