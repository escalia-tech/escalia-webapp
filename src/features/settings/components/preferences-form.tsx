"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type AppLocale, locales } from "@/i18n/routing";
import { bffFetch } from "@/lib/bff-client";
import { useErrorMessage } from "@/lib/use-error-message";

export const TIME_ZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/Winnipeg",
  "America/Regina",
  "America/Edmonton",
  "America/Vancouver",
] as const;

const formSchema = z.object({
  locale: z.enum(locales),
  timezone: z.enum(TIME_ZONES),
});
type FormValues = z.infer<typeof formSchema>;

const THEMES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

interface PreferencesFormProps {
  initialTimezone: string | undefined;
}

export function PreferencesForm({ initialTimezone }: PreferencesFormProps) {
  const t = useTranslations("settings.preferences");
  const tDemo = useTranslations("settings.demoAdapter");
  const tTheme = useTranslations("common.theme");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const toErrorMessage = useErrorMessage();
  const [failure, setFailure] = useState<{ message: string; reference?: string } | null>(null);

  const defaultTimezone = (TIME_ZONES as readonly string[]).includes(initialTimezone ?? "")
    ? (initialTimezone as FormValues["timezone"])
    : "America/Toronto";

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { locale, timezone: defaultTimezone },
  });

  async function onSubmit(values: FormValues) {
    setFailure(null);
    try {
      await bffFetch("/api/bff/preferences", { method: "PUT", body: values });
      toast.success(t("saved"), { description: t("savedDescription") });
      if (values.locale !== locale) {
        router.replace(pathname, { locale: values.locale });
      } else {
        router.refresh();
      }
    } catch (error) {
      setFailure(toErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-describedby={failure ? "preferences-error" : undefined}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Callout tone="info" title={tDemo("title")}>
            {tDemo("body")}
          </Callout>

          {failure ? (
            <Callout id="preferences-error" tone="danger" role="alert" title={t("error")}>
              {failure.message}
              {failure.reference ? (
                <span className="block text-xs">{t("errorReference", { id: failure.reference })}</span>
              ) : null}
            </Callout>
          ) : null}

          <FieldGroup>
            <Controller
              control={control}
              name="locale"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="pref-locale">{t("language.label")}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pref-locale" className="w-full sm:w-72" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`language.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>{t("language.help")}</FieldDescription>
                  <FieldDescription>{t("priority")}</FieldDescription>
                  {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              control={control}
              name="timezone"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="pref-timezone">{t("timezone.label")}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pref-timezone" className="w-full sm:w-72" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ZONES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`timezone.options.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>{t("timezone.help")}</FieldDescription>
                  {errors.timezone ? <FieldError errors={[errors.timezone]} /> : null}
                </Field>
              )}
            />

            <FieldSet>
              <FieldLegend variant="label">{t("theme.label")}</FieldLegend>
              <RadioGroup value={theme ?? "system"} onValueChange={setTheme} className="w-full sm:w-72">
                {THEMES.map(({ value, icon: Icon }) => (
                  <Field key={value} orientation="horizontal">
                    <RadioGroupItem value={value} id={`pref-theme-${value}`} />
                    <FieldContent>
                      <FieldLabel htmlFor={`pref-theme-${value}`} className="font-normal">
                        <Icon className="size-4" aria-hidden />
                        {tTheme(value)}
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                ))}
              </RadioGroup>
              <FieldDescription>{t("theme.help")}</FieldDescription>
            </FieldSet>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t("saving") : t("save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
