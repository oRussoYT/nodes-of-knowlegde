// Small, dependency-free validation for the auth forms in this milestone.
//
// No validation library was added for this: the forms are simple (email,
// password, a confirmation field, a checkbox), and CLAUDE.md asks that new
// dependencies be justified. These are plain, synchronous, easily
// unit-tested functions instead — see docs/authentication-implementation.md
// ("Validation approach") for the reasoning.
//
// Every function here is pure (no I/O, no Supabase calls) so it can be unit
// tested without a running Supabase instance — see tests/unit/validation.test.ts.

import { PASSWORD_POLICY } from "./password-policy";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FieldErrors {
  [field: string]: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  fieldErrors: FieldErrors;
}

/** Trims and lower-cases an email address for consistent comparison/storage. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(rawEmail: FormDataEntryValue | null): string | null {
  const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";

  if (!email) {
    return "Enter your email address.";
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }

  return null;
}

/**
 * Validates password strength against `PASSWORD_POLICY`
 * (src/lib/auth/password-policy.ts), which is kept in sync by hand with
 * `supabase/config.toml`'s `[auth] minimum_password_length`/
 * `password_requirements` — so a password accepted here is always also
 * accepted by Supabase Auth itself, and the UI hint text
 * (`PASSWORD_POLICY_HINT`) never promises something this function doesn't
 * enforce.
 */
export function validatePassword(rawPassword: FormDataEntryValue | null): string | null {
  const password = typeof rawPassword === "string" ? rawPassword : "";

  if (!password) {
    return "Enter a password.";
  }

  if (password.length < PASSWORD_POLICY.minLength) {
    return `Password must be at least ${PASSWORD_POLICY.minLength} characters.`;
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    return `Password must be ${PASSWORD_POLICY.maxLength} characters or fewer.`;
  }

  if (
    PASSWORD_POLICY.requireLetterAndDigit &&
    (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
  ) {
    return "Password must include at least one letter and one number.";
  }

  return null;
}

export function validatePasswordConfirmation(
  rawPassword: FormDataEntryValue | null,
  rawConfirmation: FormDataEntryValue | null,
): string | null {
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const confirmation = typeof rawConfirmation === "string" ? rawConfirmation : "";

  if (!confirmation) {
    return "Confirm your password.";
  }

  if (password !== confirmation) {
    return "Passwords do not match.";
  }

  return null;
}

export interface RegistrationInput {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  confirmPassword: FormDataEntryValue | null;
  termsAccepted: FormDataEntryValue | null;
}

export interface RegistrationValue {
  email: string;
  password: string;
}

export function validateRegistration(
  input: RegistrationInput,
): ValidationResult<RegistrationValue> {
  const fieldErrors: FieldErrors = {};

  const emailError = validateEmail(input.email);
  if (emailError) fieldErrors.email = emailError;

  const passwordError = validatePassword(input.password);
  if (passwordError) fieldErrors.password = passwordError;

  // Checked unconditionally — not only when the password itself is
  // otherwise valid. A mismatched confirmation is a distinct, independent
  // problem from password strength, and hiding it just because the
  // password is also too weak/malformed left a real bug: a user who typed
  // a short password AND a different confirmation only ever saw the
  // length error, never "Passwords do not match." (see
  // tests/unit/validation.test.ts, "collects every field error at once").
  const confirmError = validatePasswordConfirmation(input.password, input.confirmPassword);
  if (confirmError) fieldErrors.confirmPassword = confirmError;

  if (input.termsAccepted !== "on" && input.termsAccepted !== "true") {
    fieldErrors.termsAccepted = "You must accept the Terms and Privacy Notice to register.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    fieldErrors,
    value: {
      email: normalizeEmail(input.email as string),
      password: input.password as string,
    },
  };
}

export interface LoginInput {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
}

export interface LoginValue {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): ValidationResult<LoginValue> {
  const fieldErrors: FieldErrors = {};

  const emailError = validateEmail(input.email);
  if (emailError) fieldErrors.email = emailError;

  const password = typeof input.password === "string" ? input.password : "";
  if (!password) {
    fieldErrors.password = "Enter your password.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    fieldErrors,
    value: { email: normalizeEmail(input.email as string), password },
  };
}

export function validateEmailOnly(
  rawEmail: FormDataEntryValue | null,
): ValidationResult<{ email: string }> {
  const emailError = validateEmail(rawEmail);

  if (emailError) {
    return { ok: false, fieldErrors: { email: emailError } };
  }

  return {
    ok: true,
    fieldErrors: {},
    value: { email: normalizeEmail(rawEmail as string) },
  };
}

export interface UpdatePasswordInput {
  password: FormDataEntryValue | null;
  confirmPassword: FormDataEntryValue | null;
}

export function validateUpdatePassword(
  input: UpdatePasswordInput,
): ValidationResult<{ password: string }> {
  const fieldErrors: FieldErrors = {};

  const passwordError = validatePassword(input.password);
  if (passwordError) fieldErrors.password = passwordError;

  // Same fix as validateRegistration above — checked unconditionally, not
  // only when the password itself is otherwise valid.
  const confirmError = validatePasswordConfirmation(input.password, input.confirmPassword);
  if (confirmError) fieldErrors.confirmPassword = confirmError;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    fieldErrors,
    value: { password: input.password as string },
  };
}

/**
 * Restricts a caller-supplied `returnTo`/`next` value to a same-origin,
 * relative path — the standard defense against open-redirect attacks via a
 * query parameter. Anything that isn't an unambiguous relative path
 * (protocol-relative `//`, an absolute URL, backslash tricks, control
 * characters) falls back to `fallback`.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
  fallback = "/member",
): string {
  if (!value) return fallback;

  // Must start with exactly one `/` — rules out `//host/path`
  // (protocol-relative) and absolute URLs like `https://evil.example`.
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  // Rules out backslash tricks some browsers normalize to `//`.
  if (value.includes("\\")) return fallback;

  // Rules out embedded scheme separators anywhere in the string
  // (e.g. `/redirect?to=https://evil.example`).
  if (value.includes("://")) return fallback;

  // Only allow a conservative, URL-safe character set — also blocks
  // newlines/control characters that could be used for header injection if
  // this value is ever echoed into a header by mistake.
  if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?]*$/.test(value)) return fallback;

  return value;
}
