"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getClientLogger } from "@/lib/observability/logger/logger.client";

import { type ResetPasswordValues, resetPasswordSchema } from "../schemas";
import { PasswordField } from "./password-field";
import { UnavailableNotice } from "./unavailable-notice";
import { useValidationMessage } from "./use-validation-message";

const logger = getClientLogger("auth");

/**
 * Demonstrative reset form. The reset token is NOT read from the URL here: token issuing and
 * validation belong to the identity provider (not configured), so nothing is sent or stored.
 */
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const message = useValidationMessage();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit() {
    logger.info("auth.reset_password.provider_unavailable", { outcome: "not_configured" });
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Callout tone="info">{t("reset.linkNote")}</Callout>
      <PasswordField
        label={t("fields.newPassword")}
        autoComplete="new-password"
        error={message(errors.password)}
        {...register("password")}
      />
      <PasswordField
        label={t("fields.confirmPassword")}
        autoComplete="new-password"
        error={message(errors.confirmPassword)}
        {...register("confirmPassword")}
      />
      {submitted ? <UnavailableNotice /> : null}
      <Button type="submit" className="w-full">
        {t("reset.submit")}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2"
        >
          {t("reset.back")}
        </Link>
      </p>
    </form>
  );
}
