"use client";

import { useEffect, useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";

import { registerPushAction, removePushAction } from "../server/notifications.actions";

type Support = "checking" | "unsupported" | "ready";

/** The application server key arrives as URL-safe base64; the browser wants bytes. */
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const padded = `${key}${"=".repeat((4 - (key.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

/** Turns web push on or off for this browser. Needs the server's key; iPhone needs the installed app. */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null | undefined }) {
  const t = useTranslations("settings.notifications.channels");
  const [support, setSupport] = useState<Support>("checking");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<"denied" | "failed" | undefined>();
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) {
      setSupport("unsupported");
      return;
    }
    setSupport("ready");
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setActive(Boolean(subscription)))
      .catch(() => setActive(false));
  }, []);

  if (!vapidPublicKey) return <p className="text-muted-foreground text-sm">{t("pushUnavailable")}</p>;
  if (support === "unsupported") return <p className="text-muted-foreground text-sm">{t("pushUnsupported")}</p>;

  const enable = () =>
    start(async () => {
      setMessage(undefined);
      try {
        if ((await Notification.requestPermission()) !== "granted") {
          setMessage("denied");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(vapidPublicKey),
          }));
        const outcome = await registerPushAction(subscription.toJSON());
        if (outcome.status === "done") setActive(true);
        else setMessage("failed");
      } catch {
        setMessage("failed");
      }
    });

  const disable = () =>
    start(async () => {
      setMessage(undefined);
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await removePushAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setActive(false);
      } catch {
        setMessage("failed");
      }
    });

  return (
    <div className="grid gap-2" aria-live="polite">
      {message === "denied" ? <Callout tone="warning">{t("pushDenied")}</Callout> : null}
      {message === "failed" ? <Callout tone="danger">{t("pushFailed")}</Callout> : null}
      {active ? <p className="text-sm">{t("pushActive")}</p> : null}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || support === "checking"}
          onClick={active ? disable : enable}
        >
          {active ? t("pushDisable") : t("pushEnable")}
        </Button>
      </div>
    </div>
  );
}
