import { z } from "zod";

import { dollarsToCentsOrZero } from "./leases.schema";

export const COST_KEYS = [
  "HEATING",
  "HOT_WATER",
  "GAS",
  "ELECTRICITY",
  "WATER_HEATER_RENTAL",
  "WATER_TAX",
  "SNOW_PARKING",
  "SNOW_BALCONY",
  "SNOW_ENTRANCE",
  "SNOW_STAIRS",
] as const;
export const FURNITURE_KEYS = ["TABLE", "CHAIR", "DRESSER", "SOFA", "ARMCHAIR", "BED"] as const;
export const APPLIANCE_KEYS = ["STOVE", "MICROWAVE", "DISHWASHER", "REFRIGERATOR", "WASHER", "DRYER"] as const;
export const HEATING_SOURCES = ["ELECTRICITY", "GAS", "OIL"] as const;
export const EXTRA_ROWS = 3;

const text = z.string().nullish();
const toggle = z.object({ enabled: z.boolean(), note: text });
const place = z.object({ count: z.number().int(), where: text });

/** The details the official TAL form asks beyond the terms (`LeaseForm` of the core). */
export const leaseFormSchema = z.object({
  landlord: z
    .object({
      name: text,
      address: z.object({ street: z.string(), unit: text, city: z.string(), postalCode: z.string() }).nullish(),
      phone: text,
      otherPhone: text,
      email: text,
      representedBy: text,
    })
    .nullish(),
  dwelling: z
    .object({
      rooms: z.number().int().nullish(),
      habitationOnly: z.boolean().nullish(),
      mixedUse: text,
      condo: z.boolean().nullish(),
      parkingOutdoor: place.nullish(),
      parkingIndoor: place.nullish(),
      storage: place.nullish(),
      otherAccessories: text,
      furnished: z.boolean().nullish(),
      appliances: z.array(z.string()).nullish(),
      furniture: z.record(z.string(), z.number()).nullish(),
      smokeAlarmUndertaking: z.boolean().nullish(),
    })
    .nullish(),
  rent: z
    .object({
      period: text,
      servicesCents: z.number().int().nullish(),
      subsidy: z.boolean().nullish(),
      subsidyNote: text,
      paymentPlace: text,
    })
    .nullish(),
  services: z
    .object({
      costs: z.record(z.string(), z.string()).nullish(),
      heatingSource: text,
      smokeFree: toggle.nullish(),
      landAccess: toggle.nullish(),
      pets: toggle.nullish(),
      caretaker: z.object({ name: text, phone: text, otherPhone: text, email: text }).nullish(),
      worksBefore: text,
      worksDuring: text,
    })
    .nullish(),
  clauseF: z.object({ kind: text, readyOn: text }).nullish(),
  clauseG: z
    .object({
      period: text,
      lastRentOn: text,
      lastRentCents: z.number().int().nullish(),
      formerSeniorResidence: z.boolean().nullish(),
      previousRentCents: z.number().int().nullish(),
      unchanged: z.boolean().nullish(),
      changes: text,
    })
    .nullish(),
  family: z.object({ spouseName: text }).nullish(),
  extraServices: z.array(z.object({ label: z.string(), costCents: z.number().int() })).nullish(),
});
export type LeaseForm = z.infer<typeof leaseFormSchema>;

export const leaseFormViewSchema = z.object({ form: leaseFormSchema, missing: z.array(z.string()) });
export type LeaseFormView = z.infer<typeof leaseFormViewSchema>;

export type TalFormReason = "money" | "number" | "date";
export type ParsedTalForm = { ok: true; body: Record<string, unknown> } | { ok: false; reason: TalFormReason };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const COUNT = /^\d{1,3}$/;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function given<K extends string>(key: K, value: string): Partial<Record<K, string>> {
  return value === "" ? {} : ({ [key]: value } as Record<K, string>);
}

function tri(form: FormData, name: string): boolean | undefined {
  const value = field(form, name);
  if (value === "yes") return true;
  return value === "no" ? false : undefined;
}

function answer(form: FormData, name: string): Partial<Record<string, boolean>> {
  const value = tri(form, name);
  return value === undefined ? {} : { [name]: value };
}

/** Whole number from a text input; undefined when empty, null when it is not a number. */
function count(form: FormData, name: string): number | undefined | null {
  const value = field(form, name);
  if (value === "") return undefined;
  return COUNT.test(value) ? Number(value) : null;
}

function money(form: FormData, name: string): number | undefined | null {
  const value = field(form, name);
  if (value === "") return undefined;
  return dollarsToCentsOrZero(value) ?? null;
}

function contact(form: FormData) {
  const street = field(form, "lStreet");
  const address =
    street === ""
      ? {}
      : {
          address: {
            street,
            city: field(form, "lCity"),
            postalCode: field(form, "lPostal"),
            ...given("unit", field(form, "lUnit")),
          },
        };
  return {
    ...given("name", field(form, "lName")),
    ...address,
    ...given("phone", field(form, "lPhone")),
    ...given("otherPhone", field(form, "lOtherPhone")),
    ...given("email", field(form, "lEmail")),
    ...given("representedBy", field(form, "lRep")),
  };
}

function placeOf(form: FormData, prefix: string): { value?: { count: number; where?: string }; bad: boolean } {
  const places = count(form, `${prefix}Count`);
  if (places === null) return { bad: true };
  if (places === undefined) return { bad: false };
  return { value: { count: places, ...given("where", field(form, `${prefix}Where`)) }, bad: false };
}

function furniture(form: FormData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of FURNITURE_KEYS) {
    const pieces = count(form, `furniture_${key}`);
    if (typeof pieces === "number" && pieces > 0) out[key] = pieces;
  }
  return out;
}

function dwelling(form: FormData): { body: Record<string, unknown>; bad: boolean } {
  const rooms = count(form, "rooms");
  const places = (["outdoor", "indoor", "storage"] as const).map((prefix) => placeOf(form, prefix));
  const [outdoor, indoor, storage] = places;
  const body: Record<string, unknown> = {
    ...answer(form, "habitationOnly"),
    ...answer(form, "condo"),
    ...answer(form, "furnished"),
    ...given("mixedUse", field(form, "mixedUse")),
    ...given("otherAccessories", field(form, "otherAccessories")),
    appliances: APPLIANCE_KEYS.filter((key) => form.getAll("appliances").includes(key)),
    furniture: furniture(form),
    smokeAlarmUndertaking: form.get("smokeAlarm") === "on",
  };
  if (typeof rooms === "number") body.rooms = rooms;
  if (outdoor?.value) body.parkingOutdoor = outdoor.value;
  if (indoor?.value) body.parkingIndoor = indoor.value;
  if (storage?.value) body.storage = storage.value;
  return { body, bad: rooms === null || places.some((one) => one.bad) };
}

function toggleOf(form: FormData, name: string) {
  const enabled = tri(form, name);
  return enabled === undefined ? {} : { [name]: { enabled, ...given("note", field(form, `${name}Note`)) } };
}

function services(form: FormData): Record<string, unknown> {
  const costs: Record<string, string> = {};
  for (const key of COST_KEYS) {
    const who = field(form, `cost_${key}`);
    if (who === "LANDLORD" || who === "TENANT") costs[key] = who;
  }
  const name = field(form, "careName");
  const caretaker = {
    ...given("name", name),
    ...given("phone", field(form, "carePhone")),
    ...given("otherPhone", field(form, "careOtherPhone")),
    ...given("email", field(form, "careEmail")),
  };
  const source = field(form, "heatingSource");
  return {
    costs,
    ...(HEATING_SOURCES.some((one) => one === source) ? { heatingSource: source } : {}),
    ...toggleOf(form, "smokeFree"),
    ...toggleOf(form, "landAccess"),
    ...toggleOf(form, "pets"),
    ...(Object.keys(caretaker).length > 0 ? { caretaker } : {}),
    ...given("worksBefore", field(form, "worksBefore")),
    ...given("worksDuring", field(form, "worksDuring")),
  };
}

function clauseG(form: FormData): { body: Record<string, unknown>; bad: boolean } {
  const last = money(form, "gLast");
  const previous = money(form, "gPrevious");
  const body: Record<string, unknown> = {
    ...answer(form, "unchanged"),
    ...given("lastRentOn", field(form, "gLastOn")),
    ...given("changes", field(form, "gChanges")),
    formerSeniorResidence: form.get("gSenior") === "on",
  };
  const period = field(form, "gPeriod");
  if (period === "MONTH" || period === "WEEK" || period === "OTHER") body.period = period;
  if (typeof last === "number") body.lastRentCents = last;
  if (typeof previous === "number") body.previousRentCents = previous;
  return { body, bad: last === null || previous === null };
}

function extras(form: FormData): { rows: { label: string; costCents: number }[]; bad: boolean } {
  const rows: { label: string; costCents: number }[] = [];
  let bad = false;
  for (let row = 1; row <= EXTRA_ROWS; row++) {
    const label = field(form, `extraLabel_${row}`);
    const cost = money(form, `extraCost_${row}`);
    if (cost === null) bad = true;
    if (label !== "") rows.push({ label, costCents: typeof cost === "number" ? cost : 0 });
  }
  return { rows, bad };
}

/** Reads the TAL form fields; the core checks what is missing, this only types the text. */
export function parseTalForm(form: FormData): ParsedTalForm {
  const home = dwelling(form);
  const g = clauseG(form);
  const more = extras(form);
  const services$ = money(form, "servicesCost");
  const readyOn = field(form, "fReady");
  if (readyOn !== "" && !DAY.test(readyOn)) return { ok: false, reason: "date" };
  const lastOn = field(form, "gLastOn");
  if (lastOn !== "" && !DAY.test(lastOn)) return { ok: false, reason: "date" };
  if (home.bad) return { ok: false, reason: "number" };
  if (g.bad || more.bad || services$ === null) return { ok: false, reason: "money" };
  const period = field(form, "period") === "WEEK" ? "WEEK" : "MONTH";
  const kind = field(form, "fKind");
  const spouse = field(form, "spouse");
  const body: Record<string, unknown> = {
    landlord: contact(form),
    dwelling: home.body,
    rent: {
      period,
      ...(typeof services$ === "number" ? { servicesCents: services$ } : {}),
      ...answer(form, "subsidy"),
      ...given("subsidyNote", field(form, "subsidyNote")),
      ...given("paymentPlace", field(form, "paymentPlace")),
    },
    services: services(form),
    clauseG: g.body,
    family: given("spouseName", spouse),
    extraServices: more.rows,
  };
  if (kind === "NEW_BUILDING" || kind === "CHANGE_OF_USE") {
    body.clauseF = { kind, ...given("readyOn", readyOn) };
  }
  return { ok: true, body };
}
