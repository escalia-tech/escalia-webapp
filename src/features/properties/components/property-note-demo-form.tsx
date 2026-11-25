"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

const MAX = 280;

/**
 * Reference form (React Hook Form + Zod + accessible errors + unsaved-changes guard).
 * It performs NO network call and persists nothing: there is no notes contract in the backend yet.
 */
export function PropertyNoteDemoForm() {
  const t = useTranslations("properties.detail.note");
  const [validated, setValidated] = useState(false);

  const schema = z.object({
    note: z.string().trim().min(3, t("errors.tooShort")).max(MAX, t("errors.tooLong")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: "" } });

  const length = watch("note").length;

  // Warn before leaving the page with unsaved edits (browser-level confirmation, no custom text).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function onSubmit() {
    setValidated(true);
    toast.success(t("validated"));
    reset({ note: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Field data-invalid={Boolean(errors.note)}>
            <FieldLabel htmlFor="property-note">{t("label")}</FieldLabel>
            <Textarea
              id="property-note"
              rows={4}
              placeholder={t("placeholder")}
              aria-invalid={Boolean(errors.note)}
              aria-describedby="property-note-help property-note-counter"
              {...register("note", { onChange: () => setValidated(false) })}
            />
            <div className="flex items-start justify-between gap-4">
              <FieldDescription id="property-note-help">{t("help")}</FieldDescription>
              <span id="property-note-counter" className="text-muted-foreground text-xs tabular-nums">
                {t("counter", { count: length })}
              </span>
            </div>
            <FieldError errors={[errors.note]} />
            {validated ? (
              <p role="status" className="text-success-foreground text-sm">
                {t("validated")}
              </p>
            ) : null}
          </Field>
        </CardContent>
        <CardFooter className="items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs" aria-live="polite">
            {isDirty ? t("dirty") : ""}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => reset({ note: "" })} disabled={!isDirty}>
              {t("reset")}
            </Button>
            <Button type="submit">{t("submit")}</Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
