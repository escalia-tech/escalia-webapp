import "server-only";

import type {
  MonthlyAmount,
  PropertyDetail,
  PropertySummary,
  PropertyType,
} from "@/features/properties/schemas/property.schema";

/**
 * FICTIONAL demonstration fixtures. Names, addresses and amounts are invented, deterministic and
 * clearly fake (addresses use "rue Exemple", postal codes start with X0X). This module is only
 * reachable through the demo adapter, which refuses to run in production.
 */

/** Reference month of the figures (last complete month of the fixture series). */
export const FIXTURE_PERIOD = "2026-10";
const FIXTURE_MONTHS = [
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
] as const;

type Row = [
  id: string,
  name: string,
  type: PropertyType,
  city: string,
  province: PropertySummary["address"]["province"],
  units: number,
  occupancy: number | null,
  rentPerUnitCents: number,
];

const ROWS: Row[] = [
  ["demo-cedre", "Résidence Démo Cèdre", "multi-residential", "Montréal", "QC", 24, 0.96, 128000],
  ["demo-erables", "Les Érables (fictif)", "multi-residential", "Québec", "QC", 18, 0.89, 119500],
  ["demo-boreal", "Complexe Démo Boréal", "mixed-use", "Laval", "QC", 12, 0.92, 142000],
  ["demo-lac", "Condos du Lac (fictif)", "condominium", "Gatineau", "QC", 30, 0.97, 151000],
  ["demo-horizon", "Tour Démo Horizon", "multi-residential", "Ottawa", "ON", 42, 0.94, 189000],
  ["demo-rivage", "Place du Rivage (fictif)", "commercial", "Trois-Rivières", "QC", 8, 0.75, 310000],
  ["demo-saule", "Maison Démo Saule", "single-family", "Sherbrooke", "QC", 1, 1, 185000],
  ["demo-bouleau", "Le Bouleau (fictif)", "multi-residential", "Longueuil", "QC", 16, 0.88, 122500],
  ["demo-pin", "Quartier Démo Pin", "mixed-use", "Montréal", "QC", 20, 0.9, 139000],
  ["demo-sapin", "Résidence du Sapin (fictif)", "multi-residential", "Saguenay", "QC", 14, 0.93, 104500],
  ["demo-orme", "Condos Démo Orme", "condominium", "Québec", "QC", 26, 0.96, 147500],
  ["demo-merisier", "Les Merisiers (fictif)", "multi-residential", "Moncton", "NB", 22, 0.86, 111000],
  ["demo-frene", "Centre Démo Frêne", "commercial", "Ottawa", "ON", 10, 0.8, 280000],
  ["demo-tilleul", "Le Tilleul (fictif)", "multi-residential", "Gatineau", "QC", 15, 0.91, 115500],
  ["demo-chene", "Manoir Démo Chêne", "multi-residential", "Halifax", "NS", 28, 0.9, 164000],
  ["demo-peuplier", "Les Peupliers (fictif)", "mixed-use", "Montréal", "QC", 18, 0.95, 133500],
  ["demo-meleze", "Résidence Démo Mélèze", "multi-residential", "Lévis", "QC", 12, 0.92, 108000],
  ["demo-hetre", "Condos du Hêtre (fictif)", "condominium", "Laval", "QC", 34, 0.98, 156500],
  ["demo-noyer", "Maison Démo Noyer", "single-family", "Québec", "QC", 1, 1, 210000],
  ["demo-aulne", "L’Aulne (fictif)", "multi-residential", "Sherbrooke", "QC", 9, 0.78, 98000],
  ["demo-charme", "Place Démo Charme", "commercial", "Montréal", "QC", 6, 0.83, 350000],
  ["demo-cerisier", "Les Cerisiers (fictif)", "multi-residential", "Ottawa", "ON", 20, 0.93, 176000],
  ["demo-epinette", "Domaine Démo Épinette", "multi-residential", "Trois-Rivières", "QC", 16, 0.87, 106500],
  ["demo-sorbier", "Le Sorbier (fictif)", "mixed-use", "Fredericton", "NB", 11, null, 127000],
];

/** Small deterministic generator so the fixture data never changes between runs. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  }
  return value >>> 0;
}

function buildHistory(id: string, dueCents: number, isNoData: boolean): MonthlyAmount[] {
  const random = seededRandom(hash(id));
  return FIXTURE_MONTHS.map((month, index) => {
    const seasonal = 1 + (index % 6) * 0.004;
    const due = Math.round((dueCents * seasonal) / 100) * 100;
    // Received amounts are an independent figure (never derived from "due"); some months are missing.
    const missing = isNoData && index >= 9;
    const received = missing ? null : Math.round((due * (0.9 + random() * 0.1)) / 100) * 100;
    return { month, dueCents: due, receivedCents: received };
  });
}

function toDetail(row: Row, index: number): PropertyDetail {
  const [id, name, propertyType, city, province, unitCount, occupancyRate, rentPerUnit] = row;
  const dueCents = Math.round(unitCount * rentPerUnit * (occupancyRate ?? 0.9));
  const noReceivedData = id === "demo-sorbier";
  const history = buildHistory(id, dueCents, noReceivedData);
  const latest = history.at(-1);
  return {
    id,
    name,
    propertyType,
    address: {
      line1: `${100 + index * 10}, rue Exemple`,
      city,
      province,
      postalCode: `X0X ${String(index).padStart(2, "0")}${String.fromCharCode(65 + (index % 26))}`,
    },
    unitCount,
    occupancyRate,
    monthlyRentDue: { amountCents: latest?.dueCents ?? null, currency: "CAD" },
    monthlyRentReceived: { amountCents: latest?.receivedCents ?? null, currency: "CAD" },
    rentHistory: history,
  };
}

export const PROPERTY_FIXTURES: readonly PropertyDetail[] = ROWS.map(toDetail);
