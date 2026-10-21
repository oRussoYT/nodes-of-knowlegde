// Server-only read of "is the current session an active reviewer."
// Deliberately a plain async function, not a Server Action -- called
// directly from Server Components (the shared (protected) layout, for
// nav-visibility, and the (protected)/review layout, for the actual
// access gate), the same way src/features/identity/status.ts is called.
//
// Wraps public.am_i_a_reviewer() (supabase/migrations/
// 20260802130000_add_claim_review_governance.sql) -- itself explicitly
// documented as a UI-visibility signal, never the authorization boundary.
// Every review/decision database function re-checks reviewer status
// independently; this function existing and being reused in two places
// does not change that -- a stale or wrong result here can, at worst,
// show or hide a nav link or a page's content incorrectly, never grant an
// actual write.

import { createClient } from "@/lib/supabase/server";

/**
 * Pure decision logic, split out from the I/O below so it's directly unit
 * testable without a Supabase instance (see
 * tests/unit/review-authorization.test.ts) -- the same "pure decision,
 * thin adapter" split src/lib/auth/route-protection.ts already
 * established. Fails closed on anything that isn't unambiguously `true`:
 * an RPC error, a null/undefined result, or any non-boolean value are all
 * treated as "not a reviewer" rather than thrown or assumed permissive.
 */
export function resolveReviewerAuthorization(data: unknown, error: unknown): boolean {
  if (error) {
    return false;
  }

  return data === true;
}

export async function isCurrentUserReviewer(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("am_i_a_reviewer");

  return resolveReviewerAuthorization(data, error);
}

/** Platform reviewer OR institution steward (ROTEIRO etapa 3). UI gate only;
 * every steward function in the database re-checks. */
export async function isCurrentUserSteward(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("am_i_a_steward");

  return resolveReviewerAuthorization(data, error);
}
