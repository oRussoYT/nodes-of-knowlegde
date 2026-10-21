// Server-only read of the review queue. Plain async function, not a
// Server Action -- called directly from
// src/app/(protected)/review/claims/page.tsx, the same way
// src/features/identity/status.ts is called from /member and /account.
//
// Wraps public.list_claims_for_review() (supabase/migrations/
// 20260802130000_add_claim_review_governance.sql) -- reviewer-gated,
// scoped to submitted/under_review claims only, minimum-necessary
// columns. This module performs no filtering or authorization logic of
// its own; the database function is the actual boundary.

import { createClient } from "@/lib/supabase/server";

import { isClaimStatus } from "@/features/identity/types";

import type { ReviewQueueItem } from "./types";

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_claims_for_review");

  if (error || !data) {
    // Fails closed to an empty queue rather than throwing -- a transient
    // read failure should not crash the review page; the reviewer simply
    // sees no claims this time and can retry (reload).
    return [];
  }

  return data
    .filter((row): row is typeof row & { status: ReviewQueueItem["status"] } => isClaimStatus(row.status))
    .map((row) => ({
      id: row.id,
      status: row.status,
      claimantEmail: row.claimant_email,
      personId: row.person_id,
      personDisplayName: row.person_display_name,
      personVerificationStatus: row.person_verification_status,
      submittedAt: row.submitted_at,
    }));
}
