import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { failureState } from "@/server/bff-pages/failure";

import { fetchLeaseAnnexes } from "../server/bylaws.service";
import { fetchLease, fetchLeaseLanguage, fetchLeases } from "../server/leases.service";
import { AnnexesPanel } from "./annexes-panel";
import { CreateLeaseButton } from "./create-lease-button";
import { InvitationsPanel } from "./invitations-panel";
import { LanguagePanel } from "./language-panel";
import { PartiesEditor } from "./parties-editor";
import { TermsEditor } from "./terms-editor";

async function crumbs(title: string) {
  const tNav = await getTranslations("shell.nav.items");
  return [{ label: tNav("dashboard"), href: "/dashboard" as const }, { label: title }];
}

/** The leases of the organization; a lease is started from its unit. */
export async function LeasesRoute() {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("leases"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  const header = (
    <PageHeader title={t("title")} description={t("description")} breadcrumbs={await crumbs(t("title"))} />
  );
  try {
    const leases = await fetchLeases(locale);
    return (
      <>
        {header}
        {leases.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3">
            {leases.map((lease) => (
              <li key={lease.id}>
                <Link
                  href={`/leases/${lease.id}` as `/${string}`}
                  className="hover:bg-muted block rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {lease.parties
                        .filter((one) => one.role === "TENANT")
                        .map((one) => one.legalName)
                        .join(", ") || t("noTenant")}
                    </span>
                    <Badge variant="outline">{t(`status.${lease.status}`)}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  } catch (error) {
    return (
      <>
        {header}
        <Callout tone="warning">{tPortfolio(`states.${failureState(error)}`)}</Callout>
      </>
    );
  }
}

/** One lease: its parties (FR-LEASE-05). */
export async function LeaseRoute({ id }: { id: string }) {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("leases"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  try {
    const [lease, language, annexes] = await Promise.all([
      fetchLease(id, locale),
      fetchLeaseLanguage(id, locale),
      fetchLeaseAnnexes(id, locale),
    ]);
    const title = t("one.title");
    return (
      <>
        <PageHeader
          title={title}
          description={t(`status.${lease.status}`)}
          breadcrumbs={[
            ...(await crumbs(t("title"))).slice(0, 1),
            { label: t("title"), href: "/leases" as const },
            { label: title },
          ]}
        />
        <PartiesEditor lease={lease} />
        <TermsEditor lease={lease} />
        <InvitationsPanel lease={lease} />
        <AnnexesPanel lease={lease} annexes={annexes} />
        <LanguagePanel leaseId={lease.id} language={language} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title={t("title")} breadcrumbs={await crumbs(t("title"))} />
        <Callout tone="warning">{tPortfolio(`states.${failureState(error)}`)}</Callout>
      </>
    );
  }
}

/** The leases panel of a unit, with the way to start a draft (FR-LEASE-05). */
export async function UnitLeases({ unitId }: { unitId: string }) {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("leases"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  try {
    const leases = await fetchLeases(locale, unitId);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("unitDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {leases.length === 0 ? <p className="text-muted-foreground text-sm">{t("empty")}</p> : null}
          <ul className="grid gap-2 text-sm">
            {leases.map((lease) => (
              <li key={lease.id} className="flex items-center justify-between gap-3">
                <Link href={`/leases/${lease.id}` as `/${string}`} className="underline">
                  {lease.parties.find((one) => one.role === "TENANT")?.legalName ?? t("noTenant")}
                </Link>
                <Badge variant="outline">{t(`status.${lease.status}`)}</Badge>
              </li>
            ))}
          </ul>
          <CreateLeaseButton unitId={unitId} />
        </CardContent>
      </Card>
    );
  } catch (error) {
    return <Callout tone="warning">{tPortfolio(`states.${failureState(error)}`)}</Callout>;
  }
}
