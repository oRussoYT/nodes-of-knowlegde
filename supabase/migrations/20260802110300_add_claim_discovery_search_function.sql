-- Milestone M5.3: Identity Claiming — claim discovery and claimant-status
-- support functions
--
-- Adds the two new database capabilities this milestone's "Person-record
-- discovery" and "Claim status" requirements need, both of which run into
-- the same underlying fact: `people` has zero GRANT/RLS for `authenticated`
-- (see the threat-model comment below `search_claimable_people` for the
-- full context) —
--
--   1. `search_claimable_people(p_query)` — search/browse eligible people
--      for the purpose of submitting a claim.
--   2. `get_claimed_person_display_name(p_person_id)` — let a claimant see
--      the *name* of the person their own claim (in any status: pending,
--      approved, rejected, or withdrawn) refers to, without that claimant
--      gaining any general read access to `people`. `profile_claims`
--      already lets a claimant read their own claim row (M3.1 RLS), but
--      that row only has `claimed_person_id`, a uuid with no human-readable
--      label — this function is what lets `/member` and `/account` render
--      "your claim on <name>" instead of a bare id, without the
--      display_name of a merged or already-linked person otherwise being
--      reachable at all (search_claimable_people deliberately excludes
--      both from its own results).
--   3. `is_person_claimable(p_person_id)` — re-check, at claim-submission
--      time, that one specific person id is still eligible. The claim
--      Server Action cannot safely reuse `search_claimable_people`'s
--      `LIMIT 25` result set for this: the selected person may not be
--      among the first 25 alphabetically, which would make a real,
--      still-eligible claim look ineligible. This function answers the
--      narrower, exact question the submission path actually needs.
--   4. `submit_profile_claim(p_person_id, p_supporting_evidence)` — the
--      sole sanctioned way to create a `profile_claims` row (see "Revoke
--      the now-unnecessary direct INSERT grant" near the end of this
--      file). Performs eligibility checking and the insert atomically,
--      inside one function invocation, closing a real check-then-act race
--      the original three-round-trip version of
--      `src/features/identity/actions/submit-claim.ts` had.
--
-- This migration also adds one new constraint —
-- `profile_claims_one_active_or_approved_per_claimant_idx` — and revokes
-- `authenticated`'s direct `INSERT` grant on `profile_claims`, both added
-- during an M5.3 security-correction pass after the functions above were
-- first written; see their own sections below for the reasoning,
-- including a real privilege-escalation gap the INSERT revoke closes.
--
-- See docs/decisions/0008-claim-discovery-security-definer-function.md for
-- the full architectural reasoning, including why both are SECURITY
-- DEFINER functions rather than an RLS policy + GRANT directly on
-- `people`.
--
-- Threat model / design summary:
--   * `people` remains fully locked down at the table level — this
--     migration adds NO GRANT and NO RLS policy on `public.people`. Every
--     protection already in place (see supabase/migrations/
--     20260801013649_create_identity_foundation.sql, "Grants" section) is
--     untouched: `authenticated` still has zero privilege to query
--     `public.people` directly, before or after this migration.
--   * The only new capability is EXECUTE on this one function, granted to
--     `authenticated` only — never `anon`, never `PUBLIC`.
--   * SECURITY DEFINER lets the function read `public.people` (a table its
--     caller has no privilege to query directly) while the function body
--     itself enforces every restriction that would otherwise come from a
--     GRANT/RLS policy: authentication is required (raises if `auth.uid()`
--     is null — an unauthenticated caller cannot forge this), the caller's
--     identity is never taken as an input (the only parameter is a
--     free-text search string — there is no way to pass an arbitrary
--     account/user id in, so a caller cannot ask the function to act as
--     someone else), and the result set is filtered to eligible rows
--     before it ever leaves the function, not left to the caller to
--     filter client-side.
--   * `search_path` is pinned to `public, pg_temp` (the same pattern
--     `withdraw_profile_claim` already uses in the M3.1 migration) to
--     prevent the standard SECURITY DEFINER search-path-hijack, where an
--     attacker-controlled schema earlier in the resolution path could
--     shadow an unqualified reference. Every table/function reference in
--     the body below is additionally schema-qualified (`public.people`,
--     `public.user_person_links`, `auth.uid()`) so correctness never
--     depends on search_path resolution in the first place — pinning it
--     is defense-in-depth on top of that, not the only protection.
--   * Returned columns are deliberately minimal: `id` and `display_name`
--     only. No date of birth/death, biography, verification_status,
--     source_type, created_by_user_id, or any other column — per
--     docs/privacy-model.md's core rule ("unregistered people are never
--     public by default"), an unclaimed person's information defaults to
--     the most restrictive appropriate visibility, and `display_name` is
--     the one field `docs/database-schema.md`'s `people` entry already
--     expects to be the sole default-visible field, typically at the
--     registered-members level this function's `authenticated`-only grant
--     matches. `people` has no email/contact/internal-note columns at
--     all, so there is nothing of that kind to accidentally expose here
--     regardless.
--   * Ineligible people are excluded inside the function, not left to the
--     caller to filter: a `verification_status = 'merged'` record (a
--     resolved duplicate, redirected elsewhere — see the Status Models
--     section of docs/database-schema.md) and any person with an *active*
--     `user_person_links` row (already claimed by someone) are both
--     omitted from every result set, regardless of search term — this is
--     the database-level half of "Safe duplicate prevention" (the other
--     half, preventing a duplicate claim once selected, is already
--     enforced by `profile_claims_one_active_pair_idx` etc. from M3.1).

-- Trigram search support. Not added in M3.1 because "no search feature
-- exists to justify it" (see docs/database-implementation.md) — this
-- migration is that search feature, so the index docs/database-schema.md
-- already suggested ("Suggested indexes: Trigram/GIN index on
-- display_name") is added now, scoped to exactly the column this
-- function reads.
create extension if not exists pg_trgm;

create index people_display_name_trgm_idx
  on public.people
  using gin (display_name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Account-level duplicate-claim invariant (security correction)
-- ---------------------------------------------------------------------
--
-- M3.1 already enforces, at the database level: at most one *pending*
-- claim per (claimant, person) pair
-- (`profile_claims_one_active_pair_idx`) and at most one *ever-approved*
-- claim per claimant, full stop
-- (`profile_claims_one_approved_per_claimant_idx`) — both in
-- 20260801013649_create_identity_foundation.sql. Neither one, alone or
-- together, stops a single claimant from holding *simultaneous* pending
-- claims on *different* people at once: nothing in the schema prevented
-- claimant X having a `submitted` claim on person A and another
-- `submitted` claim on person B at the same time. The application layer
-- (`src/features/identity/derive-status.ts`'s `hasActiveOrApprovedClaim`,
-- called from the original, now-replaced version of
-- `submit-claim.ts`) tried to enforce "at most one active-or-approved
-- claim per account" with a check-then-insert sequence — not a
-- sufficient guarantee, since two concurrent requests (two tabs, a
-- retried request, or any direct database access bypassing the app
-- entirely) can both pass the check before either has inserted.
--
-- The actual product rule (M5.3 brief, "Safe duplicate prevention": "one
-- account claiming multiple people simultaneously" must be prevented
-- unless explicitly allowed, and nothing in
-- docs/product-specification.md allows it) is exactly "one
-- submitted/under_review/approved claim per account, at a time" —
-- enforced here the same way the two existing invariants are, with a
-- partial unique index using the table's real column name
-- (`claimant_user_id`) and the exact, already-documented status
-- vocabulary (`profile_claims_status_valid`). No new status value is
-- introduced.
--
-- This index actually subsumes
-- `profile_claims_one_approved_per_claimant_idx` going forward — a second
-- row can never even be *inserted* as `submitted` while an earlier row
-- for the same claimant is still `submitted`/`under_review`/`approved`,
-- so it can never later be flipped to a second `approved` row either —
-- but the older index is kept anyway as defense-in-depth against a direct
-- `UPDATE` (e.g. a future admin-approval path) that flips an
-- already-existing row's status without ever going through this index's
-- INSERT path.
create unique index profile_claims_one_active_or_approved_per_claimant_idx
  on public.profile_claims (claimant_user_id)
  where status in ('submitted', 'under_review', 'approved');

create function public.search_claimable_people(p_query text default null)
returns table (id uuid, display_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text;
begin
  -- No anonymous access: SECURITY DEFINER bypasses the privilege checks
  -- Postgres would otherwise apply to the tables this function touches,
  -- so authentication must be enforced here rather than relying on a
  -- GRANT alone. auth.uid() resolves to the calling session's
  -- JWT-verified user id; it cannot be supplied or spoofed by the caller
  -- — there is no id parameter on this function at all.
  if auth.uid() is null then
    raise exception 'search_claimable_people: authentication required';
  end if;

  -- Defensive normalization: trim, cap length (a search string has no
  -- legitimate reason to be long), and treat blank as "no filter" — a
  -- browse, not a search — rather than a pattern that would happen to
  -- ILIKE-match every row for an unrelated reason.
  v_query := left(btrim(coalesce(p_query, '')), 200);

  return query
    select p.id, p.display_name
    from public.people p
    where p.verification_status <> 'merged'
      and not exists (
        select 1
        from public.user_person_links upl
        where upl.person_id = p.id
          and upl.status = 'active'
      )
      and (
        v_query = ''
        or p.display_name ilike '%' || v_query || '%'
      )
    order by p.display_name
    limit 25;
end;
$$;

comment on function public.search_claimable_people(text) is
  'Authenticated-only claim-discovery search over public.people. Returns '
  'only id and display_name, for people who are not merged and not '
  'already actively linked to an account. SECURITY DEFINER: see the block '
  'comment immediately above this function for the full threat model. '
  'Never grant EXECUTE to anon or PUBLIC.';

-- Same closing pattern as withdraw_profile_claim(): explicitly revoke the
-- default PUBLIC EXECUTE grant Postgres applies to every newly created
-- function, then grant only to the one role that should have it. This is
-- what makes the "grant EXECUTE only to authenticated" requirement a real
-- guarantee rather than an assumption — without the revoke, anon would
-- inherit EXECUTE through the implicit PUBLIC grant despite never being
-- mentioned in a GRANT statement.
revoke all on function public.search_claimable_people(text) from public;
grant execute on function public.search_claimable_people(text) to authenticated;

-- ---------------------------------------------------------------------
-- get_claimed_person_display_name
-- ---------------------------------------------------------------------
--
-- Narrower than search_claimable_people in the opposite direction: this
-- function does not filter by eligibility at all (a rejected or withdrawn
-- claim's target may well be merged or already linked to someone else by
-- now — the claimant should still be able to see what their own claim
-- history refers to). Instead, it gates on a different, stronger
-- condition: the caller must already have a `profile_claims` row — in any
-- status — asserting a relationship to that specific person. Proving "you
-- once claimed this person" is what authorizes seeing their name here; an
-- arbitrary person_id with no such claim returns null, not an error, so
-- this cannot be used as an existence oracle for `people` rows in general
-- (a null is returned identically whether the id doesn't exist or the
-- caller simply never claimed it).
--
-- Reviewed during the M5.3 security-correction pass against the
-- narrower-still standard "visible through the caller's own claim OR
-- approved link": no code change was needed here, because those two are
-- not actually independent authorization paths to check separately. Every
-- *active* `user_person_links` row is created only from an *approved*
-- `profile_claims` row for the identical `(user_id, person_id)` pair —
-- enforced by `user_person_links_validate_source_claim` — so anyone with
-- an active link necessarily also has a matching `profile_claims` row the
-- `exists (...)` clause below already finds. There is no scenario where a
-- caller holds a link but not the claim that produced it. See
-- supabase/tests/database/claim_discovery.test.sql for the coverage this
-- pass added specifically proving another account cannot retrieve a name
-- through this function.

create function public.get_claimed_person_display_name(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'get_claimed_person_display_name: authentication required';
  end if;

  select p.display_name
  into v_display_name
  from public.people p
  where p.id = p_person_id
    and exists (
      select 1
      from public.profile_claims pc
      where pc.claimed_person_id = p.id
        and pc.claimant_user_id = auth.uid()
    );

  return v_display_name;
end;
$$;

comment on function public.get_claimed_person_display_name(uuid) is
  'Returns the display_name of a person the calling user has (or had) a '
  'profile_claims row for, in any status -- null otherwise. SECURITY '
  'DEFINER: see the block comment at the top of this migration and '
  'docs/decisions/0008-claim-discovery-security-definer-function.md. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.get_claimed_person_display_name(uuid) from public;
grant execute on function public.get_claimed_person_display_name(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- is_person_claimable
-- ---------------------------------------------------------------------
--
-- The exact eligibility predicate from search_claimable_people
-- (verification_status <> 'merged', no active user_person_links row),
-- applied to exactly one id instead of a LIMIT 25 search result set. Used
-- by the claim-submission Server Action to re-confirm eligibility for the
-- one specific person the caller selected, without the pagination pitfall
-- described above. Kept as a separate function rather than folding into
-- search_claimable_people (e.g. an optional p_person_id parameter)
-- because the two answer genuinely different questions ("what am I
-- allowed to browse/search" vs. "is this one specific id still valid
-- right now") and conflating them would make either call site have to
-- reason about parameters it doesn't use.
--
-- NOTE: the eligibility predicate here is intentionally duplicated from
-- search_claimable_people rather than factored into a shared SQL
-- function, since PL/pgSQL has no cheap way to share a boolean predicate
-- across two SECURITY DEFINER functions without introducing a third
-- function purely for that purpose. If this predicate changes, update
-- both functions together — grep for `verification_status <> 'merged'`
-- in this file to find every place it appears.

create function public.is_person_claimable(p_person_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'is_person_claimable: authentication required';
  end if;

  return exists (
    select 1
    from public.people p
    where p.id = p_person_id
      and p.verification_status <> 'merged'
      and not exists (
        select 1
        from public.user_person_links upl
        where upl.person_id = p.id
          and upl.status = 'active'
      )
  );
end;
$$;

comment on function public.is_person_claimable(uuid) is
  'Re-checks, for exactly one person id, the same eligibility predicate '
  'search_claimable_people applies to its result set -- used at claim '
  'submission time. Returns false for a nonexistent id, a merged '
  'person, or an actively-linked person alike -- never an error, so this '
  'cannot be used to distinguish "does not exist" from "not eligible." '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.is_person_claimable(uuid) from public;
grant execute on function public.is_person_claimable(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- submit_profile_claim (security correction: atomic claim submission)
-- ---------------------------------------------------------------------
--
-- Replaces the three-separate-round-trip sequence the first version of
-- src/features/identity/actions/submit-claim.ts used: check
-- is_person_claimable(), check the caller's existing claims, then insert.
-- That sequence was not atomic — eligibility (and, before the index
-- above existed, the duplicate check too) could change between a check
-- and the insert that followed it, a classic check-then-act race
-- exploitable by concurrent requests, not just a hypothetical attacker
-- bypassing the app entirely.
--
-- This function performs the eligibility check and the insert inside one
-- function invocation, which Postgres executes as a single atomic unit
-- within the calling transaction — there is no window between "checked
-- eligible" and "inserted" for another session's write to land in
-- between. Duplicate prevention itself is enforced by the unique indexes
-- (this file's index above, plus M3.1's
-- profile_claims_one_active_pair_idx) at INSERT time regardless of what
-- any prior check saw — that is what makes it correct under concurrency
-- at all; this function's own pre-check exists only to raise a clear,
-- specific exception instead of a raw constraint-violation error.
--
-- Contract:
--   * the claimant is always auth.uid() — there is no claimant/user-id
--     parameter of any kind, so one account can never submit, or even
--     attempt to submit, a claim "as" another account;
--   * no status, reviewer, decision, or link field can be supplied by the
--     caller — the only parameters are the person id and free-text
--     evidence; the inserted row always gets the status column's own
--     default, 'submitted';
--   * the return value is deliberately minimal (id, status,
--     submitted_at) — never supporting_evidence (the caller already has
--     whatever they just typed; echoing it back is unnecessary) and
--     never any reviewer/administrative field, since none exist yet on a
--     freshly submitted row anyway.
create function public.submit_profile_claim(
  p_person_id uuid,
  p_supporting_evidence text default null
)
returns table (id uuid, status text, submitted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_evidence text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'submit_profile_claim: authentication required';
  end if;

  if p_person_id is null then
    raise exception 'submit_profile_claim: a person id is required';
  end if;

  -- Same normalization discipline as search_claimable_people: trim, cap
  -- length, blank -> null. This is free text a reviewer reads later, not
  -- executed or interpreted by this function.
  v_evidence := nullif(left(btrim(coalesce(p_supporting_evidence, '')), 2000), '');

  -- Eligibility, checked in the same transaction as the insert below —
  -- see is_person_claimable()'s comment for the identical predicate and
  -- why it's duplicated rather than shared.
  if not exists (
    select 1
    from public.people p
    where p.id = p_person_id
      and p.verification_status <> 'merged'
      and not exists (
        select 1
        from public.user_person_links upl
        where upl.person_id = p.id
          and upl.status = 'active'
      )
  ) then
    raise exception 'submit_profile_claim: person is not eligible to be claimed';
  end if;

  begin
    return query
      insert into public.profile_claims (claimant_user_id, claimed_person_id, supporting_evidence)
      values (v_user_id, p_person_id, v_evidence)
      returning profile_claims.id, profile_claims.status, profile_claims.submitted_at;
  exception
    when unique_violation then
      -- Covers both profile_claims_one_active_or_approved_per_claimant_idx
      -- (this claimant already has an active/approved claim on any
      -- person) and profile_claims_one_active_pair_idx (a pending claim
      -- on this exact person already exists for this claimant) — either
      -- way, the caller-facing message is the same: nothing was
      -- inserted, act on the existing claim instead of retrying.
      raise exception 'submit_profile_claim: you already have a claim in progress or an approved link';
  end;
end;
$$;

comment on function public.submit_profile_claim(uuid, text) is
  'Atomically validates eligibility and inserts a new profile_claims row '
  'for the calling user (auth.uid()) -- never a caller-supplied account '
  'id. Always inserts status = ''submitted''; no status/reviewer/link '
  'field can be supplied by the caller. SECURITY DEFINER: see the block '
  'comment immediately above this function and '
  'docs/decisions/0008-claim-discovery-security-definer-function.md. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.submit_profile_claim(uuid, text) from public;
grant execute on function public.submit_profile_claim(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Revoke the now-unnecessary direct INSERT grant on profile_claims
-- ---------------------------------------------------------------------
--
-- Security finding from this pass: the M3.1 migration granted
-- `authenticated` a raw `INSERT` on `profile_claims`, protected only by
-- the RLS `WITH CHECK (claimant_user_id = auth.uid())`. That policy
-- constrains *ownership*, not *content* — it does not restrict `status`,
-- `reviewer_admin_id`, or `decided_at` at all. Nothing stopped an
-- authenticated client from issuing, directly:
--
--   INSERT INTO profile_claims
--     (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
--   VALUES (auth.uid(), <any person>, 'approved', <any other real user id>, now());
--
-- which satisfies every CHECK constraint on the table
-- (`profile_claims_reviewer_required_on_decision`, and
-- `profile_claims_no_self_review` — the supplied reviewer only has to be
-- a real, *different* auth.users id, not an actual reviewer; an attacker
-- controlling two accounts could supply their own second account) and the
-- RLS policy, producing a self-fabricated `approved` claim with no real
-- review ever having happened. `user_person_links` itself stays
-- unreachable (no grant to `authenticated`), so this could not create a
-- real link — but `src/features/identity/derive-status.ts` derives its
-- "approved / linked" UI state from `profile_claims.status` alone, so a
-- row like this would have made `/member` and `/account` falsely display
-- "your account is linked" to the fabricating user.
--
-- `submit_profile_claim()` above is now the only sanctioned way to create
-- a `profile_claims` row: it runs as the function's own (non-`authenticated`)
-- owner, so it needs no `INSERT` grant on the table for `authenticated`
-- at all, and it never accepts a status/reviewer/decision value from the
-- caller in the first place. This revoke is what actually closes the raw
-- path, rather than merely adding a safer alternative alongside it that
-- an attacker could simply ignore. `SELECT` is untouched — claimants
-- still read their own rows directly, unchanged from M3.1.
revoke insert on public.profile_claims from authenticated;
