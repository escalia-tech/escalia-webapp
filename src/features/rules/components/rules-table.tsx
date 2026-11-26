import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { Rule, RulesPage } from "../schemas/rules.schema";

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function date(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function RuleRow({ rule, locale }: { rule: Rule; locale: string }) {
  const t = useTranslations("rules");
  return (
    <TableRow>
      <TableCell className="max-w-md whitespace-normal">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{rule.title}</span>
          {rule.severity ? (
            <Badge variant={rule.severity === "BLOCK" ? "destructive" : "secondary"}>
              {t(`severity.${rule.severity}`)}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{rule.sentence}</p>
        {rule.alternative ? <p className="mt-1 text-sm">{t("alternative", { text: rule.alternative })}</p> : null}
        <p className="text-muted-foreground mt-1 font-mono text-xs">{rule.key}</p>
      </TableCell>
      <TableCell className="font-mono text-sm">{formatValue(rule.value)}</TableCell>
      <TableCell>{date(rule.effectiveFrom, locale)}</TableCell>
      <TableCell className="whitespace-normal">
        <a className="underline underline-offset-2" href={rule.sourceUrl} target="_blank" rel="noopener noreferrer">
          {rule.citation}
        </a>
        <p className="text-muted-foreground text-xs">{t("verifiedOn", { date: date(rule.verifiedOn, locale) })}</p>
      </TableCell>
    </TableRow>
  );
}

export function RulesTable({ page, search, locale }: { page: RulesPage; search: string; locale: string }) {
  const t = useTranslations("rules");
  return (
    <Card>
      <CardContent className="space-y-4">
        <search>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <label htmlFor="rules-search" className="text-sm font-medium">
                {t("searchLabel")}
              </label>
              <Input
                id="rules-search"
                name="q"
                type="search"
                defaultValue={search}
                placeholder={t("searchPlaceholder")}
                maxLength={80}
              />
            </div>
            <Button type="submit">{t("search")}</Button>
          </form>
        </search>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("jurisdiction")}: {page.jurisdiction} · {t("asOf", { date: date(page.date, locale) })} ·{" "}
          {t("count", { count: page.rules.length })}
          {page.rules[0] ? ` · ${t("packVersion", { version: page.rules[0].packVersion })}` : ""}
        </p>
        {page.rules.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.rule")}</TableHead>
                <TableHead>{t("columns.value")}</TableHead>
                <TableHead>{t("columns.since")}</TableHead>
                <TableHead>{t("columns.source")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.rules.map((rule) => (
                <RuleRow key={rule.key} rule={rule} locale={locale} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
