"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";

import { createLeaseAction } from "../server/leases.actions";

/** Starts a lease draft on a unit; on success the action redirects to the draft. */
export function CreateLeaseButton({ unitId }: { unitId: string }) {
  const t = useTranslations("leases");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState<string | undefined>();
  return (
    <div className="grid gap-2">
      {failed ? <Callout tone="danger">{failed}</Callout> : null}
      <div>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const outcome = await createLeaseAction(unitId);
              if (outcome?.status === "refused") setFailed(outcome.message ?? t("refused"));
              else if (outcome?.status === "invalid") setFailed(t("invalid.id"));
            })
          }
        >
          {t("create")}
        </Button>
      </div>
    </div>
  );
}
