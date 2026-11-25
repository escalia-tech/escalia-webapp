import { cookies } from "next/headers";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PreferencesForm } from "@/features/settings/components/preferences-form";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readPreferencesCookie } from "@/server/preferences/preferences-cookie";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.preferences");
  return { title: t("title") };
}

export default async function PreferencesPage() {
  const store = await cookies();
  const preferences = readPreferencesCookie(store.get(COOKIE_NAMES.preferences)?.value);
  return <PreferencesForm initialTimezone={preferences.timezone} />;
}
