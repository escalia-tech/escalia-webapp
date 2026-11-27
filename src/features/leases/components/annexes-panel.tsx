import { getFormatter, getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { LeaseAnnex } from "../schemas/bylaws.schema";
import type { Lease } from "../schemas/leases.schema";

/** What the lease carries and who acknowledged it, for the landlord (FR-LEASE-03 BR-6, BR-8). */
export async function AnnexesPanel({ lease, annexes }: { lease: Lease; annexes: LeaseAnnex[] }) {
  const [t, format] = await Promise.all([getTranslations("leases"), getFormatter()]);
  const names = new Map(lease.parties.map((party) => [party.personId, party.legalName]));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("annexes.title")}</CardTitle>
        <CardDescription>{t("annexes.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {annexes.length === 0 ? <p className="text-muted-foreground text-sm">{t("annexes.none")}</p> : null}
        <ul className="grid gap-3 text-sm">
          {annexes.map((annex) => (
            <li key={annex.id}>
              <div className="font-medium">{annex.title}</div>
              {annex.versionDate ? (
                <div className="text-muted-foreground">
                  {t("annexes.attached", {
                    date: format.dateTime(new Date(annex.versionDate), { dateStyle: "medium" }),
                  })}
                </div>
              ) : null}
              <div>
                {annex.acknowledgedBy.length === 0
                  ? t("annexes.nobody")
                  : t("annexes.by", {
                      names: annex.acknowledgedBy.map((id) => names.get(id) ?? "?").join(", "),
                    })}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
