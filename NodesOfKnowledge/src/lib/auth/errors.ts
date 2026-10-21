// Maps Supabase Auth errors to safe, generic, user-facing copy.
//
// Requirement (docs/authentication-implementation.md, "Security decisions"):
// never surface raw Supabase/Postgres error text to the client — it can
// contain internal details, and for signup/password-reset specifically it
// must never reveal whether an account exists for a given email.

export function toSafeAuthErrorMessage(error: unknown): string {
  const message = extractMessage(error);

  if (!message) {
    return GENERIC_MESSAGE;
  }

  // Enumeration-safety review (see docs/authentication-implementation.md,
  // "Account-enumeration review"): "invalid credentials" and "email not
  // confirmed" are deliberately mapped to the exact same string. Supabase
  // returns a distinguishable "Email not confirmed" error for an
  // unconfirmed account, and surfacing that as different wording would let
  // a login attempt alone confirm whether an address is registered — a
  // narrower but real enumeration channel, since it doesn't even require
  // guessing the correct password. Legitimate users stuck for this reason
  // aren't left without a path forward: the login page always shows a
  // "Didn't get a confirmation email?" resend option regardless of the
  // error above it, so the fix doesn't come at the cost of a dead end.
  if (/invalid login credentials/i.test(message) || /email not confirmed/i.test(message)) {
    return "Invalid email or password.";
  }

  if (/email link is invalid or has expired|token has expired|invalid.*token/i.test(message)) {
    return "This link is invalid or has expired. Please request a new one.";
  }

  if (/password should be at least|password.*weak|password.*character/i.test(message)) {
    return "Password does not meet the minimum requirements.";
  }

  if (/rate limit|too many requests/i.test(message)) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (/same password|should be different/i.test(message)) {
    return "Your new password must be different from your current password.";
  }

  if (/session missing|auth session missing/i.test(message)) {
    return "Your session has expired. Please sign in again.";
  }

  return GENERIC_MESSAGE;
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function extractMessage(error: unknown): string | null {
  if (error && typeof error === "object" && "message" in error) {
    const raw = (error as { message?: unknown }).message;
    return typeof raw === "string" ? raw : null;
  }

  return null;
}
