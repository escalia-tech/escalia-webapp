import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { failureState, isMissingOrganization } from "@/server/bff-pages/failure";

import { fetchOrganization } from "../server/organization.service";
import { CreateOrganizationCard } from "./create-organization-card";
import { RenameOrganizationForm } from "./rename-organization-form";

/** Settings → Organization (FR-PORT-01): the name, who manages it, and creating it when there is none. */
export async function OrganizationRoute() {
  const [t, locale, format] = await Promise.all([
    getTranslations("organization.settings"),
    getLocale(),
    getFormatter(),
  ]);
  try {
    const organization = await fetchOrganization(locale);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {organization.role === "OWNER" ? (
            <RenameOrganizationForm name={organization.name} />
          ) : (
            <dl className="grid gap-1">
              <dt className="text-muted-foreground text-sm">{t("name")}</dt>
              <dd className="text-sm font-medium">{organization.name}</dd>
            </dl>
          )}
          <section aria-labelledby="organization-members" className="grid gap-2">
            <h3 id="organization-members" className="text-sm font-semibold">
              {t("members")}
            </h3>
            <ul className="grid gap-2 text-sm">
              {organization.members.map((member) => (
                <li key={member.personId} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{member.displayName}</span>
                  <span className="text-muted-foreground flex items-center gap-2">
                    {member.acceptedAt
                      ? t("since", { date: format.dateTime(new Date(member.acceptedAt), { dateStyle: "medium" }) })
                      : null}
                    <Badge variant="outline">{t(`roles.${member.role}`)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (isMissingOrganization(error)) return <CreateOrganizationCard />;
    return <Callout tone="warning">{t(`states.${failureState(error)}`)}</Callout>;
  }
}
