import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/features/auth/components/auth-heading";
import { DemoEntry } from "@/features/auth/components/demo-entry";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAuthProviderStatus, getSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Already signed in: skip the form.
  if (await getSession()) {
    redirect({ href: "/dashboard", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
  }
  const t = await getTranslations("auth.login");
  const { demoAvailable } = getAuthProviderStatus();

  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <LoginForm />
      {demoAvailable ? <DemoEntry /> : null}
    </>
  );
}
