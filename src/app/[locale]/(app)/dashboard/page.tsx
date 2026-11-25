import { Building2, CircleDollarSign, DoorOpen, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ChartCard } from "@/components/charts/chart-card";
import { RentTrendChart } from "@/components/charts/rent-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { TypesDonutChart } from "@/features/dashboard/components/types-donut-chart";
import { UnitsBarChart } from "@/features/dashboard/components/units-bar-chart";
import { getDashboardSummary } from "@/features/properties/server/properties.service";
import { formatMoney, formatMonth, formatNumber } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const [t, tTypes, summary, locale] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("properties.types"),
    getDashboardSummary(),
    getLocale(),
  ]);
  const { kpis, monthly, unitsByProperty, propertiesByType, meta } = summary;
  const unavailable = t("charts.table.unavailable");
  const first = monthly[0]?.month;
  const last = monthly.at(-1)?.month;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        demoData
        breadcrumbs={[{ label: t("title") }]}
        actions={
          <p className="text-muted-foreground text-sm">
            {t("period", { period: formatMonth(meta.period, locale, "long") })}
          </p>
        }
      />

      <section aria-label={t("title")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Building2}
          label={t("kpi.properties.label")}
          value={formatNumber(kpis.propertyCount, locale)}
          info={t("kpi.properties.info")}
          infoLabel={t("kpi.properties.label")}
        />
        <KpiCard
          icon={DoorOpen}
          label={t("kpi.units.label")}
          value={formatNumber(kpis.unitCount, locale)}
          info={t("kpi.units.info")}
          infoLabel={t("kpi.units.label")}
        />
        <KpiCard
          icon={CircleDollarSign}
          label={t("kpi.rentDue.label")}
          value={formatMoney(kpis.rentDueCents, locale) ?? unavailable}
          info={t("kpi.rentDue.info")}
          infoLabel={t("kpi.rentDue.label")}
        />
        <KpiCard
          icon={HandCoins}
          label={t("kpi.rentReceived.label")}
          value={formatMoney(kpis.rentReceivedCents, locale) ?? unavailable}
          info={t("kpi.rentReceived.info")}
          infoLabel={t("kpi.rentReceived.label")}
          note={
            kpis.receivedMissingCount > 0
              ? t("kpi.rentReceived.missing", { count: kpis.receivedMissingCount })
              : undefined
          }
        />
      </section>

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
          summary={t("charts.units.summary", { count: unitsByProperty.length })}
          tableToggleLabel={t("charts.table.toggle")}
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("charts.table.property")}</TableHead>
                  <TableHead className="text-right">{t("charts.units.series")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitsByProperty.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.unitCount, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <UnitsBarChart data={unitsByProperty} />
        </ChartCard>

        <ChartCard
          title={t("charts.types.title")}
          description={t("charts.types.description")}
          summary={t("charts.types.summary", { count: kpis.propertyCount })}
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
                {propertiesByType.map((row) => (
                  <TableRow key={row.propertyType}>
                    <TableCell>{tTypes(row.propertyType)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.count, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <TypesDonutChart data={propertiesByType} />
        </ChartCard>
      </div>
    </>
  );
}
