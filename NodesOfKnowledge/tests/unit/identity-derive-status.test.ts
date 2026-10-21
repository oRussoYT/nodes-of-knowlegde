import { describe, expect, it } from "vitest";

import { deriveIdentityStatus, hasActiveOrApprovedClaim } from "../../src/features/identity/derive-status";
import type { ClaimRecord } from "../../src/features/identity/types";

function claim(overrides: Partial<ClaimRecord>): ClaimRecord {
  return {
    id: "claim-1",
    personId: "person-1",
    status: "submitted",
    submittedAt: "2026-01-01T00:00:00Z",
    decidedAt: null,
    decisionNotes: null,
    ...overrides,
  };
}

describe("hasActiveOrApprovedClaim", () => {
  it("is false for an empty claim history (no_claim)", () => {
    expect(hasActiveOrApprovedClaim([])).toBe(false);
  });

  it("is false when every claim is terminal (rejected/withdrawn)", () => {
    expect(
      hasActiveOrApprovedClaim([claim({ status: "rejected" }), claim({ id: "c2", status: "withdrawn" })]),
    ).toBe(false);
  });

  it("is true for a submitted or under_review claim — this is the duplicate-prevention guard submit-claim.ts relies on", () => {
    expect(hasActiveOrApprovedClaim([claim({ status: "submitted" })])).toBe(true);
    expect(hasActiveOrApprovedClaim([claim({ status: "under_review" })])).toBe(true);
  });

  it("is true for an approved claim", () => {
    expect(hasActiveOrApprovedClaim([claim({ status: "approved" })])).toBe(true);
  });
});

describe("deriveIdentityStatus", () => {
  it("returns no_claim for empty history", () => {
    expect(deriveIdentityStatus([], null)).toEqual({ kind: "no_claim" });
  });

  it("prioritizes an approved claim over everything else in the same history", () => {
    const approved = claim({ id: "approved-1", status: "approved" });
    const result = deriveIdentityStatus(
      [claim({ id: "old-rejected", status: "rejected" }), approved],
      "Ada Lovelace",
    );
    expect(result).toEqual({ kind: "approved", claim: approved, personDisplayName: "Ada Lovelace" });
  });

  it("returns pending for an active claim when there is no approved one", () => {
    const pending = claim({ id: "pending-1", status: "under_review" });
    expect(deriveIdentityStatus([pending], "Grace Hopper")).toEqual({
      kind: "pending",
      claim: pending,
      personDisplayName: "Grace Hopper",
    });
  });

  it("falls back to the most recently decided terminal claim when nothing is active or approved", () => {
    const olderRejected = claim({ id: "old", status: "rejected", decidedAt: "2026-01-01T00:00:00Z" });
    const newerWithdrawn = claim({ id: "new", status: "withdrawn", decidedAt: "2026-02-01T00:00:00Z" });
    const result = deriveIdentityStatus([olderRejected, newerWithdrawn], null);
    expect(result).toEqual({ kind: "withdrawn", claim: newerWithdrawn, personDisplayName: null });
  });

  it("maps a rejected terminal claim to the rejected kind, not withdrawn", () => {
    const rejected = claim({ status: "rejected", decidedAt: "2026-01-01T00:00:00Z" });
    expect(deriveIdentityStatus([rejected], null).kind).toBe("rejected");
  });
});
