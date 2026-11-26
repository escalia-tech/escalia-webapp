import { useFormatter, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { UnitAttributesVersion } from "../schemas/unit.schema";

/** BR-9: every version, newest first. */
export function UnitHistory({ history }: { history: UnitAttributesVersion[] }) {
  const t = useTranslations("portfolio.unit");
  // Enum values select the message: the catalogue holds one entry per value (checked by the parity test).
  const tx = t as unknown as (key: string) => string;
  const format = useFormatter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("history.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("history.version")}</TableHead>
                <TableHead>{t("history.date")}</TableHead>
                <TableHead>{t("history.summary")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.version}>
                  <TableCell className="tabular-nums">{entry.version}</TableCell>
                  <TableCell>
                    {format.dateTime(new Date(entry.changedAt), { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                  <TableCell>
                    {t("history.line", {
                      type: tx(`types.${entry.attributes.typeAndSize.type}`),
                      heating: entry.attributes.included.heatingIncluded ? t("yes") : t("no"),
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
