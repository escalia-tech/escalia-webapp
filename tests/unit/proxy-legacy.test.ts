import { describe, expect, it } from "vitest";

import { parseLegacyLocalePrefix } from "@/lib/legacy-locale-path";

describe("parseLegacyLocalePrefix", () => {
  it("strips a locale prefix and preserves the path", () => {
    expect(parseLegacyLocalePrefix("/fr-CA/login")).toEqual({ locale: "fr-CA", pathname: "/login" });
    expect(parseLegacyLocalePrefix("/en-CA/properties/demo-cedre")).toEqual({
      locale: "en-CA",
      pathname: "/properties/demo-cedre",
    });
  });

  it("maps a bare locale to the home path", () => {
    expect(parseLegacyLocalePrefix("/fr-CA")).toEqual({ locale: "fr-CA", pathname: "/" });
  });

  it("returns null for clean paths", () => {
    expect(parseLegacyLocalePrefix("/login")).toBeNull();
    expect(parseLegacyLocalePrefix("/api/bff/properties")).toBeNull();
  });
});