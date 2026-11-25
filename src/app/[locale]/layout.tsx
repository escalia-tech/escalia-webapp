import type { ReactNode } from "react";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { APP_CONFIG } from "@/config/app-config";
import { LOCALE_META } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { CORRELATION_ID_HEADER } from "@/lib/observability/tracing/correlation";
import { AppProviders } from "@/providers/app-providers";
import { getServerEnv } from "@/server/config/env";

import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    metadataBase: new URL(getServerEnv().appUrl ?? APP_CONFIG.fallbackUrl),
    title: { default: t("meta.title"), template: `%s · ${APP_CONFIG.name}` },
    description: t("meta.description"),
    applicationName: APP_CONFIG.name,
    icons: {
      icon: [
        { url: "/branding/favicon/favicon.svg", type: "image/svg+xml" },
        { url: "/branding/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/branding/favicon/favicon.ico", sizes: "any" },
      ],
      apple: [{ url: "/branding/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const [requestHeaders, messages] = await Promise.all([headers(), getMessages()]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const env = getServerEnv();

  // Legal texts are only needed on their own pages (rendered on the server); keep them out of the client payload.
  const { legal: _legal, ...clientMessages } = messages as Record<string, unknown>;

  return (
    <html lang={LOCALE_META[locale].htmlLang} className={fontVariables} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <AppProviders
            nonce={nonce}
            clientLogging={{
              enabled: env.clientLoggingEnabled,
              level: env.clientLogLevel,
              environment: env.appEnv,
              correlationId: requestHeaders.get(CORRELATION_ID_HEADER) ?? undefined,
            }}
          >
            {children}
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
