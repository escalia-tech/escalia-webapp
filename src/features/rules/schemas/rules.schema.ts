import { z } from "zod";

/** The rules page of escalia-bff (`RulesPage` in `pages.yaml`). The BFF owns this shape; the webapp only reads it. */
export const ruleSchema = z.object({
  key: z.string(),
  title: z.string(),
  sentence: z.string(),
  alternative: z.string().nullish(),
  type: z.string(),
  value: z.unknown(),
  severity: z.enum(["WARN", "BLOCK"]).nullish(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullish(),
  citation: z.string(),
  sourceUrl: z.url(),
  verifiedOn: z.string(),
  packVersion: z.string(),
});
export type Rule = z.infer<typeof ruleSchema>;

export const rulesPageSchema = z.object({
  jurisdiction: z.string(),
  date: z.string(),
  rules: z.array(ruleSchema),
});
export type RulesPage = z.infer<typeof rulesPageSchema>;

export const rulesQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  jurisdiction: z
    .string()
    .regex(/^CA-[A-Z]{2}(\/[a-z0-9-]+)*$/)
    .default("CA-QC"),
  date: z.iso.date().optional(),
});
export type RulesQuery = z.infer<typeof rulesQuerySchema>;

/** Reads the query string of the page; anything invalid falls back to the defaults, never to an error page. */
export function parseRulesQuery(raw: Record<string, string | string[] | undefined>): RulesQuery {
  const first = (value: string | string[] | undefined) => {
    const one = Array.isArray(value) ? value[0] : value;
    return one === "" ? undefined : one;
  };
  const parsed = rulesQuerySchema.safeParse({
    q: first(raw.q),
    jurisdiction: first(raw.jurisdiction),
    date: first(raw.date),
  });
  return parsed.success ? parsed.data : { jurisdiction: "CA-QC" };
}
