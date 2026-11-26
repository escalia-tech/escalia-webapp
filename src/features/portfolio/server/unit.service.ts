import "server-only";

import { ApplicationError } from "@/lib/observability/errors/application-error";
import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  type CopyParse,
  type FormParse,
  parseCopyForm,
  parseUnitForm,
  type UnitPage,
  unitPageSchema,
} from "../schemas/unit.schema";

const UNIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** One unit with its attributes and their history (FR-PORT-02). */
export function fetchUnit(id: string, language: string): Promise<UnitPage> {
  if (!UNIT_ID.test(id)) throw new ApplicationError("resource.not_found", "Unit not found");
  return fetchBffPage("units.get", `/pages/units/${id}`, unitPageSchema, { language });
}

export type SaveOutcome =
  | { status: "saved"; version: number }
  | { status: "invalid" }
  | { status: "refused"; message: string | undefined };

/** Validates what the unit form sent, then asks the core (through the BFF) to store the next version. */
export async function saveUnitAttributes(
  unitId: string,
  raw: Parameters<typeof parseUnitForm>[0],
  language: string,
): Promise<SaveOutcome> {
  if (!UNIT_ID.test(unitId)) return { status: "invalid" };
  const parsed: FormParse = parseUnitForm(raw);
  if (!parsed.ok) return { status: "invalid" };
  const result = await postBffAction(
    "units.update-attributes",
    `/actions/update-unit-attributes/${unitId}`,
    parsed.attributes,
    language,
  );
  if (!result.ok) return { status: "refused", message: result.message };
  const version = (result.body as { version?: unknown }).version;
  return typeof version === "number" ? { status: "saved", version } : { status: "refused", message: undefined };
}

export type CopyOutcome =
  | { status: "copied"; count: number }
  | { status: "invalid" }
  | { status: "refused"; message: string | undefined };

/** BR-7: copies the chosen groups of one unit to others of the same building. */
export async function copyUnitAttributes(
  buildingId: string,
  fromUnitId: string,
  raw: Parameters<typeof parseCopyForm>[1],
  language: string,
): Promise<CopyOutcome> {
  if (!UNIT_ID.test(buildingId) || !UNIT_ID.test(fromUnitId)) return { status: "invalid" };
  const parsed: CopyParse = parseCopyForm(fromUnitId, raw);
  if (!parsed.ok) return { status: "invalid" };
  const result = await postBffAction(
    "units.copy-attributes",
    `/actions/copy-unit-attributes/${buildingId}`,
    { fromUnitId: parsed.fromUnitId, toUnitIds: parsed.toUnitIds, groups: parsed.groups },
    language,
  );
  if (!result.ok) return { status: "refused", message: result.message };
  const items = (result.body as { items?: unknown }).items;
  return { status: "copied", count: Array.isArray(items) ? items.length : 0 };
}
