import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/features/auth/components/auth-heading";
import { RegisterForm } from "@/features/auth/components/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth.register");
  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <RegisterForm />
    </>
  );
}
