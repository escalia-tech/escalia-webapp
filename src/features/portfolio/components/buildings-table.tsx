import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";

import type { BuildingsPage, BuildingsQuery } from "../schemas/portfolio.schema";

function pageHref(query: BuildingsQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.includeArchived) params.set("archived", "1");
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/buildings?${text}` : "/buildings";
}

export function BuildingsTable({ data, query }: { data: BuildingsPage; query: BuildingsQuery }) {
  const t = useTranslations("portfolio.list");
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <search>
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <label htmlFor="buildings-search" className="text-sm font-medium">
                  {t("searchLabel")}
                </label>
                <Input
                  id="buildings-search"
                  name="q"
                  type="search"
                  defaultValue={query.q ?? ""}
                  placeholder={t("searchPlaceholder")}
                  maxLength={80}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="archived" value="1" defaultChecked={query.includeArchived} />
                {t("showArchived")}
              </label>
              <Button type="submit" variant="outline">
                {t("search")}
              </Button>
            </form>
          </search>
          <Button asChild>
            <Link href="/buildings/new">{t("add")}</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("count", { count: data.total })}
        </p>
        {data.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{query.q ? t("noResults") : t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.building")}</TableHead>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.address")}</TableHead>
                <TableHead className="text-right">{t("columns.units")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((building) => (
                <TableRow key={building.id}>
                  <TableCell>
                    <Link className="font-medium underline-offset-2 hover:underline" href={`/buildings/${building.id}`}>
                      {building.displayName}
                    </Link>
                    {building.archived ? (
                      <Badge variant="secondary" className="ml-2">
                        {t("archived")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{building.code}</TableCell>
                  <TableCell>
                    {building.street}, {building.city}
                  </TableCell>
                  <TableCell className="text-right">{building.unitCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <nav className="flex items-center justify-between" aria-label={t("pageOf", { page: data.page })}>
          {data.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={pageHref(query, data.page - 1)}>{t("previous")}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">{t("pageOf", { page: data.page })}</span>
          {data.page < lastPage ? (
            <Button asChild variant="outline">
              <Link href={pageHref(query, data.page + 1)}>{t("next")}</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      </CardContent>
    </Card>
  );
}
