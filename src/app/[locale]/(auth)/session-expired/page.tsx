import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feedback.status.sessionExpired");
  return { title: t("title") };
}

export default async function SessionExpiredPage() {
  const [t, tAuth, tStatus] = await Promise.all([
    getTranslations("feedback.status.sessionExpired"),
    getTranslations("auth.sessionExpired"),
    getTranslations("feedback.status"),
  ]);
  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("description")} />
      <div className="space-y-4">
        <div className="flex justify-center py-2" aria-hidden>
          <span className="bg-secondary text-secondary-foreground flex size-14 items-center justify-center rounded-full">
            <Clock className="size-7" />
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{tAuth("hint")}</p>
        <Button asChild className="w-full">
          <Link href="/login">{tStatus("toLogin")}</Link>
        </Button>
      </div>
    </>
  );
}
