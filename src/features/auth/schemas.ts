import { type CountryCode, isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

/**
 * Client-side validation for the demonstrative authentication forms. Error messages are i18n keys
 * under `auth.validation.*` (never literal text). Password strength rules are intentionally NOT
 * invented here: they belong to the identity provider, so only presence is enforced.
 */

const required = z.string().trim().min(1, "required");
const email = z.string().trim().min(1, "required").pipe(z.email("emailInvalid"));
const password = z.string().min(1, "required");

export const loginSchema = z.object({ email, password });
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string().min(1, "required") })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const registerSchema = z
  .object({
    firstName: required.max(80),
    lastName: required.max(80),
    email,
    phoneCountry: z.string().length(2),
    phone: z.string().trim().max(32),
    password,
    acceptTerms: z.boolean().refine((value) => value, "termsRequired"),
  })
  .superRefine((values, context) => {
    if (values.phone.length > 0 && !isValidPhoneNumber(values.phone, values.phoneCountry as CountryCode)) {
      context.addIssue({ code: "custom", path: ["phone"], message: "phoneInvalid" });
    }
  });
export type RegisterValues = z.infer<typeof registerSchema>;

/** E.164 representation of an optional phone number, or null when empty/invalid. */
export function toE164(phone: string, country: string): string | null {
  if (!phone.trim()) return null;
  const parsed = parsePhoneNumberFromString(phone, country as CountryCode);
  return parsed?.isValid() ? parsed.format("E.164") : null;
}
