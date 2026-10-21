import { describe, expect, it } from "vitest";

import { resolveReviewerAuthorization } from "../../src/features/review/authorization";

// Pure decision-logic coverage for the one function that decides "is the
// current session an active reviewer" from an RPC result -- see
// src/features/review/authorization.ts's own doc comment for why this was
// split out from isCurrentUserReviewer() specifically to be unit-testable
// without a Supabase instance. This is the "reviewer authorization state
// mapping" pure-logic test the M5.4 brief calls for. am_i_a_reviewer()
// itself is a UI-visibility signal only, never the authorization boundary
// -- but it must still fail closed, since a wrong "true" here would show
// reviewer navigation/UI to someone who isn't one (harmless on its own,
// since every real review/decision function re-checks independently, but
// still worth getting right).

describe("resolveReviewerAuthorization", () => {
  it("returns false whenever the RPC call errored, regardless of what data came back", () => {
    expect(resolveReviewerAuthorization(true, new Error("boom"))).toBe(false);
    expect(resolveReviewerAuthorization(false, new Error("boom"))).toBe(false);
    expect(resolveReviewerAuthorization(null, { message: "not authenticated" })).toBe(false);
  });

  it("returns true only when data is exactly boolean true and there is no error", () => {
    expect(resolveReviewerAuthorization(true, null)).toBe(true);
    expect(resolveReviewerAuthorization(true, undefined)).toBe(true);
  });

  it("fails closed for any non-true data value, even without an error", () => {
    expect(resolveReviewerAuthorization(false, null)).toBe(false);
    expect(resolveReviewerAuthorization(null, null)).toBe(false);
    expect(resolveReviewerAuthorization(undefined, null)).toBe(false);
    // A truthy-but-not-boolean value (e.g. a stray string or number) must
    // never be treated as authorization -- only a strict `=== true` counts.
    expect(resolveReviewerAuthorization("true", null)).toBe(false);
    expect(resolveReviewerAuthorization(1, null)).toBe(false);
  });
});
