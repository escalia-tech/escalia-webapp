import "server-only";

import { fetchBffPage } from "@/server/bff-pages/client";

import { type RulesPage, type RulesQuery, rulesPageSchema } from "../schemas/rules.schema";

/** The rules in force, explained in the page language (FR-JUR-02). The BFF and the core own every rule. */
export function getRules(query: RulesQuery, language: string): Promise<RulesPage> {
  return fetchBffPage("rules.list", "/pages/rules", rulesPageSchema, {
    language,
    query: { q: query.q, jurisdiction: query.jurisdiction, date: query.date },
  });
}
