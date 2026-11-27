import { getLocale, getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { failureState } from "@/server/bff-pages/failure";

import { rowErrorKey } from "../schemas/imports.schema";
import { fetchImport, fetchImports } from "../server/imports.service";
import { MappingForm } from "./mapping-form";
import { RunButton } from "./run-button";
import { UploadForm } from "./upload-form";

async function crumbs(title: string) {
  const tNav = await getTranslations("shell.nav.items");
  return [{ label: tNav("dashboard"), href: "/dashboard" as const }, { label: title }];
}

/** The imports of the organization and the upload of a new file (FR-PORT-03). */
export async function ImportsRoute() {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("imports"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  const header = (
    <PageHeader title={t("title")} description={t("description")} breadcrumbs={await crumbs(t("title"))} />
  );
  try {
    const { items } = await fetchImports(locale);
    return (
      <>
        {header}
        <Card>
          <CardHeader>
            <CardTitle>{t("upload.title")}</CardTitle>
            <CardDescription>{t("upload.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>
        <section className="grid gap-3">
          <h2 className="text-base font-semibold">{t("history")}</h2>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <ul className="grid gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/imports/${item.id}` as `/${string}`}
                    className="hover:bg-muted block rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.fileName}</span>
                      <Badge variant="outline">{t(`status.${item.status}`)}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t("counts.summary", { total: item.counts.total, imported: item.counts.imported })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
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

/** One import: its columns, then what each row would do, then the report. */
export async function ImportRoute({ id }: { id: string }) {
  const [t, tPortfolio, locale] = await Promise.all([
    getTranslations("imports"),
    getTranslations("portfolio"),
    getLocale(),
  ]);
  try {
    const job = await fetchImport(id, locale);
    const header = (
      <PageHeader title={job.fileName} description={t(`status.${job.status}`)} breadcrumbs={await crumbs(t("title"))} />
    );
    const done = job.status === "DONE";
    return (
      <>
        {header}
        {job.status === "UPLOADED" || job.status === "VALIDATED" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("mapping.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MappingForm job={job} />
            </CardContent>
          </Card>
        ) : null}
        {job.rows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{done ? t("report.title") : t("preview.title")}</CardTitle>
              <CardDescription>
                {done
                  ? t("report.summary", { imported: job.counts.imported, failed: job.counts.failed })
                  : t("preview.summary", {
                      valid: job.counts.valid,
                      invalid: job.counts.invalid,
                      duplicate: job.counts.duplicate,
                    })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2">{t("rows.number")}</th>
                      <th className="p-2">{t("rows.address")}</th>
                      <th className="p-2">{t("rows.unit")}</th>
                      <th className="p-2">{t("rows.status")}</th>
                      <th className="p-2">{t("rows.errors")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-b align-top">
                        <td className="p-2">{row.rowNumber}</td>
                        <td className="p-2">{row.address ?? "-"}</td>
                        <td className="p-2">{row.unit ?? "-"}</td>
                        <td className="p-2">
                          <Badge variant="outline">{t(`rowStatus.${row.status}`)}</Badge>
                          {row.leaseId ? (
                            <Link href={`/leases/${row.leaseId}` as `/${string}`} className="ml-2 underline">
                              {t("rows.lease")}
                            </Link>
                          ) : null}
                        </td>
                        <td className="p-2">
                          <ul className="grid gap-0.5">
                            {Object.entries(row.errors).map(([field, code]) => (
                              <li key={field}>{t(`rowErrors.${rowErrorKey(code)}`)}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {job.status === "VALIDATED" ? <RunButton jobId={job.id} count={job.counts.valid} /> : null}
              {done ? (
                <>
                  <Callout tone="info">{t("report.invite")}</Callout>
                  {job.counts.invalid + job.counts.failed > 0 ? (
                    <a href={`/api/bff/imports/errors?jobId=${job.id}`} className="text-sm underline">
                      {t("report.errors")}
                    </a>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </>
    );
  } catch (error) {
    return <Callout tone="warning">{tPortfolio(`states.${failureState(error)}`)}</Callout>;
  }
}
