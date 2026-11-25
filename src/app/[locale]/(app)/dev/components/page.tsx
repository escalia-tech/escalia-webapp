import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { RentTrendChart } from "@/components/charts/rent-trend-chart";
import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GalleryInteractive } from "@/features/gallery/components/gallery-interactive";
import { getProperty } from "@/features/properties/server/properties.service";
import { formatMoney } from "@/lib/format";
import { isDemoModeEnabled } from "@/server/config/env";

export const metadata: Metadata = { title: "Components", robots: { index: false, follow: false } };

/** Component gallery: development reference, refused (404) outside demo mode so it never ships to production. */
export default async function ComponentGalleryPage() {
  if (!isDemoModeEnabled()) notFound();

  const [t, locale, { property }] = await Promise.all([
    getTranslations("gallery"),
    getLocale(),
    getProperty("demo-cedre"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} demoData />
      <div className="space-y-8">
        <Callout tone="info">{t("devOnly")}</Callout>

        <section aria-labelledby="g-typo" className="space-y-2">
          <h2 id="g-typo" className="text-lg font-semibold">
            {t("sections.typography")}
          </h2>
          <p>{t("typography.accents")}</p>
          <p className="tabular-nums">{t("typography.numerals")}</p>
          <p>
            <span className="font-medium">Medium 500</span> · <span className="font-semibold">Semi-bold 600</span> ·{" "}
            <span className="font-bold">Bold 700</span>
          </p>
        </section>

        <section aria-labelledby="g-buttons" className="space-y-3">
          <h2 id="g-buttons" className="text-lg font-semibold">
            {t("sections.buttons")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button>{t("buttons.primary")}</Button>
            <Button variant="secondary">{t("buttons.secondary")}</Button>
            <Button variant="outline">{t("buttons.outline")}</Button>
            <Button variant="ghost">{t("buttons.ghost")}</Button>
            <Button variant="destructive">{t("buttons.destructive")}</Button>
            <Button variant="link">{t("buttons.link")}</Button>
            <Button disabled>{t("buttons.disabled")}</Button>
          </div>
        </section>

        <section aria-labelledby="g-badges" className="space-y-3">
          <h2 id="g-badges" className="text-lg font-semibold">
            {t("sections.badges")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge>{t("badges.default")}</Badge>
            <Badge variant="secondary">{t("badges.secondary")}</Badge>
            <Badge variant="outline">{t("badges.outline")}</Badge>
            <Badge variant="outline">{t("badges.demo")}</Badge>
            <Badge variant="outline">{t("badges.planned")}</Badge>
          </div>
        </section>

        <section aria-labelledby="g-callouts" className="space-y-3">
          <h2 id="g-callouts" className="text-lg font-semibold">
            {t("sections.callouts")}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(["info", "warning", "danger", "success"] as const).map((tone) => (
              <Callout key={tone} tone={tone} title={t(`callouts.${tone}.title`)}>
                {t(`callouts.${tone}.body`)}
              </Callout>
            ))}
          </div>
        </section>

        <GalleryInteractive />

        <section aria-labelledby="g-table" className="space-y-3">
          <h2 id="g-table" className="text-lg font-semibold">
            {t("sections.table")}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead className="text-right">{t("table.units")}</TableHead>
                <TableHead className="text-right">{t("table.rent")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="h-(--row-height)">
                <TableCell>{property.name}</TableCell>
                <TableCell className="text-right tabular-nums">{property.unitCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(property.monthlyRentDue.amountCents, locale) ?? t("table.unavailable")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <section aria-labelledby="g-charts" className="space-y-3">
          <h2 id="g-charts" className="text-lg font-semibold">
            {t("sections.charts")}
          </h2>
          <RentTrendChart data={property.rentHistory} />
        </section>
      </div>
    </>
  );
}
