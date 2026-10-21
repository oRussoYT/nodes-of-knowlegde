// Server-only read of the current user's identity-claim status. Not "use
// server" (see src/features/auth/actions/state.ts's file comment for why
// that directive is reserved for action modules with only async function
// exports) — this is a plain async function, called directly from Server
// Components (/member, /account), the same way those pages already call
// createClient()/getClaims() inline.
//
// Deliberately reads only from `profile_claims` (RLS: claimant may read
// only their own rows — supabase/migrations/20260801013649_create_identity_foundation.sql)
// plus the one narrow, claim-scoped name lookup
// (get_claimed_person_display_name). Never reads `user_person_links` or
// `people` directly — there is no client-reachable grant for either, by
// design (see docs/decisions/0008-claim-discovery-security-definer-function.md).

import { createClient } from "@/lib/supabase/server";

import { deriveIdentityStatus } from "./derive-status";
import type { ClaimRecord, IdentityStatus } from "./types";
import { isClaimStatus } from "./types";

export async function getIdentityStatus(): Promise<IdentityStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_claims")
    .select("id, claimed_person_id, status, submitted_at, decided_at, decision_notes")
    .order("submitted_at", { ascending: false });

  if (error || !data) {
    // Fails closed to the honest "no claim" state rather than throwing —
    // a transient read failure here should not crash /member or /account;
    // it should just show the same empty state a claimant with no claim
    // history would see. The page itself still renders correctly either
    // way, and nothing false is displayed.
    return { kind: "no_claim" };
  }

  const claims: ClaimRecord[] = data
    .filter((row): row is typeof row & { status: ClaimRecord["status"] } => isClaimStatus(row.status))
    .map((row) => ({
      id: row.id,
      personId: row.claimed_person_id,
      status: row.status,
      submittedAt: row.submitted_at,
      decidedAt: row.decided_at,
      decisionNotes: row.decision_notes,
    }));

  if (claims.length === 0) {
    return { kind: "no_claim" };
  }

  // Determine which single claim will actually be shown before spending a
  // second round trip on its person's display name — no point looking up
  // a name for a claim that deriveIdentityStatus won't surface.
  const withoutName = deriveIdentityStatus(claims, null);
  if (withoutName.kind === "no_claim") {
    return withoutName;
  }

  const { data: displayName } = await supabase.rpc("get_claimed_person_display_name", {
    p_person_id: withoutName.claim.personId,
  });

  return deriveIdentityStatus(claims, displayName ?? null);
}
