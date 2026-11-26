import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ChartCard } from "@/components/charts/chart-card";
import { RentTrendChart } from "@/components/charts/rent-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BuildingNoteDemoForm } from "@/features/buildings/components/building-note-demo-form";
import { getBuilding } from "@/features/buildings/server/buildings.service";
import { BuildingRoute } from "@/features/portfolio/components/buildings-route";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatMonth, formatNumber, formatPercent } from "@/lib/format";
import { isApplicationError } from "@/lib/observability/errors/application-error";
import { safeReturnTo } from "@/lib/return-to";
import { getServerEnv } from "@/server/config/env";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadBuilding(id: string) {
  try {
    return await getBuilding(id);
  } catch (error) {
    if (isApplicationError(error) && error.code === "resource.not_found") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { building } = await getBuilding(id);
    return { title: building.name };
  } catch {
    return {};
  }
}

export default async function BuildingDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, rawSearch, locale] = await Promise.all([params, searchParams, getLocale()]);
  if (getServerEnv().bffBaseUrl) return <BuildingRoute id={id} />;
  const [t, tList, tTypes, tDash, tNav, { building, meta }] = await Promise.all([
    getTranslations("buildings.detail"),
    getTranslations("buildings"),
    getTranslations("buildings.types"),
    getTranslations("dashboard.charts.table"),
    getTranslations("shell.nav.items"),
    loadBuilding(id),
  ]);
  const tRent = await getTranslations("dashboard.charts.rent");

  // `returnTo` is user-controlled: only an in-app /buildings path is accepted.
  const returnTo = safeReturnTo(rawSearch.returnTo, "/buildings");
  const backHref = returnTo.startsWith("/buildings") ? returnTo : "/buildings";
  const unavailable = tList("list.unavailable");
  const first = building.rentHistory[0]?.month;
  const last = building.rentHistory.at(-1)?.month;

  return (
    <>
      <PageHeader
        title={building.name}
        description={`${building.address.line1}, ${building.address.city} (${building.address.province}) ${building.address.postalCode}`}
        demoData
        breadcrumbs={[
          { label: tNav("dashboard"), href: "/dashboard" },
          { label: tList("title"), href: backHref as `/${string}` },
          { label: building.name },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href={backHref as `/${string}`}>
              <ArrowLeft data-icon="inline-start" aria-hidden />
              {t("back")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">{t("type")}</dt>
              <dd>
                <Badge variant="outline">{tTypes(building.buildingType)}</Badge>
              </dd>
              <dt className="text-muted-foreground">{t("units")}</dt>
              <dd className="font-medium tabular-nums">{formatNumber(building.unitCount, locale)}</dd>
              <dt className="text-muted-foreground flex items-center gap-1">
                {t("occupancy")}
                <InfoTooltip label={t("occupancy")}>{t("occupancyInfo")}</InfoTooltip>
              </dt>
              <dd className="font-medium tabular-nums">
                {formatPercent(building.occupancyRate, locale) ?? unavailable}
              </dd>
              <dt className="text-muted-foreground">{t("rentDue")}</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(building.monthlyRentDue.amountCents, locale) ?? unavailable}
              </dd>
              <dt className="text-muted-foreground">{t("rentReceived")}</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(building.monthlyRentReceived.amountCents, locale) ?? unavailable}
              </dd>
              <dt className="text-muted-foreground">{t("period")}</dt>
              <dd className="text-muted-foreground text-xs">{formatMonth(meta.period, locale, "long")}</dd>
            </dl>
          </CardContent>
        </Card>

        <ChartCard
          className="lg:col-span-2"
          title={t("historyTitle")}
          description={tRent("description")}
          info={tRent("info")}
          infoLabel={t("historyTitle")}
          summary={tRent("summary", {
            count: building.rentHistory.length,
            from: first ? formatMonth(first, locale, "long") : "",
            to: last ? formatMonth(last, locale, "long") : "",
          })}
          tableToggleLabel={tDash("toggle")}
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tDash("month")}</TableHead>
                  <TableHead className="text-right">{tRent("due")}</TableHead>
                  <TableHead className="text-right">{tRent("received")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {building.rentHistory.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{formatMonth(row.month, locale, "long")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.dueCents, locale) ?? unavailable}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.receivedCents, locale) ?? unavailable}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <RentTrendChart data={building.rentHistory} />
        </ChartCard>

        <div className="lg:col-span-3">
          <BuildingNoteDemoForm />
        </div>
      </div>
    </>
  );
}
