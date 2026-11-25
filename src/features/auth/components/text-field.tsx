"use client";

import { type ComponentProps, useId } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface TextFieldProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  description?: string;
  error?: string;
  optionalLabel?: string;
}

/** Labelled input with description and error wired through aria-describedby / aria-invalid. */
export function TextField({ label, description, error, optionalLabel, ref, ...props }: TextFieldProps) {
  const id = useId();
  const describedBy =
    [description ? `${id}-desc` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>
        {label}
        {optionalLabel ? <span className="text-muted-foreground font-normal">({optionalLabel})</span> : null}
      </FieldLabel>
      <Input {...props} ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      {description ? <FieldDescription id={`${id}-desc`}>{description}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
