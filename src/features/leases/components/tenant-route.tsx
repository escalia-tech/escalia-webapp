import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { failureState } from "@/server/bff-pages/failure";

import { fetchTenantAnnexes } from "../server/bylaws.service";
import { fetchTenantLanguage, fetchTenantLease, fetchTenantLeases } from "../server/leases.service";
import { fetchTenantSigning } from "../server/signing.service";
import { AcceptInvitationForm } from "./accept-invitation-form";
import { LanguageChoice } from "./language-choice";
import { TenantAnnexes } from "./tenant-annexes";
import { TenantSigning } from "./tenant-signing";

async function crumbs(title: string) {
  const tNav = await getTranslations("shell.nav.items");
  return [{ label: tNav("dashboard"), href: "/dashboard" as const }, { label: title }];
}

/** The leases the signed-in person joined (FR-TEN-01). */
export async function TenantLeasesRoute() {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("leases"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  const header = (
    <PageHeader
      title={t("tenant.title")}
      description={t("tenant.description")}
      breadcrumbs={await crumbs(t("tenant.title"))}
    />
  );
  try {
    const leases = await fetchTenantLeases(locale);
    return (
      <>
        {header}
        {leases.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("tenant.empty")}</p>
        ) : (
          <ul className="grid gap-3">
            {leases.map((lease) => (
              <li key={lease.leaseId}>
                <Link
                  href={`/tenant/${lease.leaseId}` as `/${string}`}
                  className="hover:bg-muted block rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{t(`roles.${lease.role}`)}</span>
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

/** One joined lease: a tenant of a signed lease sees their share and who answers for the rent (BR-4). */
export async function TenantLeaseRoute({ id }: { id: string }) {
  const [t, tPortfolio, locale, format] = await Promise.all([
    getTranslations("leases"),
    getTranslations("portfolio"),
    getLocale(),
    getFormatter(),
  ]);
  try {
    const lease = await fetchTenantLease(id, locale);
    const [language, annexes, signing] = await Promise.all([
      lease.role === "OCCUPANT" ? undefined : fetchTenantLanguage(id, locale),
      fetchTenantAnnexes(id, locale),
      lease.role === "OCCUPANT" ? undefined : fetchTenantSigning(id, locale),
    ]);
    const summary = lease.solidaritySummary
      ? locale.startsWith("en")
        ? lease.solidaritySummary.en
        : lease.solidaritySummary.fr
      : undefined;
    return (
      <>
        <PageHeader
          title={t("one.title")}
          description={t(`status.${lease.status}`)}
          breadcrumbs={[
            ...(await crumbs(t("tenant.title"))).slice(0, 1),
            { label: t("tenant.title"), href: "/tenant" as const },
            { label: t("one.title") },
          ]}
        />
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{t(`roles.${lease.role}`)}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {lease.access === "PENDING" ? <Callout tone="info">{t("tenant.pending")}</Callout> : null}
            {summary ? (
              <div>
                <div className="text-muted-foreground">{t("tenant.summary")}</div>
                <p>{summary}</p>
              </div>
            ) : null}
            {lease.shareBasisPoints !== null && lease.shareBasisPoints !== undefined ? (
              <div>
                <div className="text-muted-foreground">{t("tenant.share")}</div>
                <p>{format.number(lease.shareBasisPoints / 10000, { style: "percent", maximumFractionDigits: 2 })}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <TenantAnnexes leaseId={id} annexes={annexes} />
        {signing ? <TenantSigning view={signing} /> : null}
        {language ? <LanguageChoice leaseId={id} state={language} /> : null}
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title={t("tenant.title")} breadcrumbs={await crumbs(t("tenant.title"))} />
        <Callout tone="warning">{tPortfolio(`states.${failureState(error)}`)}</Callout>
      </>
    );
  }
}

/** The page behind an invitation link: the form that joins the lease. */
export async function InvitationRoute({ token }: { token: string }) {
  const t = await getTranslations("leases");
  return (
    <>
      <PageHeader title={t("accept.title")} breadcrumbs={await crumbs(t("accept.title"))} />
      <AcceptInvitationForm token={token} />
    </>
  );
}
