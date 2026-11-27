import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

import type { BuildingPage } from "../schemas/portfolio.schema";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function BuildingView({ building }: { building: BuildingPage }) {
  const t = useTranslations("portfolio.detail");
  const { address } = building;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {building.displayName}
            {building.archived ? <Badge variant="secondary">{t("archived")}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label={t("code")}>
              <span className="font-mono">{building.code}</span>
            </Fact>
            <Fact label={t("address")}>
              {address.civicNumber} {address.street}, {address.city} {address.postalCode}
            </Fact>
            <Fact label={t("jurisdiction")}>{building.jurisdiction}</Fact>
            <Fact label={t("timeZone")}>{building.timeZone}</Fact>
            {building.yearBuilt ? <Fact label={t("yearBuilt")}>{building.yearBuilt}</Fact> : null}
          </dl>
          {building.codeLocked ? <p className="text-muted-foreground mt-3 text-sm">{t("codeLocked")}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("units")}</CardTitle>
        </CardHeader>
        <CardContent>
          {building.units.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noUnits")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {building.units.map((unit) => (
                <li key={unit.id}>
                  <Link
                    href={`/units/${unit.id}` as `/${string}`}
                    className="rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  >
                    <Badge variant={unit.archived ? "secondary" : "outline"}>{unit.label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("commonAreas")}</CardTitle>
        </CardHeader>
        <CardContent>
          {building.commonAreas.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noCommonAreas")}</p>
          ) : (
            <ul className="list-disc pl-5">
              {building.commonAreas.map((area) => (
                <li key={area.id}>{area.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("bylaws")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href={`/buildings/${building.id}/bylaws` as `/${string}`} className="underline">
            {t("bylawsLink")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
