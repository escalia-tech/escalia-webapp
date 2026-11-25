"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getClientLogger } from "@/lib/observability/logger/logger.client";

import { type LoginValues, loginSchema } from "../schemas";
import { PasswordField } from "./password-field";
import { TextField } from "./text-field";
import { UnavailableNotice } from "./unavailable-notice";
import { useValidationMessage } from "./use-validation-message";

const logger = getClientLogger("auth");

/**
 * Demonstrative sign-in form. There is no identity provider yet: after validation it states that
 * nothing was sent and no session exists. It never calls the network and never fakes success.
 */
export function LoginForm() {
  const t = useTranslations("auth");
  const message = useValidationMessage();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  function onSubmit() {
    logger.info("auth.login.provider_unavailable", { outcome: "not_configured" });
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <TextField
        label={t("fields.email")}
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={message(errors.email)}
        {...register("email")}
      />
      <PasswordField
        label={t("fields.password")}
        description={t("login.passwordHelp")}
        autoComplete="current-password"
        error={message(errors.password)}
        {...register("password")}
      />
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="hover:text-foreground focus-visible:ring-ring rounded-sm text-sm underline underline-offset-4 focus-visible:ring-2"
        >
          {t("login.forgot")}
        </Link>
      </div>
      {submitted ? <UnavailableNotice /> : null}
      <Button type="submit" className="w-full">
        {t("login.submit")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("login.noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 focus-visible:ring-2"
        >
          {t("login.createAccount")}
        </Link>
      </p>
    </form>
  );
}
