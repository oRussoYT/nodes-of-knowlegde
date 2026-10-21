// Types for the M5.3 identity-claiming feature. No "use server" here (see
// src/features/auth/actions/state.ts's file comment for why action-state
// modules stay plain) — this file is imported by both server and client
// code, so it must stay a types-and-pure-values-only module.

/**
 * The exact controlled vocabulary from `profile_claims.status`
 * (supabase/migrations/20260801013649_create_identity_foundation.sql,
 * `profile_claims_status_valid`). Never invent a status value beyond this
 * set — see docs/database-schema.md's "Profile claims" status table.
 */
export type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";

export const CLAIM_STATUSES: readonly ClaimStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export function isClaimStatus(value: unknown): value is ClaimStatus {
  return typeof value === "string" && (CLAIM_STATUSES as readonly string[]).includes(value);
}

/** One row of the claimant's own claim history, as read from `profile_claims`. */
export interface ClaimRecord {
  id: string;
  personId: string;
  status: ClaimStatus;
  submittedAt: string;
  decidedAt: string | null;
  /**
   * Concise reviewer context, added in M5.4. Never `reviewer_admin_id` --
   * see the profile_claims column-grant note in
   * supabase/migrations/20260802130000_add_claim_review_governance.sql
   * for why decision_notes is safe to surface to the claimant while the
   * reviewer's own identity is not. May be present on any decided claim,
   * but only rendered for rejected claims today (see
   * src/features/identity/copy.ts) -- approval's own copy states the
   * outcome plainly and doesn't need a reviewer note to be understood.
   */
  decisionNotes: string | null;
}

/**
 * The claimant-facing derived view of "where do I stand," combining
 * `profile_claims` history into the single most relevant state per
 * docs/application-information-architecture.md's requirement that
 * `/member` distinguish: no claim, pending, approved, rejected, withdrawn.
 * Never includes `decision_notes` or any reviewer/administrative field —
 * see src/features/identity/status.ts for what's deliberately left out.
 */
export type IdentityStatus =
  | { kind: "no_claim" }
  | { kind: "pending"; claim: ClaimRecord; personDisplayName: string | null }
  | { kind: "approved"; claim: ClaimRecord; personDisplayName: string | null }
  | { kind: "rejected"; claim: ClaimRecord; personDisplayName: string | null }
  | { kind: "withdrawn"; claim: ClaimRecord; personDisplayName: string | null };

/** One eligible search/browse result from `search_claimable_people`. */
export interface ClaimablePerson {
  id: string;
  displayName: string;
}
