import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");
  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <ForgotPasswordForm />
    </>
  );
}
