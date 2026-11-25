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
import { PropertyNoteDemoForm } from "@/features/properties/components/property-note-demo-form";
import { getProperty } from "@/features/properties/server/properties.service";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatMonth, formatNumber, formatPercent } from "@/lib/format";
import { isApplicationError } from "@/lib/observability/errors/application-error";
import { safeReturnTo } from "@/lib/return-to";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadProperty(id: string) {
  try {
    return await getProperty(id);
  } catch (error) {
    if (isApplicationError(error) && error.code === "resource.not_found") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { property } = await getProperty(id);
    return { title: property.name };
  } catch {
    return {};
  }
}

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, rawSearch, locale] = await Promise.all([params, searchParams, getLocale()]);
  const [t, tList, tTypes, tDash, tNav, { property, meta }] = await Promise.all([
    getTranslations("properties.detail"),
    getTranslations("properties"),
    getTranslations("properties.types"),
    getTranslations("dashboard.charts.table"),
    getTranslations("shell.nav.items"),
    loadProperty(id),
  ]);
  const tRent = await getTranslations("dashboard.charts.rent");

  // `returnTo` is user-controlled: only an in-app /properties path is accepted.
  const returnTo = safeReturnTo(rawSearch.returnTo, "/properties");
  const backHref = returnTo.startsWith("/properties") ? returnTo : "/properties";
  const unavailable = tList("list.unavailable");
  const first = property.rentHistory[0]?.month;
  const last = property.rentHistory.at(-1)?.month;

  return (
    <>
      <PageHeader
        title={property.name}
        description={`${property.address.line1}, ${property.address.city} (${property.address.province}) ${property.address.postalCode}`}
        demoData
        breadcrumbs={[
          { label: tNav("dashboard"), href: "/dashboard" },
          { label: tList("title"), href: backHref as `/${string}` },
          { label: property.name },
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
                <Badge variant="outline">{tTypes(property.propertyType)}</Badge>
              </dd>
              <dt className="text-muted-foreground">{t("units")}</dt>
              <dd className="font-medium tabular-nums">{formatNumber(property.unitCount, locale)}</dd>
              <dt className="text-muted-foreground flex items-center gap-1">
                {t("occupancy")}
                <InfoTooltip label={t("occupancy")}>{t("occupancyInfo")}</InfoTooltip>
              </dt>
              <dd className="font-medium tabular-nums">
                {formatPercent(property.occupancyRate, locale) ?? unavailable}
              </dd>
              <dt className="text-muted-foreground">{t("rentDue")}</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(property.monthlyRentDue.amountCents, locale) ?? unavailable}
              </dd>
              <dt className="text-muted-foreground">{t("rentReceived")}</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(property.monthlyRentReceived.amountCents, locale) ?? unavailable}
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
            count: property.rentHistory.length,
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
                {property.rentHistory.map((row) => (
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
          <RentTrendChart data={property.rentHistory} />
        </ChartCard>

        <div className="lg:col-span-3">
          <PropertyNoteDemoForm />
        </div>
      </div>
    </>
  );
}
