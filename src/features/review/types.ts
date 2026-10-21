// Types for the M5.4 claim-review feature.
//
// Reuses profile_claims' existing status vocabulary
// (src/features/identity/types.ts) rather than redefining it -- there is
// exactly one controlled vocabulary for profile_claims.status in this
// codebase, read from two different audiences' perspectives (claimant vs
// reviewer), not two vocabularies. Per the milestone's architecture rule
// ("reviewer UI and claimant UI share status vocabulary but not
// authorization paths"): the *type* is shared; the Server Actions, RPC
// calls, and copy below are not.

import type { ClaimStatus } from "@/features/identity/types";

export type { ClaimStatus } from "@/features/identity/types";

/**
 * One row of the review queue -- the minimum projection
 * `list_claims_for_review()` returns. No supporting_evidence here; that
 * is detail-view-only (see `ReviewClaimDetail`), read one claim at a
 * time, never listed in bulk.
 */
export interface ReviewQueueItem {
  id: string;
  status: ClaimStatus;
  claimantEmail: string | null;
  personId: string;
  personDisplayName: string;
  personVerificationStatus: string;
  submittedAt: string;
}

/**
 * The claim-detail/evidence-review surface -- what
 * `get_claim_review_detail()` returns. Deliberately separates claimant
 * account, historical person record, claimant statement/evidence,
 * existing person-record provenance, review decision, and resulting link
 * -- see src/app/(protected)/review/claims/[claimId]/page.tsx for how
 * this is rendered as visually distinct sections.
 */
export interface ReviewClaimDetail {
  id: string;
  status: ClaimStatus;
  claimantEmail: string | null;
  personId: string;
  personDisplayName: string;
  personGivenName: string;
  personFamilyName: string;
  personVerificationStatus: string;
  personSourceType: string;
  personCreatedAt: string;
  supportingEvidence: string | null;
  submittedAt: string;
  decidedAt: string | null;
  reviewerEmail: string | null;
  decisionNotes: string | null;
  activeLinkExists: boolean;
}

/**
 * The three atomic database functions this feature's reviewer UI can
 * call, named 1:1 with the action a reviewer takes. Not a general state
 * machine -- just these three.
 */
export type ReviewAction = "begin_review" | "approve" | "reject";

/**
 * Whether `status` is one the reviewer UI should offer `action` for.
 * Single typed source for the reviewer-facing transition rules (per the
 * milestone's "one typed source for allowed reviewer-visible states and
 * transitions; no duplicated status-transition logic" architecture rule)
 * so the queue/detail UI and its tests agree. The database functions
 * (supabase/migrations/20260802130000_add_claim_review_governance.sql)
 * are still the actual enforcement -- this exists only to decide which
 * button to render, never to authorize anything by itself.
 */
export function isReviewActionAvailable(status: ClaimStatus, action: ReviewAction): boolean {
  switch (action) {
    case "begin_review":
      return status === "submitted";
    case "approve":
    case "reject":
      return status === "under_review";
    default:
      return false;
  }
}
