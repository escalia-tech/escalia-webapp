import { describe, expect, it } from "vitest";

import { dollarsToCents, parseCopyForm, parseUnitForm } from "@/features/portfolio/schemas/unit.schema";

const OK = "0197a000-0000-7000-8000-000000000002";

function parsed(raw: Parameters<typeof parseUnitForm>[0]) {
  const result = parseUnitForm(raw);
  if (!result.ok) throw new Error("expected the form to be valid");
  return result.attributes;
}

describe("dollarsToCents", () => {
  it("reads dollars with a comma or a point, and nothing as no amount", () => {
    expect(dollarsToCents("75")).toBe(7500);
    expect(dollarsToCents("75,5")).toBe(7550);
    expect(dollarsToCents(" 1 250.25 ")).toBe(125025);
    expect(dollarsToCents("")).toBeNull();
  });

  it("refuses anything that is not an amount", () => {
    expect(dollarsToCents("abc")).toBe("invalid");
    expect(dollarsToCents("-5")).toBe("invalid");
    expect(dollarsToCents("1.234")).toBe("invalid");
  });
});

describe("parseUnitForm", () => {
  it("needs only a type; everything else defaults to no, none or unknown (BR-8)", () => {
    expect(parsed({ type: "ROOMS_4_5" })).toEqual({
      typeAndSize: { type: "ROOMS_4_5", area: null },
      included: {
        heatingIncluded: false,
        heatingSource: null,
        hotWaterIncluded: false,
        hotWaterSource: null,
        electricityIncluded: false,
        appliances: [],
        furnished: false,
        snowRemovalIncluded: false,
        lawnIncluded: false,
        otherServices: "",
      },
      parkingAndStorage: {
        parkingKind: "NONE",
        parkingSpaces: 0,
        parkingIncluded: false,
        parkingAmountCents: null,
        storageKind: "NONE",
        storageIncluded: false,
        storageAmountCents: null,
      },
      accessibility: {
        stepFreeEntrance: "UNKNOWN",
        floor: null,
        elevator: "UNKNOWN",
        adaptedBathroom: "UNKNOWN",
        notes: "",
      },
    });
  });

  it("refuses a missing or unknown type", () => {
    expect(parseUnitForm({}).ok).toBe(false);
    expect(parseUnitForm({ type: "CASTLE" }).ok).toBe(false);
    expect(parsed({ type: ["STUDIO", "HOUSE"] }).typeAndSize.type).toBe("STUDIO");
    expect(parseUnitForm({ type: new File([""], "x.txt") }).ok).toBe(false);
  });

  it("reads every group of the form", () => {
    const attributes = parsed({
      type: "ROOMS_3_5",
      areaValue: "850",
      areaUnit: "FT2",
      heatingIncluded: "on",
      heatingSource: "GAS",
      hotWaterIncluded: "on",
      hotWaterSource: "OIL",
      electricityIncluded: "on",
      appliances: ["STOVE", "DRYER", "SPACESHIP"],
      furnished: "on",
      snowRemovalIncluded: "on",
      lawnIncluded: "on",
      otherServices: " Internet ",
      parkingKind: "INDOOR",
      parkingSpaces: "2",
      parkingIncluded: "off",
      parkingAmount: "75,50",
      storageKind: "LOCKER",
      storageIncluded: "on",
      storageAmount: "",
      stepFreeEntrance: "YES",
      floor: "-1",
      elevator: "NO",
      adaptedBathroom: "UNKNOWN",
      notes: "Rampe",
    });

    expect(attributes.typeAndSize.area).toEqual({ value: 850, unit: "FT2" });
    expect(attributes.included).toMatchObject({
      heatingIncluded: true,
      heatingSource: "GAS",
      hotWaterSource: "OIL",
      appliances: ["STOVE", "DRYER"],
      otherServices: "Internet",
    });
    expect(attributes.parkingAndStorage).toMatchObject({
      parkingKind: "INDOOR",
      parkingSpaces: 2,
      parkingIncluded: false,
      parkingAmountCents: 7550,
      storageKind: "LOCKER",
    });
    expect(attributes.accessibility).toMatchObject({
      stepFreeEntrance: "YES",
      floor: -1,
      elevator: "NO",
      notes: "Rampe",
    });
  });

  it("falls back to the first energy source, to feet and to no parking when a select sends nonsense", () => {
    const attributes = parsed({
      type: "STUDIO",
      areaValue: "40",
      areaUnit: "acres",
      heatingIncluded: "on",
      hotWaterIncluded: "on",
      parkingKind: "HELIPAD",
      parkingSpaces: "3",
      storageKind: "VAULT",
      stepFreeEntrance: "MAYBE",
    });

    expect(attributes.typeAndSize.area).toEqual({ value: 40, unit: "FT2" });
    expect(attributes.included.heatingSource).toBe("ELECTRICITY");
    expect(attributes.included.hotWaterSource).toBe("ELECTRICITY");
    expect(attributes.parkingAndStorage).toMatchObject({ parkingKind: "NONE", parkingSpaces: 0, storageKind: "NONE" });
    expect(attributes.accessibility.stepFreeEntrance).toBe("UNKNOWN");
  });

  it("keeps a single appliance sent as one value, and ignores a file upload", () => {
    expect(parsed({ type: "STUDIO", appliances: "STOVE" }).included.appliances).toEqual(["STOVE"]);
    expect(parsed({ type: "STUDIO", appliances: new File([""], "x.txt") }).included.appliances).toEqual([]);
  });

  it("refuses what is not a number, an amount or a short text", () => {
    expect(parseUnitForm({ type: "STUDIO", areaValue: "big" }).ok).toBe(false);
    expect(parseUnitForm({ type: "STUDIO", parkingAmount: "x" }).ok).toBe(false);
    expect(parseUnitForm({ type: "STUDIO", storageAmount: "x" }).ok).toBe(false);
    expect(parseUnitForm({ type: "STUDIO", parkingKind: "INDOOR", parkingSpaces: "1.5" }).ok).toBe(false);
    expect(parseUnitForm({ type: "STUDIO", floor: "2.5" }).ok).toBe(false);
    expect(parseUnitForm({ type: "STUDIO", notes: "x".repeat(501) }).ok).toBe(false);
    expect(parseUnitForm({ type: "STUDIO", otherServices: "x".repeat(501) }).ok).toBe(false);
  });
});

describe("parseCopyForm", () => {
  it("needs a group and a unit, and drops values that are not groups or unit ids", () => {
    expect(parseCopyForm(OK, { groups: "INCLUDED", toUnitIds: [OK, "../x"] })).toEqual({
      ok: true,
      fromUnitId: OK,
      groups: ["INCLUDED"],
      toUnitIds: [OK],
    });
    expect(parseCopyForm(OK, { groups: ["NOPE"], toUnitIds: OK }).ok).toBe(false);
    expect(parseCopyForm(OK, { groups: "INCLUDED" }).ok).toBe(false);
    expect(parseCopyForm(OK, {}).ok).toBe(false);
  });

  it("refuses more than 200 targets", () => {
    const many = Array.from({ length: 201 }, () => OK);
    expect(parseCopyForm(OK, { groups: "INCLUDED", toUnitIds: many }).ok).toBe(false);
  });
});
