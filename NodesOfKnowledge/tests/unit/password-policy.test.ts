import { describe, expect, it } from "vitest";

import { PASSWORD_POLICY, PASSWORD_POLICY_HINT } from "../../src/lib/auth/password-policy";
import { validatePassword } from "../../src/lib/auth/validation";

// Focused tests for the centralized password policy (milestone quality
// review, item 3): the hint text shown in the UI and the server-side
// validator must always agree, since both read PASSWORD_POLICY rather than
// hardcoding their own copies of these numbers.
describe("PASSWORD_POLICY / PASSWORD_POLICY_HINT", () => {
  it("the hint text mentions the actual configured minimum length", () => {
    expect(PASSWORD_POLICY_HINT).toContain(String(PASSWORD_POLICY.minLength));
  });

  it("the hint text promises letter+digit only when the policy requires it", () => {
    if (PASSWORD_POLICY.requireLetterAndDigit) {
      expect(PASSWORD_POLICY_HINT).toMatch(/letter and a number/);
    } else {
      expect(PASSWORD_POLICY_HINT).not.toMatch(/letter and a number/);
    }
  });

  it("validatePassword enforces exactly PASSWORD_POLICY.minLength, not a hardcoded number", () => {
    const oneBelowMin = "a1".repeat(Math.ceil((PASSWORD_POLICY.minLength - 1) / 2)).slice(
      0,
      PASSWORD_POLICY.minLength - 1,
    );
    const atMin = "a1".repeat(Math.ceil(PASSWORD_POLICY.minLength / 2)).slice(
      0,
      PASSWORD_POLICY.minLength,
    );

    expect(validatePassword(oneBelowMin)).toMatch(
      new RegExp(`at least ${PASSWORD_POLICY.minLength}`),
    );
    expect(validatePassword(atMin)).toBeNull();
  });

  it("validatePassword enforces exactly PASSWORD_POLICY.maxLength", () => {
    const atMax = "a1".repeat(Math.ceil(PASSWORD_POLICY.maxLength / 2)).slice(
      0,
      PASSWORD_POLICY.maxLength,
    );
    const overMax = `${atMax}a1`;

    expect(validatePassword(atMax)).toBeNull();
    expect(validatePassword(overMax)).toMatch(
      new RegExp(`${PASSWORD_POLICY.maxLength} characters or fewer`),
    );
  });

  it("rejects letters-only and digits-only passwords when requireLetterAndDigit is set", () => {
    if (!PASSWORD_POLICY.requireLetterAndDigit) return;

    const lettersOnly = "a".repeat(Math.max(PASSWORD_POLICY.minLength, 8));
    const digitsOnly = "1".repeat(Math.max(PASSWORD_POLICY.minLength, 8));

    expect(validatePassword(lettersOnly)).toMatch(/letter and one number/);
    expect(validatePassword(digitsOnly)).toMatch(/letter and one number/);
  });

  it("this app's policy is at least as strict as the local Supabase config it must match (supabase/config.toml)", () => {
    // supabase/config.toml: minimum_password_length = 8, password_requirements = "letters_digits".
    // If either side changes, this test (and the config comments pointing
    // at this file) are the tripwire — see docs/authentication-implementation.md,
    // "Password policy".
    expect(PASSWORD_POLICY.minLength).toBe(8);
    expect(PASSWORD_POLICY.requireLetterAndDigit).toBe(true);
  });
});
