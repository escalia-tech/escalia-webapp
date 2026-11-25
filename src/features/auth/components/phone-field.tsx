"use client";

import { useId, useMemo, useSyncExternalStore } from "react";

import { type CountryCode, getCountries, getCountryCallingCode } from "libphonenumber-js";
import { useLocale, useTranslations } from "next-intl";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { toE164 } from "../schemas";

interface PhoneFieldProps {
  country: string;
  number: string;
  onCountryChange: (country: string) => void;
  onNumberChange: (number: string) => void;
  onBlur?: () => void;
  error?: string;
}

/** Optional international phone field: country calling code + national number, normalised to E.164. */
export function PhoneField({ country, number, onCountryChange, onNumberChange, onBlur, error }: PhoneFieldProps) {
  const t = useTranslations("auth.register.phone");
  const locale = useLocale();
  const id = useId();

  // Country names come from the runtime's ICU data, which can differ between Node and the browser.
  // To avoid a hydration mismatch the full list is built on the client only; the server (and the
  // first client render) only contains the selected country.
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const options = useMemo(() => {
    if (!hydrated) return [{ code: country, label: `${country} (+${getCountryCallingCode(country as CountryCode)})` }];
    const names = new Intl.DisplayNames(locale, { type: "region" });
    return getCountries()
      .map((code) => ({ code, label: `${names.of(code) ?? code} (+${getCountryCallingCode(code)})` }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [hydrated, locale, country]);

  const e164 = toE164(number, country);
  const describedBy = [`${id}-desc`, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={`${id}-number`}>
        {t("label")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
      </FieldLabel>
      <div className="flex gap-2">
        <NativeSelect
          className="w-40 shrink-0 sm:w-52"
          aria-label={t("country")}
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          onBlur={onBlur}
          autoComplete="country"
        >
          {options.map((option) => (
            <NativeSelectOption key={option.code} value={option.code}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          id={`${id}-number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-label={t("number")}
        />
      </div>
      <FieldDescription id={`${id}-desc`}>{e164 ? t("normalized", { value: e164 }) : t("help")}</FieldDescription>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
