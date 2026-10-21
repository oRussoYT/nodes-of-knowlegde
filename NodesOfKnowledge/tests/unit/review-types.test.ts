import { describe, expect, it } from "vitest";

import { isReviewActionAvailable } from "../../src/features/review/types";
import type { ClaimStatus } from "../../src/features/identity/types";

const ALL_STATUSES: ClaimStatus[] = ["submitted", "under_review", "approved", "rejected", "withdrawn"];

describe("isReviewActionAvailable", () => {
  it("offers begin_review only from submitted", () => {
    for (const status of ALL_STATUSES) {
      expect(isReviewActionAvailable(status, "begin_review")).toBe(status === "submitted");
    }
  });

  it("offers approve only from under_review", () => {
    for (const status of ALL_STATUSES) {
      expect(isReviewActionAvailable(status, "approve")).toBe(status === "under_review");
    }
  });

  it("offers reject only from under_review", () => {
    for (const status of ALL_STATUSES) {
      expect(isReviewActionAvailable(status, "reject")).toBe(status === "under_review");
    }
  });

  it("never offers any action for a decided or withdrawn claim -- no repeated-decision path exists in the UI layer", () => {
    for (const status of ["approved", "rejected", "withdrawn"] as ClaimStatus[]) {
      expect(isReviewActionAvailable(status, "begin_review")).toBe(false);
      expect(isReviewActionAvailable(status, "approve")).toBe(false);
      expect(isReviewActionAvailable(status, "reject")).toBe(false);
    }
  });
});
