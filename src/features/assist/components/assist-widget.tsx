"use client";

import { useState } from "react";

import { BookOpen, BotMessageSquare, ChevronLeft, CircleHelp, Mail, MessageCircleMore, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AssistView = "home" | "help" | "faq" | "contact" | "conversation";
type ResourceKey = "helpTitle" | "faqTitle" | "contactTitle" | "conversationTitle";
type ResourceBodyKey = "helpBody" | "faqBody" | "contactBody" | "conversationBody";

const VIEWS: Record<
  Exclude<AssistView, "home">,
  { icon: typeof BookOpen; title: ResourceKey; body: ResourceBodyKey }
> = {
  help: { icon: BookOpen, title: "helpTitle", body: "helpBody" },
  faq: { icon: CircleHelp, title: "faqTitle", body: "faqBody" },
  contact: { icon: Mail, title: "contactTitle", body: "contactBody" },
  conversation: { icon: BotMessageSquare, title: "conversationTitle", body: "conversationBody" },
};

/**
 * Local, presentation-only assistance shell. It deliberately has no network calls, no stored
 * context and no active conversation while a support provider has not been selected.
 */
export function AssistWidget() {
  const t = useTranslations("assist");
  const tResource = useTranslations("assist.resource");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AssistView>("home");
  const detail = view === "home" ? null : VIEWS[view];

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setView("home");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon-lg"
            aria-label={t("launcher.label")}
            className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/15 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
            onClick={() => setOpen(true)}
          >
            <MessageCircleMore className="size-6" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>
          {t("launcher.tooltip")}
        </TooltipContent>
      </Tooltip>

      <SheetContent
        side="right"
        aria-describedby="assist-description"
        className="h-[min(560px,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-[min(100%,23.75rem)] gap-0 overflow-hidden rounded-l-xl border bg-popover p-0 sm:right-4 sm:top-auto sm:bottom-4 sm:h-[min(560px,calc(100dvh-2rem))] sm:rounded-xl sm:border"
      >
        <SheetHeader className="border-b p-5 pr-12">
          <SheetTitle className="flex items-center gap-2">
            <span className="relative inline-flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Sparkles className="size-4" aria-hidden />
            </span>
            {t("panel.title")}
          </SheetTitle>
          <SheetDescription id="assist-description" className="sr-only">
            {t("home.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {detail ? (
            <section className="space-y-5" aria-labelledby="assist-resource-title">
              <Button variant="ghost" size="sm" onClick={() => setView("home")} className="-ml-2">
                <ChevronLeft aria-hidden />
                {t("panel.back")}
              </Button>
              <div className="space-y-2">
                <span className="text-info-foreground bg-info-surface border-info-border inline-flex rounded-full border px-2 py-1 text-xs font-medium">
                  {t("resource.demo")}
                </span>
                <detail.icon className="text-primary mt-3 size-7" aria-hidden />
                <h2 id="assist-resource-title" className="text-xl font-semibold tracking-tight">
                  {tResource(detail.title)}
                </h2>
                <p className="text-muted-foreground leading-6">{tResource(detail.body)}</p>
              </div>
            </section>
          ) : (
            <section aria-labelledby="assist-home-title">
              <h2 id="assist-home-title" className="text-xl font-semibold tracking-tight">
                {t("home.welcome")}
              </h2>
              <p className="text-muted-foreground mt-2 leading-6">{t("home.description")}</p>
              <div className="mt-6 grid gap-2">
                {(Object.keys(VIEWS) as Exclude<AssistView, "home">[]).map((key) => {
                  const item = VIEWS[key];
                  const Icon = item.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setView(key)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition-colors",
                        "hover:bg-muted focus-visible:ring-ring outline-none focus-visible:ring-2",
                      )}
                    >
                      <Icon className="text-primary size-4" aria-hidden />
                      <span className="flex-1">{t(`home.${key}`)}</span>
                      {key === "conversation" ? (
                        <span className="text-muted-foreground text-xs font-normal">{t("home.soon")}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
