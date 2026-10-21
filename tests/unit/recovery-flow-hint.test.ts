import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getRecoveryFlowHintCookieOptions,
  RECOVERY_FLOW_HINT_COOKIE,
  RECOVERY_FLOW_HINT_MAX_AGE_SECONDS,
} from "../../src/lib/auth/recovery-flow-hint";

// Milestone security-accuracy review: this cookie is a UX flow marker, not
// a security control (see the long comment at the top of
// src/lib/auth/recovery-flow-hint.ts). These tests only check the cookie
// *attributes* this file's own checklist promises — they intentionally do
// not, and cannot, test "is this cookie forgeable", because it is, by
// design, and that's not a bug. See tests/e2e/update-password.spec.ts for
// the tests that exercise what forging it does and doesn't allow.
describe("recovery-flow-hint cookie attributes", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("uses a name that doesn't claim to be a security token", () => {
    expect(RECOVERY_FLOW_HINT_COOKIE).toBe("netpdbff_recovery_flow_hint");
    expect(RECOVERY_FLOW_HINT_COOKIE).not.toMatch(/token|signed|verified|proof/i);
  });

  it("is httpOnly", () => {
    expect(getRecoveryFlowHintCookieOptions().httpOnly).toBe(true);
  });

  it("is sameSite=lax or stricter", () => {
    expect(["lax", "strict"]).toContain(getRecoveryFlowHintCookieOptions().sameSite);
  });

  it("is scoped to the narrowest relevant path", () => {
    expect(getRecoveryFlowHintCookieOptions().path).toBe("/update-password");
  });

  it("has a short expiry (15 minutes or less)", () => {
    expect(RECOVERY_FLOW_HINT_MAX_AGE_SECONDS).toBeLessThanOrEqual(15 * 60);
    expect(getRecoveryFlowHintCookieOptions().maxAge).toBe(RECOVERY_FLOW_HINT_MAX_AGE_SECONDS);
  });

  describe("secure attribute", () => {
    beforeEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("is secure in a production build", () => {
      process.env.NODE_ENV = "production";
      expect(getRecoveryFlowHintCookieOptions().secure).toBe(true);
    });

    it("is not secure under local development (plain HTTP)", () => {
      process.env.NODE_ENV = "development";
      expect(getRecoveryFlowHintCookieOptions().secure).toBe(false);
    });

    it("is evaluated fresh on every call, not cached from module load", () => {
      process.env.NODE_ENV = "development";
      expect(getRecoveryFlowHintCookieOptions().secure).toBe(false);
      process.env.NODE_ENV = "production";
      expect(getRecoveryFlowHintCookieOptions().secure).toBe(true);
    });
  });
});
