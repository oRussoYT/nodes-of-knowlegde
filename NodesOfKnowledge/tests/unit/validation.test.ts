import { describe, expect, it } from "vitest";

import {
  sanitizeReturnTo,
  validateEmail,
  validateLogin,
  validatePassword,
  validatePasswordConfirmation,
  validateRegistration,
} from "../../src/lib/auth/validation";

describe("validateEmail", () => {
  it("rejects empty input", () => {
    expect(validateEmail(null)).toBe("Enter your email address.");
    expect(validateEmail("")).toBe("Enter your email address.");
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("not-an-email")).toMatch(/valid email/);
    expect(validateEmail("missing-domain@")).toMatch(/valid email/);
  });

  it("accepts a well-formed address", () => {
    expect(validateEmail("person@example.com")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("abc123")).toMatch(/at least 8/);
  });

  it("rejects passwords without both a letter and a number", () => {
    expect(validatePassword("alllettersnodigits")).toMatch(/letter and one number/);
    expect(validatePassword("12345678")).toMatch(/letter and one number/);
  });

  it("rejects passwords over the max length", () => {
    expect(validatePassword("a1".repeat(40))).toMatch(/72 characters or fewer/);
  });

  it("accepts a valid password", () => {
    expect(validatePassword("correcthorse1")).toBeNull();
  });
});

describe("validatePasswordConfirmation", () => {
  it("requires a non-empty confirmation", () => {
    expect(validatePasswordConfirmation("correcthorse1", "")).toMatch(/Confirm your password/);
  });

  it("requires the confirmation to match", () => {
    expect(validatePasswordConfirmation("correcthorse1", "different1")).toMatch(/do not match/);
  });

  it("accepts a matching confirmation", () => {
    expect(validatePasswordConfirmation("correcthorse1", "correcthorse1")).toBeNull();
  });
});

describe("validateRegistration", () => {
  it("requires terms acceptance even when email/password are valid", () => {
    const result = validateRegistration({
      email: "person@example.com",
      password: "correcthorse1",
      confirmPassword: "correcthorse1",
      termsAccepted: null,
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.termsAccepted).toBeDefined();
  });

  it("normalizes email casing/whitespace on success", () => {
    const result = validateRegistration({
      email: "  Person@Example.com ",
      password: "correcthorse1",
      confirmPassword: "correcthorse1",
      termsAccepted: "on",
    });

    expect(result.ok).toBe(true);
    expect(result.value?.email).toBe("person@example.com");
  });

  it("collects every field error at once rather than stopping at the first", () => {
    const result = validateRegistration({
      email: "not-an-email",
      password: "short",
      confirmPassword: "different",
      termsAccepted: null,
    });

    expect(result.ok).toBe(false);
    // "short" and "different" are also a mismatched confirmation, on top of
    // being an invalid password on its own — both errors must surface
    // together, not just the password-strength one. See the bug-fix
    // comment above validateRegistration's confirmation check.
    expect(Object.keys(result.fieldErrors).sort()).toEqual(
      ["confirmPassword", "email", "password", "termsAccepted"].sort(),
    );
  });
});

describe("validateLogin", () => {
  it("requires both fields", () => {
    const result = validateLogin({ email: null, password: null });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
  });

  it("accepts valid input and normalizes the email", () => {
    const result = validateLogin({ email: "Person@Example.com", password: "anything" });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ email: "person@example.com", password: "anything" });
  });
});

describe("sanitizeReturnTo", () => {
  it("falls back for empty/missing input", () => {
    expect(sanitizeReturnTo(null)).toBe("/member");
    expect(sanitizeReturnTo(undefined, "/custom")).toBe("/custom");
    expect(sanitizeReturnTo("")).toBe("/member");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeReturnTo("//evil.example/path")).toBe("/member");
  });

  it("rejects absolute URLs, including one hidden in a query value", () => {
    expect(sanitizeReturnTo("https://evil.example")).toBe("/member");
    expect(sanitizeReturnTo("/redirect?to=https://evil.example")).toBe("/member");
  });

  it("rejects backslash tricks", () => {
    expect(sanitizeReturnTo("/\\evil.example")).toBe("/member");
  });

  it("rejects a path that doesn't start with a single slash", () => {
    expect(sanitizeReturnTo("member")).toBe("/member");
  });

  it("accepts a plain relative path", () => {
    expect(sanitizeReturnTo("/account")).toBe("/account");
  });

  it("accepts a relative path with a query string", () => {
    expect(sanitizeReturnTo("/update-password?ok=1")).toBe("/update-password?ok=1");
  });
});
