import { getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

import { signingPath, type TenantSigning as View } from "../schemas/signing.schema";

/** FR-LEASE-04 section 9: a party sees names and states only, and the way to sign when it is their turn. */
export async function TenantSigning({ view }: { view: View }) {
  const t = await getTranslations("leases");
  if (!view.requestId) return null;
  const path = signingPath(view);
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("signing.tenantTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {view.state ? <p className="font-medium">{t(`signing.state.${view.state}`)}</p> : null}
        <ul className="grid gap-1">
          {view.signers.map((signer) => (
            <li key={signer.personId} className="flex flex-wrap justify-between gap-2">
              <span>{signer.name}</span>
              <span className="text-muted-foreground">{t(`signing.signerState.${signer.state}`)}</span>
            </li>
          ))}
        </ul>
        {view.myState === "SIGNED" ? <Callout tone="success">{t("signing.signed")}</Callout> : null}
        {view.myState === "WAITING" ? <Callout tone="info">{t("signing.waiting")}</Callout> : null}
        {path ? (
          <>
            <p className="text-muted-foreground">{t("signing.signHint")}</p>
            <div>
              <Link href={path as never} className={buttonVariants()}>
                {t("signing.sign")}
              </Link>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
