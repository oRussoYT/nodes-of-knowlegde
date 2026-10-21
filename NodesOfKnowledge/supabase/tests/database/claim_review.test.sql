-- pgTAP tests for Milestone M5.4: claim review, approval, and provenance
-- foundation.
--
-- Run locally via: npm run supabase:test  (supabase test db)
-- Requires: `supabase start` already running (Docker). NOT executed in
-- the environment this file was written in -- no Docker/CLI binary was
-- available there, same limitation documented in
-- docs/database-implementation.md and docs/supabase-development.md.
-- Please run these yourself before relying on them.
--
-- Scope: public.reviewers and the six functions added by
-- supabase/migrations/20260802130000_add_claim_review_governance.sql
-- (is_active_reviewer, am_i_a_reviewer, list_claims_for_review,
-- get_claim_review_detail, begin_claim_review, approve_profile_claim,
-- reject_profile_claim), plus the profile_claims column-grant tightening
-- in the same migration. Coverage for profile_claims/user_person_links
-- themselves (submission, withdrawal, discovery) already exists in
-- identity_foundation.test.sql and claim_discovery.test.sql and is not
-- repeated here except where this milestone's functions interact with
-- those existing invariants.

create extension if not exists pgtap;

begin;

select plan(75);

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
--
-- Isolated from supabase/seed.sql the same way claim_discovery.test.sql
-- is: this file's own assertions never depend on what seed.sql happens
-- to contain, so public.people is cleared before any fixture of this
-- file's own is created. Rolled back at the end like everything else.
-- Independence: clear the NO ACTION people-child tables before people so this
-- suite does not abort on committed rows the e2e claim-workflow may leave on
-- the seeded people (profile_claims/user_person_links reference people ON
-- DELETE NO ACTION; both are empty in every other suite). No constraint is
-- weakened and FK enforcement stays on.
delete from public.user_person_links;
delete from public.profile_claims;
delete from public.people;

\set reviewer_active 'b0000000-0000-0000-0000-000000000001'
\set reviewer_revoked 'b0000000-0000-0000-0000-000000000002'
\set reviewer_second 'b0000000-0000-0000-0000-000000000003'
\set ordinary_user 'b0000000-0000-0000-0000-000000000004'
\set claimant_begin 'b0000000-0000-0000-0000-000000000005'
\set claimant_approve 'b0000000-0000-0000-0000-000000000006'
\set claimant_reject 'b0000000-0000-0000-0000-000000000007'
\set claimant_terminal 'b0000000-0000-0000-0000-000000000008'
\set claimant_link_bypass 'b0000000-0000-0000-0000-000000000009'
\set claimant_person_conflict 'b0000000-0000-0000-0000-000000000010'
\set claimant_existing_link 'b0000000-0000-0000-0000-000000000011'

\set person_begin 'c0000000-0000-0000-0000-000000000001'
\set person_approve 'c0000000-0000-0000-0000-000000000002'
\set person_reject 'c0000000-0000-0000-0000-000000000003'
\set person_selfreview 'c0000000-0000-0000-0000-000000000004'
\set person_withdrawn 'c0000000-0000-0000-0000-000000000005'
\set person_rejected_existing 'c0000000-0000-0000-0000-000000000006'
\set person_approved_existing 'c0000000-0000-0000-0000-000000000007'
\set person_link_bypass_old 'c0000000-0000-0000-0000-000000000008'
\set person_link_bypass_new 'c0000000-0000-0000-0000-000000000009'
\set person_already_linked 'c0000000-0000-0000-0000-000000000010'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer_active', 'authenticated', 'authenticated', 'reviewer-active@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'reviewer_revoked', 'authenticated', 'authenticated', 'reviewer-revoked@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'reviewer_second', 'authenticated', 'authenticated', 'reviewer-second@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'ordinary_user', 'authenticated', 'authenticated', 'ordinary-user@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_begin', 'authenticated', 'authenticated', 'claimant-begin@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_approve', 'authenticated', 'authenticated', 'claimant-approve@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_reject', 'authenticated', 'authenticated', 'claimant-reject@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_terminal', 'authenticated', 'authenticated', 'claimant-terminal@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_link_bypass', 'authenticated', 'authenticated', 'claimant-link-bypass@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_person_conflict', 'authenticated', 'authenticated', 'claimant-person-conflict@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'claimant_existing_link', 'authenticated', 'authenticated', 'claimant-existing-link@example.test', 'not-a-real-hash', now(), now(), now());

-- reviewer_active and reviewer_second are both active reviewers.
-- reviewer_revoked has a reviewers row whose status is 'revoked' --
-- proving denial is driven by the live row, not by the row's mere
-- existence. ordinary_user has no reviewers row at all.
--
-- reviewer_revoked is inserted as an *active* row first, then revoked in
-- a second, separate statement -- not inserted as 'revoked' directly.
-- reviewers_revoked_at_matches_status is checked against the row as it
-- exists after each individual statement, not the fixture author's
-- overall intent: an INSERT that sets status = 'revoked' without also
-- setting revoked_at/revoked_by_user_id in that same statement produces
-- an invalid row the instant it's created (revoked_at is still null at
-- that point), and is correctly rejected -- the constraint doesn't wait
-- for the UPDATE below to "complete the picture". Granted/revoked by
-- reviewer_second throughout: a distinct, genuine governance actor, so
-- reviewers_no_self_grant/reviewers_no_self_revoke are both satisfied,
-- and reviewer_second's own row stays untouched and valid for the rest
-- of this file.
insert into public.reviewers (user_id, status, granted_by_user_id)
values
  (:'reviewer_active', 'active', :'reviewer_second'),
  (:'reviewer_second', 'active', :'reviewer_active'),
  (:'reviewer_revoked', 'active', :'reviewer_second');

update public.reviewers
set status = 'revoked', revoked_at = now(), revoked_by_user_id = :'reviewer_second'
where user_id = :'reviewer_revoked';

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'person_begin', 'Begin', 'Review', 'Begin Review', 'provisional', 'imported_historical'),
  (:'person_approve', 'Approve', 'Target', 'Approve Target', 'provisional', 'imported_historical'),
  (:'person_reject', 'Reject', 'Target', 'Reject Target', 'provisional', 'imported_historical'),
  (:'person_selfreview', 'Self', 'Review', 'Self Review', 'provisional', 'imported_historical'),
  (:'person_withdrawn', 'Withdrawn', 'Claim', 'Withdrawn Claim', 'provisional', 'imported_historical'),
  (:'person_rejected_existing', 'Rejected', 'Existing', 'Rejected Existing', 'provisional', 'imported_historical'),
  (:'person_approved_existing', 'Approved', 'Existing', 'Approved Existing', 'verified_self', 'imported_historical'),
  (:'person_link_bypass_old', 'Bypass', 'Old', 'Bypass Old', 'provisional', 'imported_historical'),
  (:'person_link_bypass_new', 'Bypass', 'New', 'Bypass New', 'provisional', 'imported_historical'),
  (:'person_already_linked', 'Already', 'Linked', 'Already Linked', 'verified_self', 'imported_historical');

-- The claim that will be moved submitted -> under_review by
-- begin_claim_review.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'claimant_begin', :'person_begin', 'submitted', 'Evidence for the begin-review fixture.');

-- The claim that will be approved.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'claimant_approve', :'person_approve', 'under_review', 'Evidence for the approve fixture.');

-- The claim that will be rejected.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'claimant_reject', :'person_reject', 'under_review', 'Evidence for the reject fixture.');

-- A claim by reviewer_active on themself, for the self-review denial
-- tests. reviewer_admin_id stays null on insert, so
-- profile_claims_no_self_review (which only fires once reviewer_admin_id
-- is set) is not violated by this fixture -- exactly what
-- begin_claim_review/approve_profile_claim/reject_profile_claim must
-- themselves reject before ever reaching that column.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'reviewer_active', :'person_selfreview', 'under_review', 'Evidence for the self-review fixture.');

-- Pre-decided/terminal claims, for "no re-deciding" coverage. Reviewed
-- by reviewer_second so profile_claims_no_self_review is satisfied.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values
  (:'claimant_terminal', :'person_withdrawn', 'withdrawn', null, now());

insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values
  (:'claimant_terminal', :'person_rejected_existing', 'rejected', :'reviewer_second', now());

insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values
  (:'claimant_existing_link', :'person_approved_existing', 'approved', :'reviewer_second', now());

insert into public.user_person_links (user_id, person_id, source_claim_id, linked_by_user_id)
select :'claimant_existing_link', :'person_approved_existing', id, :'reviewer_second'
from public.profile_claims
where claimant_user_id = :'claimant_existing_link' and claimed_person_id = :'person_approved_existing';

-- Fixture for "a claimant who already holds an active link can never
-- simultaneously hold a second pending claim on a different person" --
-- originally attempted as a defense-in-depth fixture for
-- approve_profile_claim's own claimant-side re-check, backed by a
-- *rejected* "old" claim (a rejected/withdrawn row doesn't participate in
-- profile_claims_one_active_or_approved_per_claimant_idx, so a second,
-- independent claim for the same claimant can be inserted alongside it).
-- That version does not construct a valid database state:
-- user_person_links_validate_source_claim_trigger requires source_claim_id
-- to reference a claim whose status is actually 'approved', so a link
-- can never legitimately be attached to a rejected claim in the first
-- place (confirmed against the trigger's own body in
-- supabase/migrations/20260801013649_create_identity_foundation.sql).
--
-- Making the "old" claim genuinely 'approved' instead (so the link is
-- valid) does not rescue the original design either: an approved claim
-- *does* participate in profile_claims_one_active_or_approved_per_claimant_idx,
-- so it permanently occupies that claimant's one allowed
-- submitted/under_review/approved row -- a second claim for the same
-- claimant can then never be inserted at all, under any status. Put
-- together, these two guarantees (the partial unique index, and the
-- trigger's "must be approved and must match this claimant/person" check)
-- mean a claimant who holds an active link can *never* simultaneously
-- hold a second pending claim on a different person, through any
-- combination of legitimate inserts or direct raw SQL -- this is not a
-- fixture-construction gap, it's a real structural guarantee the schema
-- already provides at a stronger layer than approve_profile_claim's own
-- redundant defense-in-depth check could ever be exercised at. The
-- fixture below proves exactly that: claimant_link_bypass is given one
-- genuinely approved claim (person_link_bypass_old) and its resulting
-- link, then an attempt to insert a second, independent claim
-- (person_link_bypass_new) for the same claimant is proven to fail at
-- the index itself -- see the throws_ok assertion in section 16 below,
-- which replaces the original (unreachable) approve_profile_claim-level
-- assertion.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values (:'claimant_link_bypass', :'person_link_bypass_old', 'approved', :'reviewer_second', now());

insert into public.user_person_links (user_id, person_id, source_claim_id, linked_by_user_id, status)
select :'claimant_link_bypass', :'person_link_bypass_old', id, :'reviewer_second', 'active'
from public.profile_claims
where claimant_user_id = :'claimant_link_bypass' and claimed_person_id = :'person_link_bypass_old';

-- Person-side eligibility fixture: person_already_linked is already
-- actively linked to claimant_existing_link's... no -- to a distinct
-- claimant, via a distinct pre-existing approved claim, so a *different*
-- claimant's fresh under_review claim on the same person must fail
-- approval on the person-eligibility check.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values (:'reviewer_second', :'person_already_linked', 'approved', :'reviewer_active', now());

insert into public.user_person_links (user_id, person_id, source_claim_id, linked_by_user_id)
select :'reviewer_second', :'person_already_linked', id, :'reviewer_active'
from public.profile_claims
where claimant_user_id = :'reviewer_second' and claimed_person_id = :'person_already_linked';

insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'claimant_person_conflict', :'person_already_linked', 'under_review', 'Evidence for the person-side conflicting-link fixture.');

-- ---------------------------------------------------------------------
-- Capture every fixture claim's id now, via this file's own
-- unrestricted (table-owner) connection -- before any `set local role`
-- below.
--
-- profile_claims_select_own restricts `authenticated`'s SELECT to rows
-- where claimant_user_id = auth.uid() (supabase/migrations/
-- 20260801013649_create_identity_foundation.sql). Nearly every assertion
-- below needs to look up a claim belonging to *someone else* (a reviewer
-- reviewing a claimant's claim is, by definition, never that claimant),
-- so a live `select id from public.profile_claims where ...` subquery
-- run *inside* a `set local role authenticated` block -- impersonating
-- the reviewer, not the claimant -- has that row filtered out by RLS and
-- silently evaluates to NULL. It is not that the row doesn't exist; it's
-- that a plain SELECT under that session isn't allowed to see it.
-- get_claim_review_detail()/begin_claim_review()/approve_profile_claim()/
-- reject_profile_claim() all correctly report "claim not found" for a
-- NULL/nonexistent id -- that is the production function behaving
-- exactly as designed; the bug was this test file's own lookup, not the
-- function, the migration, or any constraint/trigger/grant/RLS policy.
-- Capturing every id here, before any role switch, sidesteps RLS
-- entirely (this connection is the table owner) and gives every later
-- section an already-resolved psql variable to substitute instead of a
-- live, RLS-scoped subquery.
select id as claim_begin_id from public.profile_claims
  where claimant_user_id = :'claimant_begin' and claimed_person_id = :'person_begin' \gset

select id as claim_approve_id from public.profile_claims
  where claimant_user_id = :'claimant_approve' and claimed_person_id = :'person_approve' \gset

select id as claim_reject_id from public.profile_claims
  where claimant_user_id = :'claimant_reject' and claimed_person_id = :'person_reject' \gset

select id as claim_selfreview_id from public.profile_claims
  where claimant_user_id = :'reviewer_active' and claimed_person_id = :'person_selfreview' \gset

select id as claim_withdrawn_id from public.profile_claims
  where claimant_user_id = :'claimant_terminal' and claimed_person_id = :'person_withdrawn' \gset

select id as claim_rejected_existing_id from public.profile_claims
  where claimant_user_id = :'claimant_terminal' and claimed_person_id = :'person_rejected_existing' \gset

select id as claim_approved_existing_id from public.profile_claims
  where claimant_user_id = :'claimant_existing_link' and claimed_person_id = :'person_approved_existing' \gset

select id as claim_person_conflict_id from public.profile_claims
  where claimant_user_id = :'claimant_person_conflict' and claimed_person_id = :'person_already_linked' \gset

-- ---------------------------------------------------------------------
-- 1. reviewers: locked down like people/user_person_links -- no GRANT,
--    no RLS policy, for anon or authenticated.
-- ---------------------------------------------------------------------

set local role anon;

select throws_ok(
  $sql$ select 1 from public.reviewers limit 1 $sql$,
  '42501',
  null,
  'anonymous role has no privilege to select from public.reviewers'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select throws_ok(
  $sql$ select 1 from public.reviewers limit 1 $sql$,
  '42501',
  null,
  'an authenticated role -- even an active reviewer''s own session -- has no direct SELECT privilege on public.reviewers'
);

select throws_ok(
  format($sql$
    insert into public.reviewers (user_id, status) values ('%s', 'active')
  $sql$, :'ordinary_user'),
  '42501',
  null,
  'an authenticated role has no direct INSERT privilege on public.reviewers -- reviewer status can only be granted via a trusted service-role connection'
);

reset role;

-- ---------------------------------------------------------------------
-- 2. reviewers: self-grant/self-revoke CHECK constraints hold even for a
--    role with full table privilege (this file's own connection, which
--    runs as the table owner outside any `set local role`).
-- ---------------------------------------------------------------------

select throws_ok(
  format($sql$
    insert into public.reviewers (user_id, status, granted_by_user_id)
    values ('%s', 'active', '%s')
  $sql$, :'ordinary_user', :'ordinary_user'),
  '23514',
  null,
  'reviewers_no_self_grant rejects a row where granted_by_user_id equals user_id'
);

select throws_ok(
  format($sql$
    update public.reviewers
    set revoked_at = now(), revoked_by_user_id = user_id, status = 'revoked'
    where user_id = '%s'
  $sql$, :'reviewer_second'),
  '23514',
  null,
  'reviewers_no_self_revoke rejects a row where revoked_by_user_id equals user_id'
);

select throws_ok(
  format($sql$
    update public.reviewers set status = 'revoked' where user_id = '%s'
  $sql$, :'reviewer_second'),
  '23514',
  null,
  'reviewers_revoked_at_matches_status rejects status = revoked without a revoked_at timestamp'
);

-- ---------------------------------------------------------------------
-- 3. Hardening: every one of the six functions is SECURITY DEFINER with
--    search_path pinned to public, pg_temp, matching the migration's
--    documented threat model.
-- ---------------------------------------------------------------------

select ok(
  (select prosecdef from pg_proc where proname = 'am_i_a_reviewer' and pronamespace = 'public'::regnamespace),
  'am_i_a_reviewer is SECURITY DEFINER'
);
select ok(
  (select proconfig @> ARRAY['search_path=public, pg_temp'] from pg_proc where proname = 'am_i_a_reviewer' and pronamespace = 'public'::regnamespace),
  'am_i_a_reviewer pins search_path to public, pg_temp'
);

select ok(
  (select prosecdef from pg_proc where proname = 'list_claims_for_review' and pronamespace = 'public'::regnamespace),
  'list_claims_for_review is SECURITY DEFINER'
);
select ok(
  (select proconfig @> ARRAY['search_path=public, pg_temp'] from pg_proc where proname = 'list_claims_for_review' and pronamespace = 'public'::regnamespace),
  'list_claims_for_review pins search_path to public, pg_temp'
);

select ok(
  (select prosecdef from pg_proc where proname = 'get_claim_review_detail' and pronamespace = 'public'::regnamespace),
  'get_claim_review_detail is SECURITY DEFINER'
);
select ok(
  (select proconfig @> ARRAY['search_path=public, pg_temp'] from pg_proc where proname = 'get_claim_review_detail' and pronamespace = 'public'::regnamespace),
  'get_claim_review_detail pins search_path to public, pg_temp'
);

select ok(
  (select prosecdef from pg_proc where proname = 'begin_claim_review' and pronamespace = 'public'::regnamespace),
  'begin_claim_review is SECURITY DEFINER'
);
select ok(
  (select proconfig @> ARRAY['search_path=public, pg_temp'] from pg_proc where proname = 'begin_claim_review' and pronamespace = 'public'::regnamespace),
  'begin_claim_review pins search_path to public, pg_temp'
);

select ok(
  (select prosecdef from pg_proc where proname = 'approve_profile_claim' and pronamespace = 'public'::regnamespace),
  'approve_profile_claim is SECURITY DEFINER'
);
select ok(
  (select proconfig @> ARRAY['search_path=public, pg_temp'] from pg_proc where proname = 'approve_profile_claim' and pronamespace = 'public'::regnamespace),
  'approve_profile_claim pins search_path to public, pg_temp'
);

select ok(
  (select prosecdef from pg_proc where proname = 'reject_profile_claim' and pronamespace = 'public'::regnamespace),
  'reject_profile_claim is SECURITY DEFINER'
);
select ok(
  (select proconfig @> ARRAY['search_path=public, pg_temp'] from pg_proc where proname = 'reject_profile_claim' and pronamespace = 'public'::regnamespace),
  'reject_profile_claim pins search_path to public, pg_temp'
);

-- ---------------------------------------------------------------------
-- 4. Parameter shape: no function accepts a caller-supplied status,
--    reviewer id, timestamp, or link id -- spoofing any decision-relevant
--    field is structurally impossible, not merely rejected at runtime.
-- ---------------------------------------------------------------------

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public' and parameter_mode = 'IN'
      and specific_name in (select specific_name from information_schema.routines where routine_schema = 'public' and routine_name = 'get_claim_review_detail')
  $sql$,
  ARRAY['p_claim_id'],
  'get_claim_review_detail accepts only a claim id'
);

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public' and parameter_mode = 'IN'
      and specific_name in (select specific_name from information_schema.routines where routine_schema = 'public' and routine_name = 'begin_claim_review')
  $sql$,
  ARRAY['p_claim_id'],
  'begin_claim_review accepts only a claim id -- no status, reviewer, or timestamp of any kind'
);

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public' and parameter_mode = 'IN'
      and specific_name in (select specific_name from information_schema.routines where routine_schema = 'public' and routine_name = 'approve_profile_claim')
  $sql$,
  ARRAY['p_claim_id'],
  'approve_profile_claim accepts only a claim id -- no claimant, status, reviewer, decision timestamp, or link id'
);

select set_eq(
  $sql$
    select parameter_name from information_schema.parameters
    where specific_schema = 'public' and parameter_mode = 'IN'
      and specific_name in (select specific_name from information_schema.routines where routine_schema = 'public' and routine_name = 'reject_profile_claim')
  $sql$,
  ARRAY['p_claim_id', 'p_decision_notes'],
  'reject_profile_claim accepts only a claim id and optional decision notes -- no status, reviewer, or timestamp'
);

-- ---------------------------------------------------------------------
-- 5. Anonymous denial across all six functions -- rejected at the
--    privilege layer, before any function body runs.
-- ---------------------------------------------------------------------

set local role anon;

select throws_ok($sql$ select public.am_i_a_reviewer() $sql$, '42501', null, 'anonymous role has no privilege to call am_i_a_reviewer');
select throws_ok($sql$ select * from public.list_claims_for_review() $sql$, '42501', null, 'anonymous role has no privilege to call list_claims_for_review');
select throws_ok(format($sql$ select * from public.get_claim_review_detail('%s') $sql$, :'person_begin'), '42501', null, 'anonymous role has no privilege to call get_claim_review_detail');
select throws_ok(format($sql$ select * from public.begin_claim_review('%s') $sql$, :'person_begin'), '42501', null, 'anonymous role has no privilege to call begin_claim_review');
select throws_ok(format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'person_begin'), '42501', null, 'anonymous role has no privilege to call approve_profile_claim');
select throws_ok(format($sql$ select * from public.reject_profile_claim('%s') $sql$, :'person_begin'), '42501', null, 'anonymous role has no privilege to call reject_profile_claim');

reset role;

-- ---------------------------------------------------------------------
-- 6. Ordinary authenticated user (no reviewers row at all): denied by
--    each function's own internal check, not merely absent from a UI.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'ordinary_user';

select is(
  (select public.am_i_a_reviewer()),
  false,
  'am_i_a_reviewer returns false, not an error, for an ordinary authenticated user with no reviewers row'
);

select throws_ok($sql$ select * from public.list_claims_for_review() $sql$, 'P0001', 'list_claims_for_review: reviewer authorization required', 'an ordinary authenticated user cannot list the review queue');
select throws_ok(format($sql$ select * from public.get_claim_review_detail('%s') $sql$, :'person_begin'), 'P0001', 'get_claim_review_detail: reviewer authorization required', 'an ordinary authenticated user cannot read claim review detail, so unauthorized users cannot enumerate or inspect claims');
select throws_ok(format($sql$ select * from public.begin_claim_review('%s') $sql$, :'person_begin'), 'P0001', 'begin_claim_review: reviewer authorization required', 'an ordinary authenticated user cannot begin a claim review');
select throws_ok(format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'person_begin'), 'P0001', 'approve_profile_claim: reviewer authorization required', 'an ordinary authenticated user cannot approve a claim');
select throws_ok(format($sql$ select * from public.reject_profile_claim('%s') $sql$, :'person_begin'), 'P0001', 'reject_profile_claim: reviewer authorization required', 'an ordinary authenticated user cannot reject a claim');

reset role;

-- ---------------------------------------------------------------------
-- 7. Revoked reviewer: denied identically to an ordinary user, proving
--    denial tracks the live row (status = 'revoked'), not merely the
--    row's existence -- and proving revocation is immediate, since every
--    function re-queries is_active_reviewer() itself rather than trusting
--    a cached or client-asserted status.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_revoked';

select is(
  (select public.am_i_a_reviewer()),
  false,
  'am_i_a_reviewer returns false for a revoked reviewer'
);

select throws_ok($sql$ select * from public.list_claims_for_review() $sql$, 'P0001', 'list_claims_for_review: reviewer authorization required', 'a revoked reviewer cannot list the review queue');
select throws_ok(format($sql$ select * from public.get_claim_review_detail('%s') $sql$, :'person_begin'), 'P0001', 'get_claim_review_detail: reviewer authorization required', 'a revoked reviewer cannot read claim review detail');
select throws_ok(format($sql$ select * from public.begin_claim_review('%s') $sql$, :'person_begin'), 'P0001', 'begin_claim_review: reviewer authorization required', 'a revoked reviewer cannot begin a claim review');
select throws_ok(format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'person_begin'), 'P0001', 'approve_profile_claim: reviewer authorization required', 'a revoked reviewer cannot approve a claim');
select throws_ok(format($sql$ select * from public.reject_profile_claim('%s') $sql$, :'person_begin'), 'P0001', 'reject_profile_claim: reviewer authorization required', 'a revoked reviewer cannot reject a claim');

reset role;

-- ---------------------------------------------------------------------
-- 8. Active reviewer: positive access. am_i_a_reviewer, the queue, and
--    claim detail all work as documented.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select is(
  (select public.am_i_a_reviewer()),
  true,
  'am_i_a_reviewer returns true for an active reviewer'
);

select is(
  (select count(*)::int from public.list_claims_for_review()),
  5,
  'the review queue contains exactly the fixtures in submitted/under_review status (person_begin, person_approve, person_reject, person_selfreview, person_already_linked''s conflicting claim) -- decided/withdrawn/approved claims (including person_link_bypass_old, approved) are excluded'
);

select is(
  (select status from public.get_claim_review_detail(:'claim_begin_id'::uuid)),
  'submitted',
  'get_claim_review_detail returns the correct status for an authorized reviewer'
);

select is(
  (select supporting_evidence from public.get_claim_review_detail(:'claim_begin_id'::uuid)),
  'Evidence for the begin-review fixture.',
  'get_claim_review_detail exposes the claimant''s evidence to an authorized reviewer'
);

reset role;

-- ---------------------------------------------------------------------
-- 9. Evidence not exposed by claim id enumeration alone -- get_claim_
--    review_detail on a nonexistent claim id fails cleanly, and does not
--    distinguish "you're not authorized" from "this id doesn't exist"
--    for a non-reviewer (already proven in section 6); this section
--    additionally proves an authorized reviewer gets a clean not-found
--    error rather than a leaked internal detail.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select throws_ok(
  $sql$ select * from public.get_claim_review_detail('00000000-0000-0000-0000-000000000000') $sql$,
  'P0001',
  'get_claim_review_detail: claim not found',
  'a nonexistent claim id produces a clean not-found error, even for an authorized reviewer'
);

reset role;

-- ---------------------------------------------------------------------
-- 10. Self-review denial: an active reviewer cannot begin, approve, or
--     reject their own claim.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select throws_ok(
  format($sql$ select * from public.begin_claim_review('%s') $sql$, :'claim_selfreview_id'),
  'P0001',
  'begin_claim_review: a reviewer cannot review their own claim',
  'an active reviewer cannot begin review on their own claim'
);

select throws_ok(
  format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'claim_selfreview_id'),
  'P0001',
  'approve_profile_claim: a reviewer cannot decide their own claim',
  'an active reviewer cannot approve their own claim'
);

select throws_ok(
  format($sql$ select * from public.reject_profile_claim('%s') $sql$, :'claim_selfreview_id'),
  'P0001',
  'reject_profile_claim: a reviewer cannot decide their own claim',
  'an active reviewer cannot reject their own claim'
);

reset role;

-- ---------------------------------------------------------------------
-- 11. begin_claim_review: successful submitted -> under_review
--     transition, and rejection of a repeat/invalid transition.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select id, status
from public.begin_claim_review(:'claim_begin_id'::uuid) \gset begin_result_

select is(
  :'begin_result_status'::text,
  'under_review',
  'begin_claim_review returns status under_review on success'
);

select throws_ok(
  format($sql$ select * from public.begin_claim_review('%s') $sql$, :'claim_begin_id'),
  'P0001',
  'begin_claim_review: claim is not in a reviewable state',
  'begin_claim_review cannot be repeated once a claim is already under_review'
);

reset role;

-- Persistence is checked at this file's own unrestricted connection, not
-- under `set local role authenticated` -- profile_claims_select_own
-- would otherwise filter this row out from reviewer_active's own plain
-- SELECT (reviewer_active is not this claim's claimant), which is a
-- correct RLS outcome, not something this assertion is trying to
-- exercise. See the capture block above the "1. reviewers" section for
-- the full reasoning.
select is(
  (select status from public.profile_claims where id = :'claim_begin_id'::uuid),
  'under_review',
  'begin_claim_review actually persists the submitted -> under_review transition'
);

-- ---------------------------------------------------------------------
-- 12. No re-deciding withdrawn/rejected/approved claims: begin, approve,
--     and reject are all rejected outright, not silently no-op'd.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select throws_ok(
  format($sql$ select * from public.begin_claim_review('%s') $sql$, :'claim_withdrawn_id'),
  'P0001',
  'begin_claim_review: claim is not in a reviewable state',
  'begin_claim_review rejects a withdrawn claim'
);

select throws_ok(
  format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'claim_rejected_existing_id'),
  'P0001',
  'approve_profile_claim: claim is not in an approvable state',
  'approve_profile_claim rejects an already-rejected claim'
);

select throws_ok(
  format($sql$ select * from public.reject_profile_claim('%s') $sql$, :'claim_approved_existing_id'),
  'P0001',
  'reject_profile_claim: claim is not in a reviewable state',
  'reject_profile_claim rejects an already-approved claim'
);

select throws_ok(
  format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'claim_withdrawn_id'),
  'P0001',
  'approve_profile_claim: claim is not in an approvable state',
  'approve_profile_claim rejects a withdrawn claim'
);

reset role;

-- ---------------------------------------------------------------------
-- 13. approve_profile_claim: atomic success. Exactly one active link is
--     created, referencing the source claim, for the correct
--     claimant/person pair, and the claim itself is marked approved with
--     reviewer + timestamp recorded.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select id, status, link_id
from public.approve_profile_claim(:'claim_approve_id'::uuid) \gset approve_result_

select is(
  :'approve_result_status'::text,
  'approved',
  'approve_profile_claim returns status approved on success'
);

select isnt(
  :'approve_result_link_id'::uuid,
  null::uuid,
  'approve_profile_claim returns a non-null link_id on success'
);

-- ---------------------------------------------------------------------
-- 14. Repeated/concurrent approval fails safely: the same claim cannot be
--     approved twice, and no second link is created by the attempt.
--     Still run as reviewer_active -- approve_profile_claim's own caller
--     authorization must succeed for this to even reach the "not
--     approvable" check being tested here.
-- ---------------------------------------------------------------------

select throws_ok(
  format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'approve_result_id'),
  'P0001',
  'approve_profile_claim: claim is not in an approvable state',
  'a second approve_profile_claim call on the same already-approved claim fails safely'
);

reset role;

-- Every persisted-state check below deliberately runs at this file's own
-- unrestricted (table-owner) connection, not under `set local role
-- authenticated`: profile_claims_select_own would filter this row out of
-- reviewer_active's own plain SELECT (reviewer_active is not this claim's
-- claimant), the column-level GRANT on profile_claims excludes
-- reviewer_admin_id entirely for `authenticated` (a hard permission
-- error, not a silent NULL), and `authenticated` has no GRANT at all on
-- user_person_links (also a hard permission error, not an empty result).
-- None of this is a gap in approve_profile_claim -- it is exactly the
-- access this milestone requires NOT to exist for a plain authenticated
-- session, reviewer or not. See the capture-block comment above the
-- "1. reviewers" section for the same reasoning applied to claim-id
-- lookups.

select is(
  (select status from public.profile_claims where id = :'approve_result_id'::uuid),
  'approved',
  'approve_profile_claim persists the under_review -> approved transition'
);

select is(
  (select reviewer_admin_id from public.profile_claims where id = :'approve_result_id'::uuid),
  :'reviewer_active'::uuid,
  'approve_profile_claim records the deciding reviewer, not a client-supplied value'
);

select is(
  (select count(*)::int from public.user_person_links where source_claim_id = :'approve_result_id'::uuid),
  1,
  'approve_profile_claim creates exactly one user_person_links row referencing the source claim'
);

select is(
  (select user_id from public.user_person_links where source_claim_id = :'approve_result_id'::uuid),
  :'claimant_approve'::uuid,
  'the resulting link''s user_id matches the approved claim''s claimant'
);

select is(
  (select person_id from public.user_person_links where source_claim_id = :'approve_result_id'::uuid),
  :'person_approve'::uuid,
  'the resulting link''s person_id matches the approved claim''s claimed person'
);

select is(
  (select status from public.user_person_links where source_claim_id = :'approve_result_id'::uuid),
  'active',
  'the resulting link is active'
);

select is(
  (select count(*)::int from public.user_person_links where source_claim_id = :'approve_result_id'::uuid),
  1,
  'a repeated approval attempt does not create a second link'
);

-- ---------------------------------------------------------------------
-- 15. approve_profile_claim: person-side eligibility re-check. A claim
--     targeting a person who is already actively linked to a *different*
--     claimant is rejected at decision time, even though it was
--     permitted to reach under_review.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select throws_ok(
  format($sql$ select * from public.approve_profile_claim('%s') $sql$, :'claim_person_conflict_id'),
  'P0001',
  'approve_profile_claim: person record is no longer eligible to be linked',
  'approve_profile_claim rejects a claim whose target person is already actively linked to a different claimant'
);

reset role;

-- Unrestricted connection: `authenticated` has no GRANT at all on
-- user_person_links (see the reasoning in section 13/14 above), so this
-- read cannot run under the reviewer's own session.
select is(
  (select count(*)::int from public.user_person_links where person_id = :'person_already_linked'::uuid and status = 'active'),
  1,
  'the rejected approval attempt does not create a second active link for the already-linked person'
);

-- ---------------------------------------------------------------------
-- 16. Claimant-side conflicting-link invariant: a claimant who already
--     holds an active link (backed by their one allowed approved claim)
--     can never even *acquire* a second, independent pending claim on a
--     different person -- proven at the strongest layer available
--     (profile_claims_one_active_or_approved_per_claimant_idx), not via
--     approve_profile_claim()'s own redundant defense-in-depth check,
--     which -- per the fixture comment above -- this schema makes
--     structurally unreachable in the first place. This still proves the
--     same underlying requirement ("verify no conflicting active claim
--     or link" / "no conflicting active links per account") the
--     milestone brief calls for, just at the point where it is actually
--     enforceable: the second claim's own insertion, not a later
--     approval attempt that could never legally happen.
--
--     Deliberately run at this file's own (table-owner) connection, not
--     under `set local role authenticated` -- same convention as
--     claim_discovery.test.sql's "Account-level duplicate prevention"
--     assertion. Running this as `authenticated` would additionally
--     exercise profile_claims' own RLS INSERT policy (claimant_user_id
--     must equal the caller), which is not what this assertion is about;
--     unscoped, it isolates the partial unique index itself, exactly
--     the same way the fixture two sections above also inserts directly.
-- ---------------------------------------------------------------------

select throws_ok(
  format($sql$
    insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
    values ('%s', '%s', 'submitted', 'A second claim attempted while an active link already exists.')
  $sql$, :'claimant_link_bypass', :'person_link_bypass_new'),
  '23505',
  null,
  'profile_claims_one_active_or_approved_per_claimant_idx rejects a second pending claim for a claimant who already holds an approved claim (and its resulting active link), even via a raw insert'
);

reset role;

-- ---------------------------------------------------------------------
-- 17. reject_profile_claim: atomic success. Status, reviewer, and
--     timestamp are recorded; decision_notes is normalized; no link is
--     created.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer_active';

select id, status
from public.reject_profile_claim(:'claim_reject_id'::uuid, '  Name does not match the historical record.  ') \gset reject_result_

select is(
  :'reject_result_status'::text,
  'rejected',
  'reject_profile_claim returns status rejected on success'
);

-- Still as reviewer_active: reject_profile_claim's own caller
-- authorization must succeed for this repeat-attempt check to reach the
-- "not reviewable" state being tested.
select throws_ok(
  format($sql$ select * from public.reject_profile_claim('%s') $sql$, :'reject_result_id'),
  'P0001',
  'reject_profile_claim: claim is not in a reviewable state',
  'a second reject_profile_claim call on the same already-rejected claim fails safely'
);

reset role;

-- Unrestricted connection, same reasoning as section 13/14 above:
-- profile_claims_select_own would filter this row out of
-- reviewer_active's own SELECT, reviewer_admin_id is excluded from
-- `authenticated`'s column-level GRANT entirely, and `authenticated` has
-- no GRANT at all on user_person_links.

select is(
  (select decision_notes from public.profile_claims where id = :'reject_result_id'::uuid),
  'Name does not match the historical record.',
  'reject_profile_claim trims decision_notes before storing it'
);

select is(
  (select reviewer_admin_id from public.profile_claims where id = :'reject_result_id'::uuid),
  :'reviewer_active'::uuid,
  'reject_profile_claim records the deciding reviewer'
);

select is(
  (select count(*)::int from public.user_person_links where source_claim_id = :'reject_result_id'::uuid),
  0,
  'reject_profile_claim creates no user_person_links row'
);

-- ---------------------------------------------------------------------
-- 18. profile_claims column-grant tightening: an authenticated claimant
--     can read decision_notes on their own row, but reviewer_admin_id is
--     withheld from every authenticated session, including the
--     claimant's own.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'claimant_reject';

select is(
  (select decision_notes from public.profile_claims where id = :'reject_result_id'::uuid),
  'Name does not match the historical record.',
  'a claimant can read decision_notes on their own row'
);

select throws_ok(
  format($sql$ select reviewer_admin_id from public.profile_claims where id = '%s' $sql$, :'reject_result_id'),
  '42501',
  null,
  'a claimant cannot select reviewer_admin_id on their own row -- column-level GRANT withholds it from every authenticated session'
);

reset role;

select * from finish();

rollback;
