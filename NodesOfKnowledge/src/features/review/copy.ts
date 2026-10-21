// Reviewer-facing copy for the M5.4 claim-review surfaces. Claimant-facing
// copy for the same status vocabulary lives in
// src/features/identity/copy.ts -- a different audience reads a
// deliberately separate set of strings, even though both read from the
// same profile_claims.status vocabulary
// (src/features/identity/types.ts). No fabricated data, no
// name-similarity-implies-identity language anywhere here, per the
// milestone's explicit "do not imply that name similarity proves
// identity" requirement -- copy below is careful to say "a possible
// match" / "review carefully," never "this is confirmed" or "this looks
// right."

import type { ClaimStatus } from "./types";

/** Short, reviewer-facing label for a claim's current status. */
export function getReviewStatusLabel(status: ClaimStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
  }
}

export const REVIEW_QUEUE_EMPTY_COPY = {
  title: "No claims are waiting for review",
  description: "New claims will appear here once a claimant submits one.",
} as const;

export const REVIEW_QUEUE_INTRO =
  "Claims awaiting a decision, oldest first. Selecting a name below does not confirm identity -- review the evidence before deciding.";

export const BEGIN_REVIEW_HELPER =
  "Marks this claim as under review by you. This does not decide it -- it only signals you're looking at it.";

export const APPROVE_CONFIRM_COPY = {
  title: "Approve this claim?",
  description:
    "This links the claimant's account to this person record. This action is recorded and cannot be undone from this screen.",
  confirmLabel: "Approve claim",
} as const;

export const REJECT_CONFIRM_COPY = {
  title: "Reject this claim?",
  description:
    "This records your decision and does not create a link. The claimant will see that the claim wasn't approved and, if you add one, your note.",
  confirmLabel: "Reject claim",
} as const;
