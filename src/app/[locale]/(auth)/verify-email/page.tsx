import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify");
  return { title: t("title") };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations("auth.verify");
  return (
    <>
      <AuthHeading title={t("title")} subtitle={t("description")} />
      <div className="space-y-4">
        <div className="flex justify-center py-2" aria-hidden>
          <span className="bg-secondary text-secondary-foreground flex size-14 items-center justify-center rounded-full">
            <MailCheck className="size-7" />
          </span>
        </div>
        <Callout tone="info">{t("providerNote")}</Callout>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{t("back")}</Link>
        </Button>
      </div>
    </>
  );
}
