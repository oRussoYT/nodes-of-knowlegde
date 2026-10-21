import { describe, expect, it } from "vitest";

import { toSafeAuthErrorMessage } from "../../src/lib/auth/errors";

// Enumeration-safety regression test (milestone quality review, item 4):
// "invalid credentials" and "email not confirmed" must map to the exact
// same string, or a login attempt alone could reveal whether an email
// address is registered — see docs/authentication-implementation.md,
// "Account-enumeration review".
describe("toSafeAuthErrorMessage", () => {
  it("maps invalid credentials and email-not-confirmed to the identical message", () => {
    const invalidCredentials = toSafeAuthErrorMessage({ message: "Invalid login credentials" });
    const emailNotConfirmed = toSafeAuthErrorMessage({ message: "Email not confirmed" });

    expect(invalidCredentials).toBe("Invalid email or password.");
    expect(emailNotConfirmed).toBe(invalidCredentials);
  });

  it("never echoes the raw Supabase error text back to the client", () => {
    const raw = "some very specific internal Postgres constraint detail";
    expect(toSafeAuthErrorMessage({ message: raw })).not.toContain(raw);
  });

  it("falls back to a generic message for unrecognized errors", () => {
    expect(toSafeAuthErrorMessage({ message: "some brand new GoTrue error string" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("falls back to a generic message for non-Error input", () => {
    expect(toSafeAuthErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(toSafeAuthErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(toSafeAuthErrorMessage("a plain string, not an Error object")).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("maps rate limiting to a distinct, non-identity-revealing message", () => {
    expect(toSafeAuthErrorMessage({ message: "email rate limit exceeded" })).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
  });
});
