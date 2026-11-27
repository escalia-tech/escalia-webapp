import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { pick, type TenantLedger as View } from "../schemas/ledger.schema";

/** FR-LEDG-01 section 9: a tenant reads every line of their lease, a guarantor the balance only. */
export async function TenantLedger({ view }: { view: View }) {
  const [t, locale, format] = await Promise.all([getTranslations("leases.ledger"), getLocale(), getFormatter()]);
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "CAD" });
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t("tenant.title")}</CardTitle>
        <CardDescription>{t("tenant.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("balance")}</dt>
            <dd className="text-2xl font-semibold">{money(view.balanceCents)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("credit")}</dt>
            <dd className="text-2xl font-semibold">{money(view.creditCents)}</dd>
          </div>
        </dl>
        {view.role === "GUARANTOR" ? <Callout tone="info">{t("tenant.guarantorOnly")}</Callout> : null}
        {view.role === "TENANT" && view.entries.length === 0 ? (
          <p className="text-muted-foreground">{t("tenant.empty")}</p>
        ) : null}
        {view.entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="pr-3 font-normal">{t("columns.date")}</th>
                  <th className="pr-3 font-normal">{t("columns.description")}</th>
                  <th className="pr-3 text-right font-normal">{t("columns.charge")}</th>
                  <th className="pr-3 text-right font-normal">{t("columns.payment")}</th>
                  <th className="text-right font-normal">{t("columns.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {view.entries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {format.dateTime(new Date(`${entry.effectiveOn}T12:00:00`), { dateStyle: "medium" })}
                    </td>
                    <td className="py-2 pr-3">
                      {pick(entry.description, locale)}
                      {entry.correction ? <span className="text-muted-foreground"> · {t("correction")}</span> : null}
                    </td>
                    <td className="py-2 pr-3 text-right">{entry.chargeCents > 0 ? money(entry.chargeCents) : null}</td>
                    <td className="py-2 pr-3 text-right">
                      {entry.paymentCents > 0 ? money(entry.paymentCents) : null}
                    </td>
                    <td className="py-2 text-right font-medium">{money(entry.balanceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {view.role === "TENANT" ? (
          <div>
            <a className="underline" href={`/api/bff/ledger/csv?leaseId=${view.leaseId}&as=tenant`} download>
              {t("csv")}
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
