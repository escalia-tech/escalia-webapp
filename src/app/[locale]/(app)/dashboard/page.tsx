import { Building2, CircleDollarSign, DoorOpen, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ChartCard } from "@/components/charts/chart-card";
import { RentTrendChart } from "@/components/charts/rent-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardSummary } from "@/features/buildings/server/buildings.service";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { RealMetrics } from "@/features/dashboard/components/real-metrics";
import { TypesDonutChart } from "@/features/dashboard/components/types-donut-chart";
import { UnitsBarChart } from "@/features/dashboard/components/units-bar-chart";
import { type DashboardView, fromBff, fromDemo } from "@/features/dashboard/lib/dashboard-view";
import { fetchDashboard } from "@/features/dashboard/server/dashboard.service";
import { CreateOrganizationCard } from "@/features/organization/components/create-organization-card";
import { formatMoney, formatMonth, formatNumber } from "@/lib/format";
import { isMissingOrganization } from "@/server/bff-pages/failure";
import { getServerEnv } from "@/server/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const [t, tTypes, locale] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("buildings.types"),
    getLocale(),
  ]);
  // With a BFF configured the figures are the organization's own; without one the labelled demo stays.
  const view = await loadView(locale).catch((error: unknown) => {
    if (isMissingOrganization(error)) return null;
    throw error;
  });
  if (view === null) {
    // FR-PORT-01 BR-1: a person without an organization starts by creating one.
    return (
      <>
        <PageHeader
          title={t("title")}
          description={view.demo ? t("description") : t("descriptionReal")}
          breadcrumbs={[{ label: t("title") }]}
        />
        <CreateOrganizationCard />
      </>
    );
  }
  const { kpis, monthly, unitsByBuilding, buildingsByType } = view;
  const unavailable = t("charts.table.unavailable");
  const first = monthly[0]?.month;
  const last = monthly.at(-1)?.month;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        demoData={view.demo}
        breadcrumbs={[{ label: t("title") }]}
        actions={
          <p className="text-muted-foreground text-sm">
            {t("period", { period: formatMonth(view.period, locale, "long") })}
          </p>
        }
      />

      <section aria-label={t("title")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Building2}
          label={t("kpi.buildings.label")}
          value={kpis.buildingCount === null ? unavailable : formatNumber(kpis.buildingCount, locale)}
          info={t("kpi.buildings.info")}
          infoLabel={t("kpi.buildings.label")}
        />
        <KpiCard
          icon={DoorOpen}
          label={t("kpi.units.label")}
          value={kpis.unitCount === null ? unavailable : formatNumber(kpis.unitCount, locale)}
          info={t("kpi.units.info")}
          infoLabel={t("kpi.units.label")}
        />
        <KpiCard
          icon={CircleDollarSign}
          label={t("kpi.rentDue.label")}
          value={(kpis.rentDueCents === null ? null : formatMoney(kpis.rentDueCents, locale)) ?? unavailable}
          info={t("kpi.rentDue.info")}
          infoLabel={t("kpi.rentDue.label")}
        />
        <KpiCard
          icon={HandCoins}
          label={t("kpi.rentReceived.label")}
          value={(kpis.rentReceivedCents === null ? null : formatMoney(kpis.rentReceivedCents, locale)) ?? unavailable}
          info={t("kpi.rentReceived.info")}
          infoLabel={t("kpi.rentReceived.label")}
          note={
            kpis.receivedMissingCount > 0
              ? t("kpi.rentReceived.missing", { count: kpis.receivedMissingCount })
              : undefined
          }
        />
      </section>

      {view.real ? <RealMetrics real={view.real} /> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          title={t("charts.rent.title")}
          description={t("charts.rent.description")}
          info={t("charts.rent.info")}
          infoLabel={t("charts.rent.title")}
          summary={t("charts.rent.summary", {
            count: monthly.length,
            from: first ? formatMonth(first, locale, "long") : "",
            to: last ? formatMonth(last, locale, "long") : "",
          })}
          tableToggleLabel={t("charts.table.toggle")}
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("charts.table.month")}</TableHead>
                  <TableHead className="text-right">{t("charts.rent.due")}</TableHead>
                  <TableHead className="text-right">{t("charts.rent.received")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map((row) => (
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
          <RentTrendChart data={monthly} />
        </ChartCard>

        <ChartCard
          title={t("charts.units.title")}
          description={t("charts.units.description")}
          summary={t("charts.units.summary", { count: unitsByBuilding.length })}
          tableToggleLabel={t("charts.table.toggle")}
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("charts.table.building")}</TableHead>
                  <TableHead className="text-right">{t("charts.units.series")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitsByBuilding.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.unitCount, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <UnitsBarChart data={unitsByBuilding} />
        </ChartCard>

        {buildingsByType ? (
          <ChartCard
            title={t("charts.types.title")}
            description={t("charts.types.description")}
            summary={t("charts.types.summary", { count: kpis.buildingCount ?? 0 })}
            tableToggleLabel={t("charts.table.toggle")}
            table={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("charts.table.type")}</TableHead>
                    <TableHead className="text-right">{t("charts.types.series")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildingsByType.map((row) => (
                    <TableRow key={row.buildingType}>
                      <TableCell>{tTypes(row.buildingType)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.count, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          >
            <TypesDonutChart data={buildingsByType} />
          </ChartCard>
        ) : null}
      </div>
    </>
  );
}

async function loadView(locale: string): Promise<DashboardView> {
  if (!getServerEnv().bffBaseUrl) return fromDemo(await getDashboardSummary());
  return fromBff(await fetchDashboard(locale), new Date().toISOString().slice(0, 7));
}
