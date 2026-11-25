import { Fragment, type ReactNode } from "react";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

export interface BreadcrumbEntry {
  label: string;
  /** Locale-less path, e.g. `/properties`. Omit for the current page. */
  href?: `/${string}`;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
  /** Primary and secondary actions, right aligned on wide screens. */
  actions?: ReactNode;
  /** Show the "fictional data" label (the page is fed by demo fixtures). */
  demoData?: boolean;
}

/** Page title block shared by every screen: breadcrumb, h1, description, actions and demo label. */
export function PageHeader({ title, description, breadcrumbs, actions, demoData = false }: PageHeaderProps) {
  const tShell = useTranslations("shell.breadcrumb");
  const tCommon = useTranslations("common.demo");

  return (
    <div className="mb-5 flex flex-col gap-3">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb aria-label={tShell("label")}>
          <BreadcrumbList className="text-[13px]">
            {breadcrumbs.map((entry, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${entry.label}-${index}`}>
                  <BreadcrumbItem>
                    {isLast || !entry.href ? (
                      <BreadcrumbPage>{entry.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={entry.href}>{entry.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {isLast ? null : <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{title}</h1>
            {demoData ? (
              <Badge variant="secondary" title={tCommon("description")}>
                {tCommon("badge")}
              </Badge>
            ) : null}
          </div>
          {description ? <p className="text-muted-foreground mt-1 max-w-3xl text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
