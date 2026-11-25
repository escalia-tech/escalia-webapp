import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.reset");
  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <ResetPasswordForm />
    </>
  );
}
