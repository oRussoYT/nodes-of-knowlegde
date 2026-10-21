import { describe, expect, it } from "vitest";

import {
  EVIDENCE_MAX_LENGTH,
  isValidUuid,
  normalizeSearchQuery,
  SEARCH_QUERY_MAX_LENGTH,
  validateClaimSubmission,
} from "../../src/features/identity/validation";

const VALID_UUID = "33333333-3333-3333-3333-333333333333";

describe("normalizeSearchQuery", () => {
  it("trims whitespace and treats non-string input as blank", () => {
    expect(normalizeSearchQuery("  Ada Lovelace  ")).toBe("Ada Lovelace");
    expect(normalizeSearchQuery(null)).toBe("");
  });

  it("caps length so a search string cannot be arbitrarily long", () => {
    const long = "a".repeat(SEARCH_QUERY_MAX_LENGTH + 50);
    expect(normalizeSearchQuery(long)).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
  });
});

describe("isValidUuid", () => {
  it("accepts a well-formed uuid", () => {
    expect(isValidUuid(VALID_UUID)).toBe(true);
  });

  it("rejects non-uuid strings and non-string values", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid(42)).toBe(false);
  });
});

describe("validateClaimSubmission", () => {
  it("requires a well-formed personId — never accepts an arbitrary string as if it were a selection", () => {
    const result = validateClaimSubmission({ personId: "pick-me", evidence: null });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.personId).toMatch(/search results/);
  });

  it("accepts a valid personId with no evidence — evidence is optional", () => {
    const result = validateClaimSubmission({ personId: VALID_UUID, evidence: null });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ personId: VALID_UUID, evidence: null });
  });

  it("rejects evidence over the length cap", () => {
    const result = validateClaimSubmission({
      personId: VALID_UUID,
      evidence: "a".repeat(EVIDENCE_MAX_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors.evidence).toMatch(new RegExp(`${EVIDENCE_MAX_LENGTH}`));
  });

  it("trims evidence and treats a blank string the same as none", () => {
    const result = validateClaimSubmission({ personId: VALID_UUID, evidence: "   " });
    expect(result.ok).toBe(true);
    expect(result.value?.evidence).toBeNull();
  });
});
