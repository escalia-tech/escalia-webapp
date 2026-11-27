import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/features/auth/components/auth-heading";
import { DemoEntry } from "@/features/auth/components/demo-entry";
import { DevSignIn } from "@/features/auth/components/dev-sign-in";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { safeReturnTo } from "@/lib/return-to";
import { hasBffSession } from "@/server/auth/bff-session";
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
  // Already signed in, here and at the BFF: skip the form. A webapp session whose BFF session is gone shows the form.
  if ((await getSession()) && (await hasBffSession(locale))) {
    redirect({ href: returnTo, locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
  }
  const t = await getTranslations("auth.login");
  const { demoAvailable, devSignInAvailable } = getAuthProviderStatus();

  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("subtitle")} />
      {devSignInAvailable ? <DevSignIn returnTo={returnTo} /> : null}
      <LoginForm />
      {demoAvailable && !devSignInAvailable ? <DemoEntry returnTo={returnTo} /> : null}
    </>
  );
}
