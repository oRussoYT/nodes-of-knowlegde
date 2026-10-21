// Server-only read of a single claim's review detail. Plain async
// function, not a Server Action -- called directly from
// src/app/(protected)/review/claims/[claimId]/page.tsx.
//
// Wraps public.get_claim_review_detail() (supabase/migrations/
// 20260802130000_add_claim_review_governance.sql) -- reviewer-gated,
// works for a claim in any status (not just pending), so a decided claim
// can still be audited. Returns null for "not found" and "not
// authorized" alike, deliberately indistinguishable at this layer -- the
// page renders the same generic "not available" outcome either way,
// consistent with the milestone's "unauthorized access must not disclose
// whether a claim exists" requirement.

import { createClient } from "@/lib/supabase/server";

import { isClaimStatus } from "@/features/identity/types";

import type { ReviewClaimDetail } from "./types";

export async function getReviewClaimDetail(claimId: string): Promise<ReviewClaimDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_claim_review_detail", { p_claim_id: claimId });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];

  if (!row || !isClaimStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    claimantEmail: row.claimant_email,
    personId: row.person_id,
    personDisplayName: row.person_display_name,
    personGivenName: row.person_given_name,
    personFamilyName: row.person_family_name,
    personVerificationStatus: row.person_verification_status,
    personSourceType: row.person_source_type,
    personCreatedAt: row.person_created_at,
    supportingEvidence: row.supporting_evidence,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    reviewerEmail: row.reviewer_email,
    decisionNotes: row.decision_notes,
    activeLinkExists: row.active_link_exists,
  };
}
