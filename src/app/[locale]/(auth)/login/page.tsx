import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/features/auth/components/auth-heading";
import { DemoEntry } from "@/features/auth/components/demo-entry";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { safeReturnTo } from "@/lib/return-to";
import { getAuthProviderStatus, getSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  // User-controlled: only an in-app path is accepted.
  const returnTo = safeReturnTo(query.returnTo, "/dashboard");
  // Already signed in: skip the form.
  if (await getSession()) {
    redirect({ href: returnTo, locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
  }
  const t = await getTranslations("auth.login");
  const { demoAvailable } = getAuthProviderStatus();

  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      <LoginForm />
      {demoAvailable ? <DemoEntry returnTo={returnTo} /> : null}
    </>
  );
}
