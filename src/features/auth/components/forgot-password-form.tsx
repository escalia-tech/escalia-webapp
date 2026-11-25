"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getClientLogger } from "@/lib/observability/logger/logger.client";

import { type ForgotPasswordValues, forgotPasswordSchema } from "../schemas";
import { TextField } from "./text-field";
import { UnavailableNotice } from "./unavailable-notice";
import { useValidationMessage } from "./use-validation-message";

const logger = getClientLogger("auth");

/** Demonstrative recovery request. Never claims an email was sent (no provider, no network call). */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const message = useValidationMessage();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  function onSubmit() {
    logger.info("auth.forgot_password.provider_unavailable", { outcome: "not_configured" });
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
      {submitted ? <UnavailableNotice /> : null}
      <Button type="submit" className="w-full">
        {t("forgot.submit")}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2"
        >
          {t("forgot.back")}
        </Link>
      </p>
    </form>
  );
}
