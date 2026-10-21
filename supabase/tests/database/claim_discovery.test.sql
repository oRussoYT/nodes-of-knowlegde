-- pgTAP tests for Milestone M5.3: claim discovery search function.
--
-- Run locally via: npm run supabase:test  (supabase test db)
-- Requires: `supabase start` already running (Docker). NOT executed in
-- the environment this file was written in -- no Docker/CLI binary was
-- available there, same limitation documented in
-- docs/database-implementation.md and docs/supabase-development.md.
-- Please run these yourself before relying on them.
--
-- Scope: only public.search_claimable_people() and the guarantees around
-- it. Coverage for profile_claims/user_person_links themselves already
-- exists in supabase/tests/database/identity_foundation.test.sql and is
-- not repeated here.

create extension if not exists pgtap;

begin;

select plan(33);

\set user_a '11111111-1111-1111-1111-111111111111'
\set person_findable '33333333-3333-3333-3333-333333333333'
\set person_other '44444444-4444-4444-4444-444444444444'
\set person_merged '55555555-5555-5555-5555-555555555555'
\set person_linked '66666666-6666-6666-6666-666666666666'
-- Reviewer identity for the two approved/decided fixture claims below.
-- Deliberately not user_a (or any other claimant used anywhere in this
-- file): profile_claims_no_self_review requires reviewer_admin_id to
-- differ from claimant_user_id, so a fixture that sets both to the same
-- id is not a valid row under the real schema -- it isn't a case this
-- file should be able to construct at all. reviewer_x exists purely to
-- play that "some other real account decided this claim" role; nothing
-- in either fixture's downstream assertions depends on which specific
-- account it is, only that it is a genuine, distinct auth.users row (no
-- admin role/table exists to draw from instead -- see docs/decisions/
-- 0001-separate-people-from-user-accounts.md and
-- docs/database-implementation.md).
\set reviewer_x '99999999-9999-9999-9999-999999999999'

-- ---------------------------------------------------------------------
-- Fixture isolation from supabase/seed.sql
-- ---------------------------------------------------------------------
--
-- `supabase db reset` loads supabase/seed.sql -- two public.people rows,
-- "Ada Lovelace" and "Grace Hopper" -- *before* `supabase test db` runs
-- this file (seed.sql deliberately reuses these exact names; see its own
-- comment). Every count/name-based assertion below was written assuming
-- this file's own fixtures were the only rows in public.people -- true
-- in isolation, false once seed data is also present: a "browsing
-- returns exactly N eligible people" count silently includes whatever
-- real/seed rows also happen to be eligible, and a scalar subquery keyed
-- on a display_name search term fails outright (a genuine Postgres
-- "more than one row returned by a subquery used as an expression"
-- error, not just a wrong number) once more than one row shares that
-- name.
--
-- Fixed at the root, not patched per-assertion: this file clears
-- public.people before creating any fixture of its own. This is safe
-- and fully self-contained -- seed.sql inserts no profile_claims or
-- user_person_links rows of its own, so nothing in this schema
-- references a people row that predates this delete; the delete is
-- rolled back like everything else this file does (see `begin;` /
-- `rollback;` at the top and bottom of this file), so seed.sql's rows
-- are back exactly as they were the moment this file's transaction
-- ends; and every assertion below is now correct regardless of what
-- seed.sql (now, or after some future addition) happens to contain --
-- this file no longer needs to know seed data exists at all. Scoped to
-- public.people only, the one table this file's fixtures and seed.sql
-- actually share.
-- Independence: clear the NO ACTION people-child tables before people so this
-- suite does not abort on committed rows the e2e claim-workflow may leave on
-- the seeded people (profile_claims/user_person_links reference people ON
-- DELETE NO ACTION; both are empty in every other suite). No constraint is
-- weakened and FK enforcement stays on.
delete from public.user_person_links;
delete from public.profile_claims;
delete from public.people;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'reviewer_x', 'authenticated', 'authenticated', 'reviewer-x@example.test', 'not-a-real-hash', now(), now(), now());

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'person_findable', 'Ada', 'Lovelace', 'Ada Lovelace', 'provisional', 'imported_historical'),
  (:'person_other', 'Grace', 'Hopper', 'Grace Hopper', 'provisional', 'admin_entered'),
  (:'person_merged', 'Duplicate', 'Record', 'Duplicate Record', 'merged', 'admin_entered'),
  (:'person_linked', 'Already', 'Linked', 'Already Linked', 'verified_self', 'self_reported');

-- Back person_linked with a real approved claim + active link, the same
-- way identity_foundation.test.sql does, so this exercises the actual
-- "already linked" condition the function checks rather than a
-- hand-set verification_status alone. Reviewed by reviewer_x, not
-- user_a: an approved claim reviewed by its own claimant violates
-- profile_claims_no_self_review and cannot exist under the real schema
-- -- see the reviewer_x comment above.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values (:'user_a', :'person_linked', 'approved', :'reviewer_x', now());

insert into public.user_person_links (user_id, person_id, source_claim_id)
select :'user_a', :'person_linked', id
from public.profile_claims
where claimant_user_id = :'user_a' and claimed_person_id = :'person_linked';

-- ---------------------------------------------------------------------
-- 1. Function shape: exactly the two documented OUT columns, and exactly
--    one IN parameter -- a caller-supplied account/user id is not merely
--    unused, it is structurally impossible to pass.
-- ---------------------------------------------------------------------

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public'
      and parameter_mode = 'OUT'
      and specific_name in (
        select specific_name from information_schema.routines
        where routine_schema = 'public' and routine_name = 'search_claimable_people'
      )
  $sql$,
  ARRAY['id', 'display_name'],
  'search_claimable_people returns exactly id and display_name -- no other column'
);

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public'
      and parameter_mode = 'IN'
      and specific_name in (
        select specific_name from information_schema.routines
        where routine_schema = 'public' and routine_name = 'search_claimable_people'
      )
  $sql$,
  ARRAY['p_query'],
  'search_claimable_people accepts only a free-text query -- never a caller-supplied account/user id'
);

-- ---------------------------------------------------------------------
-- 2. Hardening: SECURITY DEFINER with a pinned search_path, exactly as
--    documented in the migration's threat-model comment.
-- ---------------------------------------------------------------------

select ok(
  (
    select prosecdef from pg_proc
    where proname = 'search_claimable_people' and pronamespace = 'public'::regnamespace
  ),
  'search_claimable_people is SECURITY DEFINER'
);

select ok(
  (
    select proconfig @> ARRAY['search_path=public, pg_temp']
    from pg_proc
    where proname = 'search_claimable_people' and pronamespace = 'public'::regnamespace
  ),
  'search_claimable_people pins search_path to public, pg_temp'
);

-- ---------------------------------------------------------------------
-- 3. Anonymous access is denied at the privilege layer -- no GRANT to
--    anon or PUBLIC exists, so this fails before the function body ever
--    runs.
-- ---------------------------------------------------------------------

set local role anon;

select throws_ok(
  $sql$ select * from public.search_claimable_people() $sql$,
  '42501',
  null,
  'anonymous role has no privilege to call search_claimable_people at all'
);

reset role;

-- ---------------------------------------------------------------------
-- 4. authenticated role without a resolvable auth.uid() (no JWT sub
--    claim set) is rejected by the function's own internal check, not
--    just by the GRANT -- this is the defense-in-depth the threat model
--    comment describes.
-- ---------------------------------------------------------------------

set local role authenticated;

select throws_ok(
  $sql$ select * from public.search_claimable_people() $sql$,
  'P0001',
  'search_claimable_people: authentication required',
  'a session with no resolvable auth.uid() is rejected even though the authenticated role itself has EXECUTE'
);

reset role;

-- ---------------------------------------------------------------------
-- 5. A genuinely authenticated caller can browse (empty query) and
--    search (matching query), and results are limited to the documented
--    columns and eligible rows.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is(
  (select count(*)::int from public.search_claimable_people()),
  2,
  'browsing (no query) returns exactly the eligible, non-merged, non-linked people'
);

-- Scoped to the fixture's own id, not its display_name: a scalar
-- subquery keyed on a name string is only ever safe to assume returns
-- one row if this file can guarantee it is the only row with that name
-- -- true today only because of the public.people cleanup above, and a
-- assumption this assertion shouldn't have to depend on. id is
-- available (person_findable), so it is what gets checked here,
-- consistent with "prove this specific fixture is returned," not
-- "assume nothing else in the table is named similarly."
select is(
  (select id from public.search_claimable_people('lovelace')),
  :'person_findable'::uuid,
  'a matching search term returns the matching eligible person, by id'
);

select is(
  (select count(*)::int from public.search_claimable_people('lovelace')),
  1,
  'a matching search term does not also return unrelated eligible people'
);

-- ---------------------------------------------------------------------
-- 6. Eligibility filtering: merged and actively-linked people are never
--    returned, even when the search term matches their display_name
--    exactly.
-- ---------------------------------------------------------------------

select is(
  (select count(*)::int from public.search_claimable_people('Duplicate Record')),
  0,
  'a merged person is excluded from results even when the search term matches exactly'
);

select is(
  (select count(*)::int from public.search_claimable_people('Already Linked')),
  0,
  'an already actively-linked person is excluded from results even when the search term matches exactly'
);

reset role;

-- ---------------------------------------------------------------------
-- 7. get_claimed_person_display_name: hardening, denial, and the
--    "proof of a claim, in any status, authorizes the name" behavior.
-- ---------------------------------------------------------------------

select ok(
  (
    select prosecdef from pg_proc
    where proname = 'get_claimed_person_display_name' and pronamespace = 'public'::regnamespace
  ),
  'get_claimed_person_display_name is SECURITY DEFINER'
);

select ok(
  (
    select proconfig @> ARRAY['search_path=public, pg_temp']
    from pg_proc
    where proname = 'get_claimed_person_display_name' and pronamespace = 'public'::regnamespace
  ),
  'get_claimed_person_display_name pins search_path to public, pg_temp'
);

set local role anon;

select throws_ok(
  format($sql$ select public.get_claimed_person_display_name('%s') $sql$, :'person_other'),
  '42501',
  null,
  'anonymous role has no privilege to call get_claimed_person_display_name at all'
);

reset role;

-- A rejected (terminal, non-active) claim still lets the claimant see the
-- name -- eligibility filtering (as used by search_claimable_people) does
-- not apply here, since this function answers a different question ("what
-- does my own claim history refer to"), not "what can I newly claim."
-- Reviewed by reviewer_x for the same reason as the person_linked fixture
-- above -- a self-reviewed rejection is equally invalid under
-- profile_claims_no_self_review, and the specific reviewer identity has
-- no bearing on what this fixture is used to prove below.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values (:'user_a', :'person_other', 'rejected', :'reviewer_x', now());

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is(
  (select public.get_claimed_person_display_name(:'person_other')),
  'Grace Hopper',
  'a claimant can see the name behind their own claim, even a rejected one'
);

select is(
  (select public.get_claimed_person_display_name(:'person_findable')),
  null,
  'a person the caller never filed a claim on returns null, not the name or an error'
);

reset role;

-- ---------------------------------------------------------------------
-- 8. is_person_claimable: same eligibility predicate as
--    search_claimable_people, applied to one id at a time.
-- ---------------------------------------------------------------------

set local role anon;

select throws_ok(
  format($sql$ select public.is_person_claimable('%s') $sql$, :'person_findable'),
  '42501',
  null,
  'anonymous role has no privilege to call is_person_claimable at all'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select ok(
  (select public.is_person_claimable(:'person_findable')),
  'an eligible, unclaimed person is reported claimable'
);

select ok(
  not (select public.is_person_claimable(:'person_merged')),
  'a merged person is reported not claimable'
);

select ok(
  not (select public.is_person_claimable(:'person_linked')),
  'an already actively-linked person is reported not claimable'
);

select ok(
  not (select public.is_person_claimable('99999999-9999-9999-9999-999999999999')),
  'a nonexistent person id is reported not claimable, not an error'
);

reset role;

-- ---------------------------------------------------------------------
-- 9. Account-level duplicate prevention:
--    profile_claims_one_active_or_approved_per_claimant_idx blocks a
--    second active/approved claim for the same claimant even when the
--    insert bypasses every application-layer check entirely -- e.g. a
--    direct database call, a migration script, or (as exercised here)
--    any role with a plain INSERT privilege on the table. user_a already
--    holds an *approved* claim (on person_linked, from the fixture at
--    the top of this file); the partial unique index treats
--    submitted/under_review/approved as the same "already has one"
--    state, so a raw insert of a *submitted* claim on a *different*
--    person is still rejected -- this is also the "duplicate active
--    claims across different people" case, proven here at the schema
--    level rather than through submit_profile_claim(), so the guarantee
--    does not depend on that function's own logic being correct or even
--    being the only insert path.
-- ---------------------------------------------------------------------

select throws_ok(
  format($sql$
    insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
    values ('%s', '%s', 'submitted', 'bypass attempt via a raw insert, not through submit_profile_claim()')
  $sql$, :'user_a', :'person_findable'),
  '23505',
  null,
  'profile_claims_one_active_or_approved_per_claimant_idx rejects a second active/approved claim for the same claimant, even via a raw insert that bypasses every application-layer and function-level check'
);

-- ---------------------------------------------------------------------
-- 10. submit_profile_claim: shape, hardening, and anonymous denial.
-- ---------------------------------------------------------------------

\set user_b '22222222-2222-2222-2222-222222222222'
\set user_c '77777777-7777-7777-7777-777777777777'
\set person_fresh '88888888-8888-8888-8888-888888888888'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'user_b', 'authenticated', 'authenticated', 'user-b@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'user_c', 'authenticated', 'authenticated', 'user-c@example.test', 'not-a-real-hash', now(), now(), now());

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'person_fresh', 'Fresh', 'Person', 'Fresh Person', 'provisional', 'imported_historical');

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public'
      and parameter_mode = 'IN'
      and specific_name in (
        select specific_name from information_schema.routines
        where routine_schema = 'public' and routine_name = 'submit_profile_claim'
      )
  $sql$,
  ARRAY['p_person_id', 'p_supporting_evidence'],
  'submit_profile_claim accepts only a person id and optional evidence text -- no claimant, status, reviewer, or link id of any kind'
);

select ok(
  (
    select prosecdef from pg_proc
    where proname = 'submit_profile_claim' and pronamespace = 'public'::regnamespace
  ),
  'submit_profile_claim is SECURITY DEFINER'
);

select ok(
  (
    select proconfig @> ARRAY['search_path=public, pg_temp']
    from pg_proc
    where proname = 'submit_profile_claim' and pronamespace = 'public'::regnamespace
  ),
  'submit_profile_claim pins search_path to public, pg_temp'
);

set local role anon;

select throws_ok(
  format($sql$ select * from public.submit_profile_claim('%s') $sql$, :'person_fresh'),
  '42501',
  null,
  'anonymous role has no privilege to call submit_profile_claim at all'
);

reset role;

-- ---------------------------------------------------------------------
-- 11. submit_profile_claim: eligibility, successful submission, and
--     duplicate rejection -- exercised by a fresh claimant (user_c) so
--     this section does not depend on user_a's claim history above.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'user_c';

select throws_ok(
  format($sql$ select * from public.submit_profile_claim('%s') $sql$, :'person_merged'),
  'P0001',
  'submit_profile_claim: person is not eligible to be claimed',
  'a merged person is rejected by submit_profile_claim itself, not just by search_claimable_people'
);

select throws_ok(
  format($sql$ select * from public.submit_profile_claim('%s') $sql$, :'person_linked'),
  'P0001',
  'submit_profile_claim: person is not eligible to be claimed',
  'an already actively-linked person is rejected by submit_profile_claim itself, not just by search_claimable_people'
);

select id, status, submitted_at
from public.submit_profile_claim(:'person_fresh', 'Evidence for a fresh claim.') \gset fresh_claim_

-- :'fresh_claim_status' is a psql client-side variable captured by the
-- \gset above -- by the time it's substituted back into this statement
-- it is just a quoted text literal, with no memory that it originated
-- from a `text` column. Paired here with another bare literal
-- ('submitted'), pgTAP's is(anyelement, anyelement, text) has no
-- non-unknown-typed argument to resolve anyelement against, which is
-- exactly "could not determine polymorphic type because input has type
-- unknown". The narrow fix is an explicit cast to the real column type
-- (profile_claims.status / submit_profile_claim's returned status
-- column are both `text`), not a different assertion -- this still
-- proves the exact same thing: the captured status literally equals the
-- string 'submitted'.
select is(
  :'fresh_claim_status'::text,
  'submitted',
  'a successful submission always has status ''submitted'' -- the column default, never a client-supplied value'
);

select is(
  (select claimant_user_id::text from public.profile_claims where id = :'fresh_claim_id'),
  :'user_c',
  'a successful submission''s claimant_user_id is always the caller (auth.uid()), never a client-supplied value'
);

select throws_ok(
  format($sql$ select * from public.submit_profile_claim('%s') $sql$, :'person_fresh'),
  'P0001',
  'submit_profile_claim: you already have a claim in progress or an approved link',
  'a second submission for the same person by the same claimant is rejected'
);

reset role;

-- ---------------------------------------------------------------------
-- 12. get_claimed_person_display_name: cross-account and
--     unrelated-record non-disclosure -- proving the ADR-0008 addendum's
--     "reviewed, found already correct" conclusion rather than just
--     asserting it.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'user_b';

select is(
  (select public.get_claimed_person_display_name(:'person_other')),
  null,
  'a different account cannot retrieve the name behind another account''s claim through this function'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'user_c';

select is(
  (select public.get_claimed_person_display_name(:'person_merged')),
  null,
  'a merged record with no claim by the caller is not disclosed through this function'
);

reset role;

select * from finish();

rollback;
