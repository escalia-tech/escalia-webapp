"use client";

import { type ReactNode, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { getClientLogger } from "@/lib/observability/logger/logger.client";

import { type RegisterValues, registerSchema } from "../schemas";
import { PasswordField } from "./password-field";
import { PhoneField } from "./phone-field";
import { TextField } from "./text-field";
import { UnavailableNotice } from "./unavailable-notice";
import { useValidationMessage } from "./use-validation-message";

const logger = getClientLogger("auth");

function LegalLink({ href, children }: { href: "/terms" | "/privacy"; children: ReactNode }) {
  const t = useTranslations("auth.shell");
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className="focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 focus-visible:ring-2"
    >
      {children}
      <span className="sr-only"> {t("newTab")}</span>
    </Link>
  );
}

/**
 * Demonstrative sign-up form: first name, last name, email, optional international phone, password
 * and terms. No role, organisation or subscription is requested or implied. Nothing is sent.
 */
export function RegisterForm() {
  const t = useTranslations("auth");
  const message = useValidationMessage();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneCountry: "CA",
      phone: "",
      password: "",
      acceptTerms: false,
    },
  });

  function onSubmit() {
    logger.info("auth.register.provider_unavailable", { outcome: "not_configured" });
    setSubmitted(true);
  }

  const termsError = message(errors.acceptTerms);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("fields.firstName")}
          autoComplete="given-name"
          error={message(errors.firstName)}
          {...register("firstName")}
        />
        <TextField
          label={t("fields.lastName")}
          autoComplete="family-name"
          error={message(errors.lastName)}
          {...register("lastName")}
        />
      </div>
      <TextField
        label={t("fields.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        error={message(errors.email)}
        {...register("email")}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Controller
            control={control}
            name="phoneCountry"
            render={({ field: country }) => (
              <PhoneField
                country={country.value}
                number={field.value}
                onCountryChange={country.onChange}
                onNumberChange={field.onChange}
                onBlur={field.onBlur}
                error={message(errors.phone)}
              />
            )}
          />
        )}
      />
      <PasswordField
        label={t("fields.password")}
        description={t("register.passwordHelp")}
        autoComplete="new-password"
        error={message(errors.password)}
        {...register("password")}
      />

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field }) => (
          <Field orientation="horizontal" data-invalid={Boolean(termsError)}>
            <Checkbox
              id="accept-terms"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              aria-invalid={Boolean(termsError)}
              aria-describedby={termsError ? "accept-terms-error" : undefined}
            />
            <FieldContent>
              <FieldLabel htmlFor="accept-terms" className="block leading-5 font-normal">
                {t.rich("register.terms", {
                  terms: (chunks) => <LegalLink href="/terms">{chunks}</LegalLink>,
                  privacy: (chunks) => <LegalLink href="/privacy">{chunks}</LegalLink>,
                })}
              </FieldLabel>
              {termsError ? <FieldError id="accept-terms-error">{termsError}</FieldError> : null}
            </FieldContent>
          </Field>
        )}
      />

      {submitted ? <UnavailableNotice /> : null}
      <Button type="submit" className="w-full">
        {t("register.submit")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("register.haveAccount")}{" "}
        <Link
          href="/login"
          className="text-foreground focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 focus-visible:ring-2"
        >
          {t("register.signIn")}
        </Link>
      </p>
    </form>
  );
}
