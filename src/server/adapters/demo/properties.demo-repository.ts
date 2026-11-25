import "server-only";

import type {
  DashboardSummary,
  PropertyListQuery,
  PropertySummary,
  PropertyType,
} from "@/features/properties/schemas/property.schema";
import type {
  PropertiesPage,
  PropertiesRepository,
  RepositoryContext,
} from "@/features/properties/server/properties.repository";
import { ApplicationError } from "@/lib/observability/errors/application-error";

import { FIXTURE_PERIOD, PROPERTY_FIXTURES } from "./properties.fixtures";

const BASE_LATENCY_MS = 120;
const SLOW_LATENCY_MS = 1500;
/** Longest delay accepted by setTimeout (2^31 - 1 ms). */
const MAX_TIMER_MS = 2_147_483_647;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toSummary(detail: (typeof PROPERTY_FIXTURES)[number]): PropertySummary {
  const { rentHistory: _rentHistory, ...summary } = detail;
  return summary;
}

async function simulate(scenario: PropertyListQuery["scenario"], context: RepositoryContext): Promise<void> {
  if (scenario === "error") {
    throw new ApplicationError("upstream.unavailable", "Demo scenario: upstream failure");
  }
  if (scenario === "timeout") {
    // Never resolves on its own: the service timeout aborts it.
    await sleep(MAX_TIMER_MS, context.signal);
  }
  await sleep(scenario === "slow" ? SLOW_LATENCY_MS : BASE_LATENCY_MS, context.signal);
}

/** Demo adapter: filters, sorts and paginates the fictional fixtures in memory. */
export const demoPropertiesRepository: PropertiesRepository = {
  source: "demo-fixtures",
  period: FIXTURE_PERIOD,

  async list(query, context): Promise<PropertiesPage> {
    await simulate(query.scenario, context);

    const needle = query.q ? stripDiacritics(query.q) : undefined;
    const filtered = PROPERTY_FIXTURES.filter((property) => {
      if (query.type && property.propertyType !== query.type) return false;
      if (!needle) return true;
      return [property.name, property.address.city, property.address.line1].some((field) =>
        stripDiacritics(field).includes(needle),
      );
    });

    const direction = query.dir === "desc" ? -1 : 1;
    const sorted = [...filtered].sort((left, right) => {
      const compare =
        query.sort === "unitCount"
          ? left.unitCount - right.unitCount
          : query.sort === "city"
            ? left.address.city.localeCompare(right.address.city, "fr-CA")
            : left.name.localeCompare(right.name, "fr-CA");
      return (compare || left.id.localeCompare(right.id)) * direction;
    });

    const start = (query.page - 1) * query.pageSize;
    return { items: sorted.slice(start, start + query.pageSize).map(toSummary), totalCount: sorted.length };
  },

  async get(id, context) {
    await sleep(BASE_LATENCY_MS, context.signal);
    return PROPERTY_FIXTURES.find((property) => property.id === id) ?? null;
  },

  async dashboard(context): Promise<Omit<DashboardSummary, "meta">> {
    await sleep(BASE_LATENCY_MS, context.signal);

    const latest = PROPERTY_FIXTURES.map((property) => property.rentHistory.at(-1));
    const monthly = (PROPERTY_FIXTURES[0]?.rentHistory ?? []).map((entry, index) => {
      const entries = PROPERTY_FIXTURES.map((property) => property.rentHistory[index]);
      const due = entries.reduce((sum, item) => sum + (item?.dueCents ?? 0), 0);
      const available = entries.filter((item) => item?.receivedCents !== null && item?.receivedCents !== undefined);
      return {
        month: entry.month,
        dueCents: due,
        // Missing figures stay missing: a month with no received data at all is `null`, never zero.
        receivedCents:
          available.length === 0 ? null : available.reduce((sum, item) => sum + (item?.receivedCents ?? 0), 0),
      };
    });

    const byType = new Map<PropertyType, number>();
    for (const property of PROPERTY_FIXTURES) {
      byType.set(property.propertyType, (byType.get(property.propertyType) ?? 0) + 1);
    }

    return {
      kpis: {
        propertyCount: PROPERTY_FIXTURES.length,
        unitCount: PROPERTY_FIXTURES.reduce((sum, property) => sum + property.unitCount, 0),
        rentDueCents: latest.reduce((sum, item) => sum + (item?.dueCents ?? 0), 0),
        rentReceivedCents: latest.reduce((sum, item) => sum + (item?.receivedCents ?? 0), 0),
        receivedMissingCount: latest.filter((item) => item?.receivedCents === null).length,
      },
      monthly,
      unitsByProperty: [...PROPERTY_FIXTURES]
        .sort((left, right) => right.unitCount - left.unitCount)
        .slice(0, 8)
        .map((property) => ({ id: property.id, name: property.name, unitCount: property.unitCount })),
      propertiesByType: [...byType.entries()].map(([propertyType, count]) => ({ propertyType, count })),
    };
  },
};
