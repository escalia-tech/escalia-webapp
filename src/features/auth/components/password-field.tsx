"use client";

import { type ComponentProps, useId, useState } from "react";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface PasswordFieldProps extends Omit<ComponentProps<"input">, "type" | "id"> {
  label: string;
  description?: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
}

/**
 * Password input with an accessible show/hide toggle. The value lives only in the form state (never
 * logged, never persisted, never put in the URL or storage).
 */
export function PasswordField({ label, description, error, autoComplete, ref, ...props }: PasswordFieldProps) {
  const t = useTranslations("auth.fields");
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy =
    [description ? `${id}-desc` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-2"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {description ? <FieldDescription id={`${id}-desc`}>{description}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
