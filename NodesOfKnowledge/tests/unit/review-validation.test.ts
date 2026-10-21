import { describe, expect, it } from "vitest";

import {
  DECISION_NOTES_MAX_LENGTH,
  isValidUuid,
  validateClaimIdInput,
  validateRejectClaimInput,
} from "../../src/features/review/validation";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

describe("isValidUuid", () => {
  it("accepts a well-formed uuid", () => {
    expect(isValidUuid(VALID_UUID)).toBe(true);
  });

  it("rejects non-strings, blanks, and malformed values", () => {
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid(42)).toBe(false);
  });
});

describe("validateClaimIdInput", () => {
  it("accepts a well-formed claim id", () => {
    const result = validateClaimIdInput(VALID_UUID);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ claimId: VALID_UUID });
  });

  it("rejects a missing or malformed claim id with a safe, generic message", () => {
    const result = validateClaimIdInput("not-a-uuid");
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.claimId).toBeTruthy();
    // The error string must not leak why validation failed in a way that
    // could hint at internal shape/format expectations beyond "something
    // went wrong" -- matches the safe-error-message convention already
    // used throughout src/features/identity/actions/*.
    expect(result.fieldErrors.claimId).not.toMatch(/uuid|regex|pattern/i);
  });
});

describe("validateRejectClaimInput", () => {
  it("accepts a well-formed claim id with no notes", () => {
    const result = validateRejectClaimInput({ claimId: VALID_UUID, decisionNotes: null });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ claimId: VALID_UUID, decisionNotes: null });
  });

  it("normalizes blank notes to null, same convention as evidence normalization elsewhere", () => {
    const result = validateRejectClaimInput({ claimId: VALID_UUID, decisionNotes: "   " });
    expect(result.ok).toBe(true);
    expect(result.value?.decisionNotes).toBeNull();
  });

  it("trims and keeps well-formed notes", () => {
    const result = validateRejectClaimInput({ claimId: VALID_UUID, decisionNotes: "  Name does not match records.  " });
    expect(result.ok).toBe(true);
    expect(result.value?.decisionNotes).toBe("Name does not match records.");
  });

  it("rejects notes longer than the documented cap", () => {
    const tooLong = "x".repeat(DECISION_NOTES_MAX_LENGTH + 1);
    const result = validateRejectClaimInput({ claimId: VALID_UUID, decisionNotes: tooLong });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.decisionNotes).toBeTruthy();
  });

  it("rejects an invalid claim id even when notes are valid", () => {
    const result = validateRejectClaimInput({ claimId: "not-a-uuid", decisionNotes: "fine" });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.claimId).toBeTruthy();
  });
});
