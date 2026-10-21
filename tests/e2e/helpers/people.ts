// Disposable, per-test `people` fixtures for the claim-flow e2e tests.
//
// Why this exists: the claim-discovery / claim-review flows need a real,
// eligible `people` row to find, claim, review, approve, or reject. There is
// deliberately no client-facing, app-level way to create a `people` row in
// this milestone (see docs/decisions/0001-separate-people-from-user-accounts.md
// and docs/database-implementation.md's "Admin-review limitation"), so a test
// that needs one must mint it through the same trusted service-role
// connection reviewer-status setup already uses (helpers/service-role.ts).
//
// Why per-test instead of shared seed rows: an approved claim creates an
// irreversible, one-per-person `user_person_links` row, permanently removing
// that person from search_claimable_people/is_person_claimable for the rest
// of the database's life. A fixed, shared seed pool therefore couples every
// claimable-person test to every other under Playwright's default parallel
// (per-file) workers. Giving each consuming test its own uniquely-named,
// disposable person removes that shared mutable state entirely — see
// fixtures.ts.
//
// Institution-neutral by design: names here are generic test tokens
// ("Test Person <unique>"), never real or PDBFF-specific identities.

import { getServiceRoleClient } from "./service-role";

export interface ClaimablePerson {
  /** The `people.id` primary key. */
  id: string;
  /** The exact `display_name` the app will render (headings, status copy). */
  displayName: string;
  /**
   * A globally-unique substring of `displayName`, safe to type into the
   * "Search by name" field: search_claimable_people() does an ILIKE
   * substring match on display_name, so this term returns exactly this one
   * row — never a seed person and never another test's row (no Playwright
   * strict-mode multi-match).
   */
  searchTerm: string;
  givenName: string;
  familyName: string;
}

/** The outcome of attempting to clean up a disposable person after a test. */
export interface DeleteResult {
  deleted: boolean;
  /** Present when the row was intentionally retained rather than deleted. */
  retainedReason?: string;
}

function uniqueToken(): string {
  // Same uniqueness discipline as helpers/auth.ts's generated emails:
  // timestamp + random, so concurrent workers and repeated (un-reset) runs
  // never collide.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a fresh, provisional, unlinked `people` row that is immediately
 * eligible for claim discovery, and returns exactly the id/name/search term
 * a test needs. Provisional (not merged) and with no user_person_links row,
 * so search_claimable_people/is_person_claimable both include it.
 *
 * `labelPrefix` is an optional human hint woven into the name to make a
 * stray row (e.g. one retained after an approval — see deleteClaimablePerson)
 * recognizable in the database; it never affects uniqueness or matching.
 */
export async function createClaimablePerson(labelPrefix = "Test Person"): Promise<ClaimablePerson> {
  const supabase = getServiceRoleClient();
  const token = uniqueToken();

  const givenName = "Test";
  const familyName = `Person ${token}`;
  const displayName = `${labelPrefix} ${token}`;

  const { data, error } = await supabase
    .from("people")
    .insert({
      given_name: givenName,
      family_name: familyName,
      display_name: displayName,
      // Mirrors supabase/seed.sql's fixture shape: an eligible, unverified,
      // imported-historical record. Not 'merged', so it stays claimable.
      verification_status: "provisional",
      source_type: "imported_historical",
    })
    .select("id, display_name")
    .single();

  if (error) {
    throw new Error(`createClaimablePerson: ${error.message}`);
  }

  return {
    id: data.id,
    displayName: data.display_name,
    searchTerm: token,
    givenName,
    familyName,
  };
}

/**
 * Cleans up a disposable person after a test, but ONLY where deletion is
 * valid. If the person now has an active `user_person_links` row (an
 * approved claim), deletion is intentionally NOT attempted: that link is
 * irreversible by design (there is no unclaim path, and force-removing it
 * would fabricate an un-approval and destroy provenance). In that case the
 * row is retained until the next `supabase db reset`, and this returns
 * `{ deleted: false, retainedReason }` — it does not throw and does not mask
 * anything.
 *
 * Otherwise it removes the person's own test-created `profile_claims` rows
 * (ordinary test detritus — pending/withdrawn/rejected, never an approved
 * link) and then the `people` row. Any *unexpected* database error is
 * propagated, never swallowed.
 */
export async function deleteClaimablePerson(id: string): Promise<DeleteResult> {
  const supabase = getServiceRoleClient();

  const { data: activeLinks, error: linkError } = await supabase
    .from("user_person_links")
    .select("id")
    .eq("person_id", id)
    .eq("status", "active")
    .limit(1);

  if (linkError) {
    throw new Error(`deleteClaimablePerson (link check): ${linkError.message}`);
  }

  if (activeLinks && activeLinks.length > 0) {
    return {
      deleted: false,
      retainedReason:
        "person has an active user_person_links row (approved claim); the link " +
        "is irreversible by design, so the row is retained until the next " +
        "supabase db reset rather than force-deleted",
    };
  }

  // No active link: safe to remove the person and its dependent test claims.
  // Order matters — profile_claims.claimed_person_id references people(id).
  const { error: claimsError } = await supabase
    .from("profile_claims")
    .delete()
    .eq("claimed_person_id", id);

  if (claimsError) {
    throw new Error(`deleteClaimablePerson (claims): ${claimsError.message}`);
  }

  const { error: personError } = await supabase.from("people").delete().eq("id", id);

  if (personError) {
    throw new Error(`deleteClaimablePerson (person): ${personError.message}`);
  }

  return { deleted: true };
}
