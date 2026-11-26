import { z } from "zod";

/** The unit page of escalia-bff (`UnitPage` in `pages.yaml`); the attributes are the core's own shape. */
export const UNIT_TYPES = [
  "ROOMS_1_5",
  "ROOMS_2_5",
  "ROOMS_3_5",
  "ROOMS_4_5",
  "ROOMS_5_5",
  "ROOMS_6_5",
  "ROOMS_7_5",
  "ROOMS_8_5",
  "STUDIO",
  "HOUSE",
  "OTHER",
] as const;
export const ENERGY_SOURCES = ["ELECTRICITY", "GAS", "OIL", "OTHER"] as const;
export const APPLIANCES = ["STOVE", "REFRIGERATOR", "DISHWASHER", "WASHER", "DRYER"] as const;
export const PARKING_KINDS = ["NONE", "OUTDOOR", "INDOOR"] as const;
export const STORAGE_KINDS = ["NONE", "LOCKER", "SHED"] as const;
export const TRI = ["YES", "NO", "UNKNOWN"] as const;
export const GROUPS = ["TYPE_AND_SIZE", "INCLUDED", "PARKING_STORAGE", "ACCESSIBILITY"] as const;
export type Group = (typeof GROUPS)[number];

export const unitAttributesSchema = z.object({
  typeAndSize: z.object({
    type: z.enum(UNIT_TYPES),
    area: z.object({ value: z.number(), unit: z.enum(["FT2", "M2"]), squareMetres: z.number().optional() }).nullish(),
  }),
  included: z.object({
    heatingIncluded: z.boolean(),
    heatingSource: z.enum(ENERGY_SOURCES).nullish(),
    hotWaterIncluded: z.boolean(),
    hotWaterSource: z.enum(ENERGY_SOURCES).nullish(),
    electricityIncluded: z.boolean(),
    appliances: z.array(z.enum(APPLIANCES)),
    furnished: z.boolean(),
    snowRemovalIncluded: z.boolean(),
    lawnIncluded: z.boolean(),
    otherServices: z.string(),
  }),
  parkingAndStorage: z.object({
    parkingKind: z.enum(PARKING_KINDS),
    parkingSpaces: z.number().int(),
    parkingIncluded: z.boolean(),
    parkingAmountCents: z.number().int().nullish(),
    storageKind: z.enum(STORAGE_KINDS),
    storageIncluded: z.boolean(),
    storageAmountCents: z.number().int().nullish(),
  }),
  accessibility: z.object({
    stepFreeEntrance: z.enum(TRI),
    floor: z.number().int().nullish(),
    elevator: z.enum(TRI),
    adaptedBathroom: z.enum(TRI),
    notes: z.string(),
  }),
});
export type UnitAttributes = z.infer<typeof unitAttributesSchema>;

const versionSchema = z.object({
  version: z.number().int(),
  changedBy: z.string(),
  changedAt: z.string(),
  attributes: unitAttributesSchema,
});
export type UnitAttributesVersion = z.infer<typeof versionSchema>;

export const unitPageSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  buildingCode: z.string(),
  buildingName: z.string(),
  label: z.string(),
  archived: z.boolean(),
  siblings: z.array(z.object({ id: z.string(), label: z.string(), archived: z.boolean() })),
  current: versionSchema.nullish(),
  history: z.array(versionSchema),
});
export type UnitPage = z.infer<typeof unitPageSchema>;

type Raw = Record<string, FormDataEntryValue | FormDataEntryValue[] | undefined>;

const one = (value: Raw[string]): string => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
};
const many = (value: Raw[string]): string[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value]).filter((v): v is string => typeof v === "string");
const checked = (value: Raw[string]) => one(value) === "on";

/** "75", "75,50" and "75.5" are dollars; anything else is not an amount. Returns cents. */
export function dollarsToCents(text: string): number | null | "invalid" {
  const clean = text.replace(/\s/g, "").replace(",", ".");
  if (clean === "") return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(clean)) return "invalid";
  return Math.round(Number.parseFloat(clean) * 100);
}

const decimal = (text: string): number | null | "invalid" => {
  const clean = text.replace(/\s/g, "").replace(",", ".");
  if (clean === "") return null;
  return /^\d{1,6}(\.\d{1,2})?$/.test(clean) ? Number.parseFloat(clean) : "invalid";
};

const enumOr = <T extends readonly string[]>(list: T, value: string, fallback: T[number]): T[number] =>
  (list as readonly string[]).includes(value) ? value : fallback;

export type FormParse = { ok: true; attributes: UnitAttributes } | { ok: false };

/** Turns what the unit form posted into the core's `UnitAttributes`; the core remains the judge of every rule. */
export function parseUnitForm(raw: Raw): FormParse {
  const type = one(raw.type);
  if (!(UNIT_TYPES as readonly string[]).includes(type)) return { ok: false };
  const area = decimal(one(raw.areaValue));
  const parking = dollarsToCents(one(raw.parkingAmount));
  const storage = dollarsToCents(one(raw.storageAmount));
  if (area === "invalid" || parking === "invalid" || storage === "invalid") return { ok: false };
  const spaces = one(raw.parkingSpaces) === "" ? 0 : Number(one(raw.parkingSpaces));
  const floorText = one(raw.floor);
  const floor = floorText === "" ? null : Number(floorText);
  if (!Number.isInteger(spaces) || (floor !== null && !Number.isInteger(floor))) return { ok: false };
  const notes = one(raw.notes);
  const other = one(raw.otherServices);
  if (notes.length > 500 || other.length > 500) return { ok: false };
  const parkingKind = enumOr(PARKING_KINDS, one(raw.parkingKind), "NONE");
  const storageKind = enumOr(STORAGE_KINDS, one(raw.storageKind), "NONE");
  const candidate: UnitAttributes = {
    typeAndSize: {
      type: type as UnitAttributes["typeAndSize"]["type"],
      area: area === null ? null : { value: area, unit: enumOr(["FT2", "M2"] as const, one(raw.areaUnit), "FT2") },
    },
    included: {
      heatingIncluded: checked(raw.heatingIncluded),
      heatingSource: checked(raw.heatingIncluded)
        ? enumOr(ENERGY_SOURCES, one(raw.heatingSource), "ELECTRICITY")
        : null,
      hotWaterIncluded: checked(raw.hotWaterIncluded),
      hotWaterSource: checked(raw.hotWaterIncluded)
        ? enumOr(ENERGY_SOURCES, one(raw.hotWaterSource), "ELECTRICITY")
        : null,
      electricityIncluded: checked(raw.electricityIncluded),
      appliances: many(raw.appliances).filter((a): a is (typeof APPLIANCES)[number] =>
        (APPLIANCES as readonly string[]).includes(a),
      ),
      furnished: checked(raw.furnished),
      snowRemovalIncluded: checked(raw.snowRemovalIncluded),
      lawnIncluded: checked(raw.lawnIncluded),
      otherServices: other,
    },
    parkingAndStorage: {
      parkingKind,
      parkingSpaces: parkingKind === "NONE" ? 0 : spaces,
      parkingIncluded: checked(raw.parkingIncluded),
      parkingAmountCents: parking,
      storageKind,
      storageIncluded: checked(raw.storageIncluded),
      storageAmountCents: storage,
    },
    accessibility: {
      stepFreeEntrance: enumOr(TRI, one(raw.stepFreeEntrance), "UNKNOWN"),
      floor,
      elevator: enumOr(TRI, one(raw.elevator), "UNKNOWN"),
      adaptedBathroom: enumOr(TRI, one(raw.adaptedBathroom), "UNKNOWN"),
      notes,
    },
  };
  return { ok: true, attributes: candidate };
}

export type CopyParse = { ok: true; fromUnitId: string; toUnitIds: string[]; groups: Group[] } | { ok: false };

/** The copy form: the groups and the units to copy to. */
export function parseCopyForm(fromUnitId: string, raw: Raw): CopyParse {
  const groups = many(raw.groups).filter((g): g is Group => (GROUPS as readonly string[]).includes(g));
  const toUnitIds = many(raw.toUnitIds).filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (groups.length === 0 || toUnitIds.length === 0 || toUnitIds.length > 200) return { ok: false };
  return { ok: true, fromUnitId, toUnitIds, groups };
}
