"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { useSearchParams } from "next/navigation";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { bffFetch } from "@/lib/bff-client";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { useErrorMessage } from "@/lib/use-error-message";
import { cn } from "@/lib/utils";

import { parseListQuery, toSearchParams } from "../lib/list-query";
import {
  PAGE_SIZES,
  PROPERTY_TYPES,
  type PropertyListQuery,
  type PropertyListResult,
  type PropertySummary,
  type SORT_FIELDS,
} from "../schemas/property.schema";

const ALL_TYPES = "all";
const SEARCH_DEBOUNCE_MS = 300;

interface PropertiesListProps {
  /** Result computed by the Server Component for the initial URL (absent when it failed or a demo scenario is active). */
  initialData?: PropertyListResult;
  /** Canonical query string that `initialData` corresponds to. */
  initialQueryString: string;
}

type SortField = (typeof SORT_FIELDS)[number];

export function PropertiesList({ initialData, initialQueryString }: PropertiesListProps) {
  const t = useTranslations("properties.list");
  const tTypes = useTranslations("properties.types");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("feedback.empty");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toErrorMessage = useErrorMessage();
  const [, startTransition] = useTransition();

  const query = useMemo(() => parseListQuery(searchParams), [searchParams]);
  const queryString = useMemo(() => toSearchParams(query).toString(), [query]);

  const [searchText, setSearchText] = useState(query.q ?? "");

  const result = useQuery({
    queryKey: ["properties", "list", queryString],
    queryFn: ({ signal }) =>
      bffFetch<PropertyListResult>(`/api/bff/properties${queryString ? `?${queryString}` : ""}`, { signal }),
    initialData: queryString === initialQueryString ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const navigate = useCallback(
    (next: PropertyListQuery) => {
      const qs = toSearchParams(next).toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname],
  );

  function update(patch: Partial<PropertyListQuery>, resetPage = true) {
    navigate({ ...query, ...patch, ...(resetPage ? { page: 1 } : {}) });
  }

  // Debounced search -> URL (shareable, back/forward friendly).
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === (query.q ?? "")) return;
    const timer = setTimeout(() => navigate({ ...query, q: trimmed || undefined, page: 1 }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, query, navigate]);

  // Keep the field in sync when the URL changes elsewhere (clear filters, back/forward).
  useEffect(() => {
    setSearchText(query.q ?? "");
  }, [query.q]);

  const hasFilters = Boolean(query.q) || Boolean(query.type);
  const data = result.data;
  const isInitialLoading = result.isPending;
  const showError = result.isError && !data;
  const refreshing = result.isFetching && !isInitialLoading;
  const error = showError ? toErrorMessage(result.error) : null;

  function clearFilters() {
    setSearchText("");
    navigate({ ...query, q: undefined, type: undefined, page: 1 });
  }

  function toggleSort(field: SortField) {
    if (query.sort === field) {
      update({ dir: query.dir === "asc" ? "desc" : "asc" }, false);
    } else {
      update({ sort: field, dir: "asc" }, false);
    }
  }

  const returnTo = `/properties${queryString ? `?${queryString}` : ""}`;

  const sortableHead = (field: SortField, label: string, align: "left" | "right" = "left") => {
    const active = query.sort === field;
    const ascending = query.dir === "asc";
    const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown;
    const direction = ascending ? t("sort.asc") : t("sort.desc");
    // Activating an ascending (or inactive) column sorts ascending; an active ascending column flips to descending.
    const nextDescending = active && ascending;
    const actionLabel = t(nextDescending ? "sort.descending" : "sort.ascending", { column: label });
    return (
      <TableHead
        key={field}
        aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}
        className={cn(align === "right" && "text-right")}
      >
        <button
          type="button"
          onClick={() => toggleSort(field)}
          aria-label={actionLabel}
          title={active ? t("sort.current", { column: label, direction }) : actionLabel}
          className={cn(
            "hover:bg-muted focus-visible:ring-ring -mx-2 inline-flex h-8 items-center gap-1 rounded-md px-2 outline-none focus-visible:ring-2",
            align === "right" && "flex-row-reverse",
          )}
        >
          <span>{label}</span>
          <Icon className={cn("size-3.5", active ? "text-foreground" : "text-muted-foreground")} aria-hidden />
        </button>
      </TableHead>
    );
  };

  const unavailable = t("unavailable");
  const money = (cents: number | null) => formatMoney(cents, locale) ?? unavailable;

  return (
    <section aria-label={t("region")} className="space-y-4">
      {query.scenario ? (
        <Callout tone="warning" title={t("scenario.title")}>
          <span>{t("scenario.body")}</span>{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 align-baseline text-inherit underline"
            onClick={() => update({ scenario: undefined }, false)}
          >
            {t("scenario.clear")}
          </Button>
        </Callout>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.label")}
            maxLength={80}
            className="pr-9 pl-9"
          />
          {searchText ? (
            <button
              type="button"
              onClick={() => setSearchText("")}
              aria-label={tCommon("actions.clear")}
              className="text-muted-foreground hover:bg-muted focus-visible:ring-ring absolute top-1/2 right-1.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-2"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <Select
          value={query.type ?? ALL_TYPES}
          onValueChange={(value) =>
            update({ type: value === ALL_TYPES ? undefined : (value as PropertyListQuery["type"]) })
          }
        >
          <SelectTrigger aria-label={t("filters.type")} className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>{t("filters.allTypes")}</SelectItem>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {tTypes(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X data-icon="inline-start" aria-hidden />
            {tEmpty("clearFilters")}
          </Button>
        ) : null}
      </div>

      <p role="status" className="sr-only">
        {data ? t("resultsAnnouncement", { count: data.totalCount }) : ""}
      </p>

      {showError && error ? (
        <ErrorState
          title={t("error.title")}
          description={`${t("error.description")} ${error.message}`}
          reference={error.reference}
          onRetry={() => void result.refetch()}
          retrying={result.isFetching}
        />
      ) : null}

      {!showError ? (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <div
              aria-busy={isInitialLoading || refreshing}
              className={cn("transition-opacity", refreshing && "opacity-60")}
            >
              <Table>
                <caption className="sr-only">{t("caption")}</caption>
                <TableHeader>
                  <TableRow>
                    {sortableHead("name", t("columns.name"))}
                    <TableHead className="hidden md:table-cell">{t("columns.type")}</TableHead>
                    {sortableHead("city", t("columns.city"))}
                    {sortableHead("unitCount", t("columns.units"), "right")}
                    <TableHead className="hidden text-right lg:table-cell">{t("columns.occupancy")}</TableHead>
                    <TableHead className="hidden text-right xl:table-cell">{t("columns.rentDue")}</TableHead>
                    <TableHead className="hidden text-right xl:table-cell">{t("columns.rentReceived")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading
                    ? Array.from({ length: 8 }, (_, index) => (
                        <TableRow key={index} className="h-(--row-height)">
                          <TableCell>
                            <Skeleton className="h-4 w-40" />
                            <span className="sr-only">{tCommon("a11y.loading")}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="ml-auto h-4 w-8" />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Skeleton className="ml-auto h-4 w-12" />
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <Skeleton className="ml-auto h-4 w-20" />
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <Skeleton className="ml-auto h-4 w-20" />
                          </TableCell>
                        </TableRow>
                      ))
                    : (data?.items ?? []).map((property: PropertySummary) => (
                        <TableRow key={property.id} className="h-(--row-height)">
                          <TableCell className="max-w-64 whitespace-normal">
                            <Link
                              href={`/properties/${property.id}?returnTo=${encodeURIComponent(returnTo)}`}
                              className="text-foreground focus-visible:ring-ring font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                            >
                              {property.name}
                            </Link>
                            <p className="text-muted-foreground text-xs">
                              {property.address.line1}, {property.address.postalCode}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                              <Badge variant="outline">{tTypes(property.propertyType)}</Badge>
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{tTypes(property.propertyType)}</Badge>
                          </TableCell>
                          <TableCell>
                            {property.address.city}, {property.address.province}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(property.unitCount, locale)}
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums lg:table-cell">
                            {formatPercent(property.occupancyRate, locale) ?? unavailable}
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums xl:table-cell">
                            {money(property.monthlyRentDue.amountCents)}
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums xl:table-cell">
                            {money(property.monthlyRentReceived.amountCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            {data && data.items.length === 0 ? (
              <div className="p-4">
                {hasFilters ? (
                  <EmptyState
                    icon={SearchX}
                    title={t("noResults.title")}
                    description={t("noResults.description")}
                    actions={
                      <Button type="button" variant="outline" onClick={clearFilters}>
                        {tEmpty("clearFilters")}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState icon={Building2} title={t("empty.title")} description={t("empty.description")} />
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {data && data.totalCount > 0 ? (
        <nav
          aria-label={tCommon("a11y.pagination")}
          className="flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <p className="text-muted-foreground text-sm tabular-nums">
            {tCommon("pagination.summary", {
              from: (data.page - 1) * data.pageSize + 1,
              to: Math.min(data.page * data.pageSize, data.totalCount),
              total: data.totalCount,
            })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span aria-hidden>{tCommon("pagination.rowsPerPage")}</span>
              <Select
                value={String(query.pageSize)}
                onValueChange={(value) => update({ pageSize: Number(value) as PropertyListQuery["pageSize"] })}
              >
                <SelectTrigger className="w-20" aria-label={tCommon("pagination.rowsPerPage")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={tCommon("a11y.previousPage")}
              disabled={data.page <= 1}
              onClick={() => update({ page: data.page - 1 }, false)}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <span className="text-sm tabular-nums" aria-current="page">
              {tCommon("pagination.page", { page: data.page, pageCount: data.pageCount })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={tCommon("a11y.nextPage")}
              disabled={data.page >= data.pageCount}
              onClick={() => update({ page: data.page + 1 }, false)}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
