import { CircleDollarSign, DoorClosed, Percent, TrendingDown } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatNumber } from "@/lib/format";

import type { RealFigures } from "../lib/dashboard-view";
import { ArrearsBarChart } from "./arrears-bar-chart";
import { KpiCard } from "./kpi-card";

const SHOWN = 5;

/** The figures of FR-DASH-01 that exist only for the real organization. A missing source says so, never zero. */
export async function RealMetrics({ real }: { real: RealFigures }) {
  const [t, locale] = await Promise.all([getTranslations("dashboard.real"), getLocale()]);
  const unavailable = t("unavailable");
  const money = (cents: number | null | undefined) =>
    cents == null ? unavailable : (formatMoney(cents, locale) ?? unavailable);
  const { occupancy, arrears, endingSoon, waiting, vacantUnits, rent } = real;
  const buckets = [
    { bucket: "current", label: t("arrears.current"), cents: arrears.ageing.currentCents },
    { bucket: "d1", label: t("arrears.days1to7"), cents: arrears.ageing.days1to7Cents },
    { bucket: "d8", label: t("arrears.days8to21"), cents: arrears.ageing.days8to21Cents },
    { bucket: "d22", label: t("arrears.days22Plus"), cents: arrears.ageing.days22PlusCents },
  ];

  return (
    <>
      <section aria-label={t("title")} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={DoorClosed}
          label={t("occupancy.label")}
          value={
            occupancy?.ratePercent == null
              ? occupancy
                ? t("occupancy.none")
                : unavailable
              : `${occupancy.ratePercent} %`
          }
          info={t("occupancy.info")}
          infoLabel={t("occupancy.label")}
          note={occupancy ? t("occupancy.note", { occupied: occupancy.occupied, total: occupancy.total }) : undefined}
        />
        <KpiCard
          icon={Percent}
          label={t("collection.label")}
          value={real.collectionPercent == null ? t("collection.none") : `${real.collectionPercent} %`}
          info={t("collection.info")}
          infoLabel={t("collection.label")}
        />
        <KpiCard
          icon={CircleDollarSign}
          label={t("rent.label")}
          value={money(rent?.actualCents)}
          info={t("rent.info")}
          infoLabel={t("rent.label")}
        />
        <KpiCard
          icon={TrendingDown}
          label={t("vacancyGap.label")}
          value={money(rent?.vacancyCents)}
          info={t("vacancyGap.info")}
          infoLabel={t("vacancyGap.label")}
          note={
            rent && rent.unitsWithoutKnownRent > 0
              ? t("vacancyGap.unknown", { count: rent.unitsWithoutKnownRent })
              : undefined
          }
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          title={t("arrears.title")}
          description={t("arrears.description", {
            owed: money(arrears.receivableCents),
            credit: money(arrears.creditCents),
          })}
          summary={t("arrears.summary", { owed: money(arrears.receivableCents) })}
          tableToggleLabel={t("table")}
          table={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("arrears.bucket")}</TableHead>
                  <TableHead className="text-right">{t("arrears.series")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buckets.map((row) => (
                  <TableRow key={row.bucket}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          {arrears.ledgersMissing ? (
            <p className="text-muted-foreground text-sm">{t("arrears.missing")}</p>
          ) : (
            <ArrearsBarChart data={buckets} />
          )}
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>{t("ending.title")}</CardTitle>
            <CardDescription>
              {endingSoon
                ? t("ending.summary", { within60: endingSoon.within60, within90: endingSoon.within90 })
                : unavailable}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {endingSoon && endingSoon.next.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("unit")}</TableHead>
                    <TableHead className="text-right">{t("ending.in")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endingSoon.next.map((row) => (
                    <TableRow key={`${row.buildingName}-${row.unitLabel}-${row.endDate}`}>
                      <TableCell>{`${row.buildingName}, ${row.unitLabel}`}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t("ending.days", { count: row.daysLeft, date: row.endDate })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">{endingSoon ? t("ending.empty") : unavailable}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("waiting.title")}</CardTitle>
            <CardDescription>{t("waiting.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {waiting ? (
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt>{t("waiting.signature")}</dt>
                  <dd className="tabular-nums">{formatNumber(waiting.outForSignature, locale)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("waiting.pending")}</dt>
                  <dd className="tabular-nums">{formatNumber(waiting.invitationsPending, locale)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("waiting.never")}</dt>
                  <dd className="tabular-nums">{formatNumber(waiting.neverInvited, locale)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">{unavailable}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("vacant.title")}</CardTitle>
            <CardDescription>{t("vacant.description", { count: vacantUnits.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            {vacantUnits.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("vacant.empty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("unit")}</TableHead>
                    <TableHead className="text-right">{t("vacant.days")}</TableHead>
                    <TableHead className="text-right">{t("vacant.lastRent")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacantUnits.slice(0, SHOWN).map((row) => (
                    <TableRow key={`${row.buildingName}-${row.unitLabel}`}>
                      <TableCell>{`${row.buildingName}, ${row.unitLabel}`}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.daysVacant == null ? t("vacant.never") : t("vacant.daysValue", { count: row.daysVacant })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.lastRentCents == null ? "—" : money(row.lastRentCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
