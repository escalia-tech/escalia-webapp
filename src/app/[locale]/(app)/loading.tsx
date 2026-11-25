import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading UI: a neutral page skeleton announced politely to assistive technology. */
export default function AppLoading() {
  const t = useTranslations("common.a11y");
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-5">
      <span className="sr-only">{t("loading")}</span>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
