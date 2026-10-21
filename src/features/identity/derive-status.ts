// Pure claim-history -> claimant-facing-status derivation. No I/O, no
// Supabase import — see tests/unit/identity-derive-status.test.ts. Kept
// separate from status.ts (which does the actual database read) so this
// logic is testable without a database at all, per the milestone's
// testing requirement ("state-to-copy mapping" / "duplicate prevention
// logic that is genuinely pure").

import type { ClaimRecord, IdentityStatus } from "./types";

const ACTIVE_STATUSES = new Set(["submitted", "under_review"]);
const TERMINAL_STATUSES = new Set(["rejected", "withdrawn"]);

/**
 * True if `claims` already contains an active (submitted/under_review) or
 * approved claim. Used to derive the display state below.
 *
 * SECURITY NOTE (M5.3 correction): this was previously also relied on by
 * src/features/identity/actions/submit-claim.ts as the *enforcement*
 * mechanism for "at most one active-or-approved claim per account" — a
 * check-then-insert sequence that a concurrent request could race. That
 * invariant is now enforced where it actually needs to be: at the
 * database level, by the partial unique index
 * `profile_claims_one_active_or_approved_per_claimant_idx`
 * (supabase/migrations/20260802110300_add_claim_discovery_search_function.sql),
 * checked atomically with the insert inside `submit_profile_claim()`. This
 * function is no longer part of any security boundary — it remains here,
 * and tested, purely as a display-state helper.
 */
export function hasActiveOrApprovedClaim(claims: readonly ClaimRecord[]): boolean {
  return claims.some((claim) => claim.status === "approved" || ACTIVE_STATUSES.has(claim.status));
}

/**
 * Picks the single most relevant claim from a claimant's full history and
 * derives the `IdentityStatus` `/member` and `/account` render. Priority,
 * most authoritative first:
 *
 *   1. An approved claim (there can be at most one, ever, per
 *      `profile_claims_one_approved_per_claimant_idx`) — this is the
 *      claimant's linked state and always wins.
 *   2. An active (submitted/under_review) claim — the claimant's current
 *      pending request.
 *   3. The most recently decided terminal claim (rejected/withdrawn), if
 *      any — so a claimant who was rejected or withdrew still sees that
 *      outcome rather than silently reverting to "no claim."
 *   4. No claim at all.
 *
 * `personDisplayName` is looked up separately (status.ts) via
 * `get_claimed_person_display_name` and passed in rather than fetched
 * here, keeping this function free of I/O.
 */
export function deriveIdentityStatus(
  claims: readonly ClaimRecord[],
  personDisplayName: string | null,
): IdentityStatus {
  const approved = claims.find((claim) => claim.status === "approved");
  if (approved) {
    return { kind: "approved", claim: approved, personDisplayName };
  }

  const active = claims.find((claim) => ACTIVE_STATUSES.has(claim.status));
  if (active) {
    return { kind: "pending", claim: active, personDisplayName };
  }

  const terminal = claims
    .filter((claim) => TERMINAL_STATUSES.has(claim.status))
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))[0];

  if (terminal) {
    return { kind: terminal.status === "rejected" ? "rejected" : "withdrawn", claim: terminal, personDisplayName };
  }

  return { kind: "no_claim" };
}
