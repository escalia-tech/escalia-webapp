"use client";

import { useState } from "react";

import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

/** Interactive part of the component gallery (tooltips, form controls, retry and toast demos). */
export function GalleryInteractive() {
  const t = useTranslations("gallery");
  const [retries, setRetries] = useState(0);

  return (
    <>
      <section aria-labelledby="g-tooltips" className="space-y-3">
        <h2 id="g-tooltips" className="text-lg font-semibold">
          {t("sections.tooltips")}
        </h2>
        <p className="flex items-center gap-1 text-sm">
          {t("tooltips.caption")}
          <InfoTooltip label={t("tooltips.label")}>{t("tooltips.text")}</InfoTooltip>
        </p>
      </section>

      <section aria-labelledby="g-forms" className="space-y-3">
        <h2 id="g-forms" className="text-lg font-semibold">
          {t("sections.forms")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="g-name">{t("forms.name")}</FieldLabel>
            <Input id="g-name" aria-describedby="g-name-help" />
            <FieldDescription id="g-name-help">{t("forms.nameHelp")}</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="g-invalid">{t("forms.invalid")}</FieldLabel>
            <Input id="g-invalid" aria-invalid aria-describedby="g-invalid-error" />
            <FieldError id="g-invalid-error">{t("forms.nameError")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="g-select">{t("forms.select")}</FieldLabel>
            <Select>
              <SelectTrigger id="g-select" className="w-full">
                <SelectValue placeholder={t("forms.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">A</SelectItem>
                <SelectItem value="b">B</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="g-disabled">{t("forms.disabled")}</FieldLabel>
            <Input id="g-disabled" disabled value={t("forms.disabled")} readOnly />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="g-check" />
            <FieldLabel htmlFor="g-check" className="font-normal">
              {t("forms.checkbox")}
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="g-switch" />
            <FieldLabel htmlFor="g-switch" className="font-normal">
              {t("forms.switch")}
            </FieldLabel>
          </Field>
        </div>
      </section>

      <section aria-labelledby="g-states" className="space-y-3">
        <h2 id="g-states" className="text-lg font-semibold">
          {t("sections.states")}
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border p-4" role="status" aria-busy="true">
            <p className="text-sm font-medium">{t("states.loading")}</p>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <EmptyState icon={Inbox} title={t("states.empty")} description={t("states.emptyBody")} />
          <div className="space-y-2">
            <ErrorState
              title={t("states.error")}
              description={t("states.errorBody")}
              reference="demo-0000-ref"
              onRetry={() => setRetries((count) => count + 1)}
            />
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {t("states.retryCount", { count: retries })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => toast.success(t("states.toastSuccessText"))}>
            {t("states.toastSuccess")}
          </Button>
          <Button type="button" variant="outline" onClick={() => toast.error(t("states.toastErrorText"))}>
            {t("states.toastError")}
          </Button>
        </div>
      </section>
    </>
  );
}
