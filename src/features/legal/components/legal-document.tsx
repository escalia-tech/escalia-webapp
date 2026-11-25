import { getTranslations } from "next-intl/server";

import { Callout } from "@/components/feedback/callout";

const SECTIONS = {
  privacy: ["scope", "collection", "cookies", "rights", "contact", "changes"],
  terms: ["scope", "account", "use", "demo", "liability", "changes"],
} as const;

/**
 * Provisional legal text rendered from the `legal` message domain (server only; kept out of the client
 * bundle). The provisional banner is always shown: these texts are NOT legally validated.
 */
export async function LegalDocument({ kind }: { kind: "privacy" | "terms" }) {
  const [t, tDoc] = await Promise.all([getTranslations("legal"), getTranslations(`legal.${kind}`)]);
  const sections = SECTIONS[kind];

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{tDoc("title")}</h1>
        <p className="text-muted-foreground text-sm">{tDoc("updated")}</p>
      </header>

      <Callout tone="warning" title={t("provisional.title")}>
        {t("provisional.body")}
      </Callout>

      <nav aria-label={t("toc")} className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-semibold">{t("toc")}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sections.map((key) => (
            <li key={key}>
              <a
                href={`#${key}`}
                className="focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2"
              >
                {tDoc(`sections.${key}.heading` as never)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-6">
        {sections.map((key) => (
          <section key={key} id={key} aria-labelledby={`${key}-heading`} className="scroll-mt-6 space-y-2">
            <h2 id={`${key}-heading`} className="text-xl font-semibold">
              {tDoc(`sections.${key}.heading` as never)}
            </h2>
            <p className="text-muted-foreground leading-7">{tDoc(`sections.${key}.body` as never)}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
