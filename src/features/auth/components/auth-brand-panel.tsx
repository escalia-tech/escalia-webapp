"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import authApprovedConcept from "../../../../docs/branding/references/auth-approved-concept.png";

const SIGNATURE_KEY = "escalia_auth_signature";
const SIGNATURE_IDS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
] as const;
type SignatureId = (typeof SIGNATURE_IDS)[number];
const FALLBACK_SIGNATURE: SignatureId = "01";

/** Editorial auth panel using the approved authentication concept artwork. */
export function AuthBrandPanel() {
  const t = useTranslations("auth.editorial");
  const tSignature = useTranslations("auth.editorial.signatures");
  const [signatureId, setSignatureId] = useState<SignatureId>(FALLBACK_SIGNATURE);
  const [isNavigatingSignature, setIsNavigatingSignature] = useState(false);

  useEffect(() => {
    const remembered = sessionStorage.getItem(SIGNATURE_KEY);
    const next = SIGNATURE_IDS.includes(remembered as SignatureId)
      ? (remembered as SignatureId)
      : (SIGNATURE_IDS[Math.floor(Math.random() * SIGNATURE_IDS.length)] ?? FALLBACK_SIGNATURE);
    sessionStorage.setItem(SIGNATURE_KEY, next);
    setSignatureId(next);
  }, []);

  function selectSignature(nextSignatureId: SignatureId) {
    sessionStorage.setItem(SIGNATURE_KEY, nextSignatureId);
    setSignatureId(nextSignatureId);
  }

  function navigateSignature(direction: -1 | 1) {
    if (isNavigatingSignature) return;

    const currentIndex = SIGNATURE_IDS.indexOf(signatureId);
    const nextIndex = (currentIndex + direction + SIGNATURE_IDS.length) % SIGNATURE_IDS.length;
    const nextSignatureId = SIGNATURE_IDS[nextIndex] ?? FALLBACK_SIGNATURE;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      selectSignature(nextSignatureId);
      return;
    }

    setIsNavigatingSignature(true);
    window.setTimeout(() => selectSignature(nextSignatureId), 125);
    window.setTimeout(() => setIsNavigatingSignature(false), 250);
  }

  return (
    <div className="relative flex h-full min-h-[42rem] flex-col overflow-hidden rounded-2xl border border-white/20 bg-secondary p-8 text-secondary-foreground dark:border-border dark:bg-[#151515] xl:p-10">
      <div className="relative z-10 flex items-start justify-between gap-6">
        <p className="max-w-sm text-2xl font-semibold tracking-tight text-balance xl:text-3xl">{t("slogan")}</p>
        <span className="text-muted-foreground whitespace-nowrap text-xs">{t("illustrative")}</span>
      </div>

      <div className="relative my-auto pt-8">
        <div
          className="absolute inset-x-5 bottom-1 h-20 rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-xl border border-foreground/10 bg-background/30 shadow-xl shadow-black/10">
          <Image
            src={authApprovedConcept}
            alt=""
            priority
            className="aspect-[16/10] w-full object-cover dark:brightness-[0.58] dark:saturate-[0.72]"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/35 via-transparent to-transparent dark:from-[#101010]/70" />
        </div>
      </div>

      <section aria-label={t("signatureLabel")} className="relative z-10 mt-12 min-h-60 max-w-md">
        <p
          aria-live="polite"
          className={`text-balance font-semibold text-[1.75rem] leading-tight text-foreground xl:text-[2rem] ${
            isNavigatingSignature ? "opacity-0" : "opacity-100"
          } motion-safe:transition-opacity motion-safe:duration-[125ms]`}
        >
          <span aria-hidden className="mr-1 align-top text-5xl leading-none text-[#E0A526]">
            “
          </span>
          {tSignature(`${signatureId}.main`)}{" "}
          <em className="font-medium text-primary italic">{tSignature(`${signatureId}.accent`)}</em>
        </p>

        <div className="mt-5 h-px w-10 bg-[#E0A526]" aria-hidden />
        <div className="text-muted-foreground mt-4 flex items-center justify-between gap-4 text-sm">
          <span>{t("signatureLabel")}</span>
          <div className="flex items-center">
            <button
              type="button"
              aria-label={t("previousSignature")}
              disabled={isNavigatingSignature}
              onClick={() => navigateSignature(-1)}
              className="hover:bg-muted focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t("nextSignature")}
              disabled={isNavigatingSignature}
              onClick={() => navigateSignature(1)}
              className="hover:bg-muted focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
