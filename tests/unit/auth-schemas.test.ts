import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  toE164,
} from "@/features/auth/schemas";

const validRegistration = {
  firstName: "Camille",
  lastName: "Démo",
  email: "camille@example.org",
  phoneCountry: "CA",
  phone: "",
  password: "x",
  acceptTerms: true,
};

describe("auth schemas", () => {
  it("requires email and password on login and returns i18n keys as messages", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["required"]));
  });

  it("flags an invalid email with its own key", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).error?.issues[0]?.message).toBe("emailInvalid");
  });

  it("does not invent password strength rules", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "a" }).success).toBe(true);
  });

  it("checks that reset passwords match", () => {
    const result = resetPasswordSchema.safeParse({ password: "a", confirmPassword: "b" });
    expect(result.error?.issues[0]).toMatchObject({ message: "passwordMismatch", path: ["confirmPassword"] });
    expect(resetPasswordSchema.safeParse({ password: "a", confirmPassword: "a" }).success).toBe(true);
  });

  it("accepts a registration without phone and requires the terms", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
    const result = registerSchema.safeParse({ ...validRegistration, acceptTerms: false });
    expect(result.error?.issues[0]?.message).toBe("termsRequired");
  });

  it("validates the optional phone against the chosen country", () => {
    expect(registerSchema.safeParse({ ...validRegistration, phone: "514 555 0199" }).success).toBe(true);
    const bad = registerSchema.safeParse({ ...validRegistration, phone: "12" });
    expect(bad.error?.issues[0]).toMatchObject({ message: "phoneInvalid", path: ["phone"] });
  });

  it("normalises a phone number to E.164", () => {
    expect(toE164("(514) 555-0199", "CA")).toBe("+15145550199");
    expect(toE164("", "CA")).toBeNull();
    expect(toE164("12", "CA")).toBeNull();
    expect(toE164("06 12 34 56 78", "FR")).toBe("+33612345678");
  });
});
