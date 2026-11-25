import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COOKIE_INVENTORY } from "@/lib/cookies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("settings.privacy");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <ShieldCheck className="text-success-foreground mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">{t("summaryTitle")}</h2>
              <p className="text-muted-foreground text-sm">{t("summaryBody")}</p>
            </div>
          </div>
          <Callout tone="warning">{t("legalNote")}</Callout>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("consentTitle")}</h2>
            <p className="text-muted-foreground text-sm">{t("consentBody")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.storage")}</TableHead>
                <TableHead>{t("columns.purpose")}</TableHead>
                <TableHead>{t("columns.duration")}</TableHead>
                <TableHead>{t("columns.attributes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COOKIE_INVENTORY.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-mono text-xs">{item.name}</TableCell>
                  <TableCell>{t(`storage.${item.storage}`)}</TableCell>
                  <TableCell className="min-w-56 whitespace-normal">{t(`purposes.${item.purposeKey}`)}</TableCell>
                  <TableCell>{t(`duration.${item.duration}`)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {item.httpOnly ? t("attributes.httpOnly") : t("attributes.scriptReadable")}
                      </Badge>
                      {item.necessary ? <Badge variant="secondary">{t("attributes.necessary")}</Badge> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
