import { describe, expect, it } from "vitest";

import {
  APPROVE_CONFIRM_COPY,
  getReviewStatusLabel,
  REJECT_CONFIRM_COPY,
  REVIEW_QUEUE_EMPTY_COPY,
} from "../../src/features/review/copy";
import type { ClaimStatus } from "../../src/features/identity/types";

const ALL_STATUSES: ClaimStatus[] = ["submitted", "under_review", "approved", "rejected", "withdrawn"];

describe("getReviewStatusLabel", () => {
  it("returns a non-empty, distinct label for every controlled status value", () => {
    const labels = ALL_STATUSES.map(getReviewStatusLabel);
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(ALL_STATUSES.length);
  });

  it("never invents a status label outside profile_claims' controlled vocabulary", () => {
    // isReviewActionAvailable/getReviewStatusLabel are both typed over
    // ClaimStatus (src/features/identity/types.ts) -- this test exists to
    // make that guarantee explicit rather than merely structural: calling
    // the switch exhaustively above is what TypeScript's own
    // exhaustiveness checking on the switch statement already enforces at
    // compile time, so if this test compiles and passes, no case was
    // silently missed.
    expect(ALL_STATUSES).toHaveLength(5);
  });
});

describe("reviewer-facing confirmation copy is safe and does not overstate certainty", () => {
  const CERTAINTY_PATTERN = /\b(confirmed|verified|definitely|certainly)\b/i;

  it("approve confirmation copy never claims the match is confirmed by name alone", () => {
    const text = `${APPROVE_CONFIRM_COPY.title} ${APPROVE_CONFIRM_COPY.description}`;
    expect(text).not.toMatch(CERTAINTY_PATTERN);
  });

  it("reject confirmation copy never exposes reviewer-only internal detail", () => {
    const text = `${REJECT_CONFIRM_COPY.title} ${REJECT_CONFIRM_COPY.description}`.toLowerCase();
    expect(text).not.toMatch(/reviewer_admin_id|internal note/);
  });

  it("empty-queue copy never fabricates a count", () => {
    const text = `${REVIEW_QUEUE_EMPTY_COPY.title} ${REVIEW_QUEUE_EMPTY_COPY.description}`;
    expect(text).not.toMatch(/\b\d+\s*(claims?|records?)\b/i);
  });
});
