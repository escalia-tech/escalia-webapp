import "server-only";

import { postBffAction } from "@/server/bff-pages/client";

import { newBuildingSchema, toCreateBuildingRequest } from "../schemas/portfolio.schema";

export type CreateBuildingOutcome =
  | { status: "created"; id: string }
  | { status: "invalid" }
  | { status: "refused"; message: string | undefined };

/** Validates what the form sent, then asks the core (through the BFF) to create the building. */
export async function createBuilding(raw: Record<string, FormDataEntryValue | undefined>, language: string) {
  const parsed = newBuildingSchema.safeParse({
    civicNumber: raw.civicNumber,
    street: raw.street,
    city: raw.city,
    postalCode: raw.postalCode,
    displayName: raw.displayName || undefined,
    unitCount: raw.unitCount || undefined,
    unitRange: raw.unitRange || undefined,
  });
  if (!parsed.success) return { status: "invalid" } satisfies CreateBuildingOutcome;

  const result = await postBffAction(
    "buildings.create",
    "/actions/create-building",
    toCreateBuildingRequest(parsed.data),
    language,
  );
  if (!result.ok) return { status: "refused", message: result.message } satisfies CreateBuildingOutcome;
  const id = (result.body as { id?: unknown }).id;
  return typeof id === "string"
    ? ({ status: "created", id } satisfies CreateBuildingOutcome)
    : ({ status: "refused", message: undefined } satisfies CreateBuildingOutcome);
}
