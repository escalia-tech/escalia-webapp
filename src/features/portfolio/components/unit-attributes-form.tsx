"use client";

import { useActionState } from "react";

import { useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import {
  APPLIANCES,
  ENERGY_SOURCES,
  PARKING_KINDS,
  STORAGE_KINDS,
  TRI,
  UNIT_TYPES,
  type UnitAttributes,
} from "../schemas/unit.schema";
import { saveUnitAttributesAction, type UnitFormState } from "../server/unit.actions";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-primary size-4" />
      {label}
    </label>
  );
}

function Choice({
  name,
  label,
  options,
  value,
  text,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string;
  text: (option: string) => string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect id={name} name={name} defaultValue={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {text(option)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

const cents = (value: number | null | undefined) => (value == null ? "" : String(value / 100).replace(".", ","));

const BLANK: UnitAttributes = {
  typeAndSize: { type: "ROOMS_4_5", area: null },
  included: {
    heatingIncluded: false,
    heatingSource: null,
    hotWaterIncluded: false,
    hotWaterSource: null,
    electricityIncluded: false,
    appliances: [],
    furnished: false,
    snowRemovalIncluded: false,
    lawnIncluded: false,
    otherServices: "",
  },
  parkingAndStorage: {
    parkingKind: "NONE",
    parkingSpaces: 0,
    parkingIncluded: false,
    parkingAmountCents: null,
    storageKind: "NONE",
    storageIncluded: false,
    storageAmountCents: null,
  },
  accessibility: {
    stepFreeEntrance: "UNKNOWN",
    floor: null,
    elevator: "UNKNOWN",
    adaptedBathroom: "UNKNOWN",
    notes: "",
  },
};

/** The four groups of FR-PORT-02, one form, one new version per save. */
export function UnitAttributesForm({ unitId, current }: { unitId: string; current: UnitAttributes | undefined }) {
  const t = useTranslations("portfolio.unit");
  // Enum values select the message: the catalogue holds one entry per value (checked by the parity test).
  const tx = t as unknown as (key: string) => string;
  const [state, action, pending] = useActionState<UnitFormState, FormData>(
    saveUnitAttributesAction.bind(null, unitId),
    undefined,
  );
  const value = current ?? BLANK;
  const { typeAndSize, included, parkingAndStorage: park, accessibility } = value;

  return (
    <form action={action} className="grid gap-5">
      <div aria-live="polite" className="grid gap-2">
        {state?.status === "invalid" ? <Callout tone="danger">{t("invalid")}</Callout> : null}
        {state?.status === "refused" ? <Callout tone="danger">{state.message ?? t("refused")}</Callout> : null}
        {state?.status === "saved" && state.version ? (
          <Callout tone="success">{t("saved", { version: state.version })}</Callout>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("groups.typeAndSize")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Choice
            name="type"
            label={t("fields.type")}
            options={UNIT_TYPES}
            value={typeAndSize.type}
            text={(o) => tx(`types.${o}`)}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="areaValue">{t("fields.area")}</Label>
            <Input id="areaValue" name="areaValue" inputMode="decimal" defaultValue={typeAndSize.area?.value ?? ""} />
          </div>
          <Choice
            name="areaUnit"
            label={t("fields.areaUnit")}
            options={["FT2", "M2"]}
            value={typeAndSize.area?.unit ?? "FT2"}
            text={(o) => tx(`areaUnits.${o}`)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("groups.included")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Check
                name="heatingIncluded"
                label={t("fields.heatingIncluded")}
                defaultChecked={included.heatingIncluded}
              />
              <Choice
                name="heatingSource"
                label={t("fields.source")}
                options={ENERGY_SOURCES}
                value={included.heatingSource ?? "ELECTRICITY"}
                text={(o) => tx(`energy.${o}`)}
              />
            </div>
            <div className="grid gap-2">
              <Check
                name="hotWaterIncluded"
                label={t("fields.hotWaterIncluded")}
                defaultChecked={included.hotWaterIncluded}
              />
              <Choice
                name="hotWaterSource"
                label={t("fields.source")}
                options={ENERGY_SOURCES}
                value={included.hotWaterSource ?? "ELECTRICITY"}
                text={(o) => tx(`energy.${o}`)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Check
              name="electricityIncluded"
              label={t("fields.electricityIncluded")}
              defaultChecked={included.electricityIncluded}
            />
            <Check name="furnished" label={t("fields.furnished")} defaultChecked={included.furnished} />
            <Check
              name="snowRemovalIncluded"
              label={t("fields.snowRemovalIncluded")}
              defaultChecked={included.snowRemovalIncluded}
            />
            <Check name="lawnIncluded" label={t("fields.lawnIncluded")} defaultChecked={included.lawnIncluded} />
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t("fields.appliances")}</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {APPLIANCES.map((appliance) => (
                <label key={appliance} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="appliances"
                    value={appliance}
                    defaultChecked={included.appliances.includes(appliance)}
                    className="accent-primary size-4"
                  />
                  {tx(`appliance.${appliance}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="otherServices">{t("fields.otherServices")}</Label>
            <Textarea id="otherServices" name="otherServices" maxLength={500} defaultValue={included.otherServices} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("groups.parkingStorage")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Choice
              name="parkingKind"
              label={t("fields.parkingKind")}
              options={PARKING_KINDS}
              value={park.parkingKind}
              text={(o) => tx(`parkingKinds.${o}`)}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="parkingSpaces">{t("fields.parkingSpaces")}</Label>
              <Input id="parkingSpaces" name="parkingSpaces" inputMode="numeric" defaultValue={park.parkingSpaces} />
            </div>
            <Check name="parkingIncluded" label={t("fields.parkingIncluded")} defaultChecked={park.parkingIncluded} />
            <div className="grid gap-1.5">
              <Label htmlFor="parkingAmount">{t("fields.parkingAmount")}</Label>
              <Input
                id="parkingAmount"
                name="parkingAmount"
                inputMode="decimal"
                defaultValue={cents(park.parkingAmountCents)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Choice
              name="storageKind"
              label={t("fields.storageKind")}
              options={STORAGE_KINDS}
              value={park.storageKind}
              text={(o) => tx(`storageKinds.${o}`)}
            />
            <Check name="storageIncluded" label={t("fields.storageIncluded")} defaultChecked={park.storageIncluded} />
            <div className="grid gap-1.5">
              <Label htmlFor="storageAmount">{t("fields.storageAmount")}</Label>
              <Input
                id="storageAmount"
                name="storageAmount"
                inputMode="decimal"
                defaultValue={cents(park.storageAmountCents)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("groups.accessibility")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Choice
            name="stepFreeEntrance"
            label={t("fields.stepFreeEntrance")}
            options={TRI}
            value={accessibility.stepFreeEntrance}
            text={(o) => tx(`tri.${o}`)}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="floor">{t("fields.floor")}</Label>
            <Input id="floor" name="floor" inputMode="numeric" defaultValue={accessibility.floor ?? ""} />
          </div>
          <Choice
            name="elevator"
            label={t("fields.elevator")}
            options={TRI}
            value={accessibility.elevator}
            text={(o) => tx(`tri.${o}`)}
          />
          <Choice
            name="adaptedBathroom"
            label={t("fields.adaptedBathroom")}
            options={TRI}
            value={accessibility.adaptedBathroom}
            text={(o) => tx(`tri.${o}`)}
          />
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">{t("fields.notes")}</Label>
            <Textarea id="notes" name="notes" maxLength={500} defaultValue={accessibility.notes} />
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">{t("futureLeases")}</p>
      <div>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
