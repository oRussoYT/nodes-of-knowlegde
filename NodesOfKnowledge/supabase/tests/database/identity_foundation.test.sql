-- pgTAP tests for Milestone M3.1: Identity Foundation.
--
-- Run locally via: npm run supabase:test  (supabase test db)
-- Requires: `supabase start` already running (Docker). NOT executed in
-- the environment this file was written in -- no Docker/CLI binary was
-- available there. See docs/database-implementation.md for details and
-- please run these yourself before relying on them.
--
-- These tests connect as the database owner (a superuser in the local
-- stack), which bypasses Row Level Security and table-level GRANTs by
-- default -- exactly like Supabase's service_role. Anywhere a policy or
-- grant needs to be exercised, the test explicitly switches role with
-- `set local role ...` and switches back afterward.

create extension if not exists pgtap;

begin;

select plan(33);

-- Fixed ids used throughout, for readability across statements.
-- user_a / user_b: two distinct authenticated accounts.
-- person_x / person_y / person_z: three distinct people records.
\set user_a '11111111-1111-1111-1111-111111111111'
\set user_b '22222222-2222-2222-2222-222222222222'
\set person_x '33333333-3333-3333-3333-333333333333'
\set person_y '44444444-4444-4444-4444-444444444444'
\set person_z '55555555-5555-5555-5555-555555555555'

-- Minimal auth.users rows so foreign keys resolve. Only columns that
-- are reliably present across supabase/gotrue schema versions are set;
-- everything else relies on defaults.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'user_b', 'authenticated', 'authenticated', 'user-b@example.test', 'not-a-real-hash', now(), now(), now());

-- ---------------------------------------------------------------------
-- 1. A person can exist without a user account, and is_deceased is an
--    independently stored fact -- NOT derived from date_of_death.
-- ---------------------------------------------------------------------

-- Deceased, but the exact date is unknown -- this is exactly the case
-- an earlier, generated-column design could not represent.
select lives_ok(
  format($sql$
    insert into public.people
      (id, given_name, family_name, display_name, verification_status, source_type, is_deceased)
    values ('%s', 'Ada', 'Lovelace', 'Ada Lovelace', 'provisional', 'imported_historical', true)
  $sql$, :'person_x'),
  'a person can be recorded as deceased with no known date_of_death'
);

select is(
  (select date_of_death from public.people where id = :'person_x'),
  null::date,
  'date_of_death stays null for a deceased person with an unknown date'
);

-- Not deceased, and is_deceased/date_of_death both left unspecified.
select lives_ok(
  format($sql$
    insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
    values ('%s', 'Grace', 'Hopper', 'Grace Hopper', 'provisional', 'admin_entered')
  $sql$, :'person_y'),
  'a second, independent people row can be created with no auth.users row'
);

select is(
  (select is_deceased from public.people where id = :'person_y'),
  false,
  'is_deceased defaults to false when not specified'
);

-- Deceased with both dates known -- the ordinary, fully-documented case.
select lives_ok(
  format($sql$
    insert into public.people
      (id, given_name, family_name, display_name, verification_status, source_type,
       is_deceased, date_of_birth, date_of_death)
    values ('%s', 'Warren', 'Weaver', 'Warren Weaver', 'verified_admin', 'imported_historical',
            true, '1894-07-17', '1978-11-24')
  $sql$, :'person_z'),
  'a person can be recorded as deceased with a known date_of_death'
);

-- date_of_death is rejected unless is_deceased = true.
select throws_ok(
  $sql$
    insert into public.people (given_name, family_name, display_name, verification_status, source_type, date_of_death)
    values ('Test', 'Person', 'Test Person', 'provisional', 'admin_entered', '2020-01-01')
  $sql$,
  '23514',
  null,
  'date_of_death cannot be set while is_deceased is false'
);

select is(
  (select count(*)::int from public.people where id in (:'person_x', :'person_y', :'person_z')),
  3,
  'all three people rows persisted independently of any auth.users row'
);

-- ---------------------------------------------------------------------
-- 2. Claim submission.
--
-- SECURITY CORRECTION (M5.3 review): a raw client-issued INSERT on
-- profile_claims is no longer permitted at all, even a well-formed,
-- correctly-owned one. The original version of this test asserted the
-- opposite (lives_ok) because this M3.1 design granted `authenticated`
-- INSERT and relied on RLS's WITH CHECK (claimant_user_id = auth.uid())
-- alone — which constrains *ownership*, not *content*: nothing stopped a
-- caller from also setting status='approved' plus any other real user's
-- id as reviewer_admin_id in the same statement, satisfying every CHECK
-- constraint and the RLS policy, and fabricating a self-approved claim
-- with no real review ever having happened. See "Revoke the
-- now-unnecessary direct INSERT grant" in supabase/migrations/
-- 20260802110300_add_claim_discovery_search_function.sql for the fix and
-- full reasoning; public.submit_profile_claim() (same migration) is now
-- the only sanctioned way to create a claim — see
-- supabase/tests/database/claim_discovery.test.sql for that function's
-- own coverage, including a regression test for the fabricated-approval
-- attempt specifically.
--
-- The fixture claim row this section used to create via the (now
-- inverted) assertion below is instead created directly, via the
-- unrestricted owner role — the same role this file's own connection
-- already runs as by default (see the file header), and exactly how
-- section 3 below already creates its own second fixture claim, and how
-- later sections already reset/approve claim rows. Every downstream
-- section (3 onward) exercises the exact same fixture data as before;
-- only *how* the claimant's own INSERT attempt is exercised changes.
-- ---------------------------------------------------------------------

insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'user_a', :'person_x', 'submitted', 'This is me, see attached CV.');

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select throws_ok(
  format($sql$
    insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
    values ('%s', '%s', 'submitted', 'This is me, see attached CV.')
  $sql$, :'user_a', :'person_x'),
  '42501',
  null,
  'an authenticated user cannot insert a claim directly at all, even a correctly-owned, well-formed one -- submit_profile_claim() is the only sanctioned path'
);

-- Even less privileged than the above: inserting with someone else's
-- claimant_user_id is (still) rejected -- now for the same "no grant at
-- all" reason as any other insert attempt, rather than a distinct
-- RLS-content check, since there is no INSERT grant left for RLS
-- evaluation to even apply to.
select throws_ok(
  format($sql$
    insert into public.profile_claims (claimant_user_id, claimed_person_id, status)
    values ('%s', '%s', 'submitted')
  $sql$, :'user_b', :'person_y'),
  '42501',
  null,
  'an authenticated user cannot insert a claim with someone else''s claimant_user_id either'
);

reset role;

-- Capture the real id of user_a's claim on person_x now, as the
-- unrestricted owner role, so later sections can reference it as a
-- plain literal. Looking it up again under a restricted role later
-- would be filtered by RLS before the query even runs, which would
-- defeat the point of testing the ownership check *inside*
-- withdraw_profile_claim() in section 7 below.
select id as claim_ax from public.profile_claims
where claimant_user_id = :'user_a' and claimed_person_id = :'person_x' \gset

-- ---------------------------------------------------------------------
-- 3. Authenticated users may read only their own profile claims.
-- ---------------------------------------------------------------------

-- Set up a second claim, owned by user_b, as the bypassing owner role.
insert into public.profile_claims (claimant_user_id, claimed_person_id, status)
values (:'user_b', :'person_y', 'submitted');

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is(
  (select count(*)::int from public.profile_claims where claimant_user_id = :'user_a'),
  1,
  'user_a sees their own claim'
);

select is(
  (select count(*)::int from public.profile_claims where claimant_user_id = :'user_b'),
  0,
  'user_a cannot see user_b''s claim'
);

reset role;

-- ---------------------------------------------------------------------
-- 4. Duplicate pending claims for the same user/person pair are
--    rejected.
-- ---------------------------------------------------------------------

select throws_ok(
  format($sql$
    insert into public.profile_claims (claimant_user_id, claimed_person_id, status)
    values ('%s', '%s', 'submitted')
  $sql$, :'user_a', :'person_x'),
  '23505',
  null,
  'a second pending claim for the same claimant/person pair is rejected'
);

-- ---------------------------------------------------------------------
-- 5. Authenticated users have no raw UPDATE access to profile_claims at
--    all -- not even to their own row -- so they cannot approve/reject
--    a claim, and cannot alter any column via a crafted UPDATE either.
--    (Section 7 covers the one sanctioned mutation path: the
--    withdraw_profile_claim() function.)
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select throws_ok(
  format($sql$
    update public.profile_claims
    set status = 'approved', reviewer_admin_id = '%s', decided_at = now()
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'user_b', :'user_a', :'person_x'),
  '42501',
  null,
  'a claimant cannot flip their own claim to approved via a raw UPDATE'
);

select throws_ok(
  format($sql$
    update public.profile_claims
    set claimed_person_id = '%s'
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'person_y', :'user_a', :'person_x'),
  '42501',
  null,
  'a claimant cannot retarget their own claim to a different person'
);

select throws_ok(
  format($sql$
    update public.profile_claims
    set claimant_user_id = '%s'
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'user_b', :'user_a', :'person_x'),
  '42501',
  null,
  'a claimant cannot reassign their own claim to a different claimant'
);

select throws_ok(
  format($sql$
    update public.profile_claims
    set reviewer_admin_id = '%s', decision_notes = 'looks good to me'
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'user_a', :'user_a', :'person_x'),
  '42501',
  null,
  'a claimant cannot set reviewer fields on their own claim'
);

select throws_ok(
  format($sql$
    update public.profile_claims
    set submitted_at = now() - interval '1 year', decided_at = now()
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'user_a', :'person_x'),
  '42501',
  null,
  'a claimant cannot rewrite submitted_at/decided_at on their own claim'
);

reset role;

-- ---------------------------------------------------------------------
-- 6. Self-approval is blocked at the database level, even via a
--    privileged role.
-- ---------------------------------------------------------------------

select throws_ok(
  format($sql$
    update public.profile_claims
    set status = 'approved', reviewer_admin_id = '%s', decided_at = now()
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'user_a', :'user_a', :'person_x'),
  '23514',
  null,
  'a claim cannot be approved by its own claimant, even via a privileged role'
);

-- ---------------------------------------------------------------------
-- 7. Withdrawal only happens through withdraw_profile_claim(), only
--    pending -> withdrawn, only for the caller's own claim.
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select lives_ok(
  format($sql$ select public.withdraw_profile_claim('%s') $sql$, :'claim_ax'),
  'a claimant can withdraw their own pending claim via withdraw_profile_claim()'
);

select is(
  (select status from public.profile_claims where id = :'claim_ax'),
  'withdrawn',
  'the claim status is withdrawn after calling withdraw_profile_claim()'
);

-- No withdrawn -> pending reversal, and no double-withdrawal: calling
-- it again on the same, now-withdrawn claim fails.
select throws_ok(
  format($sql$ select public.withdraw_profile_claim('%s') $sql$, :'claim_ax'),
  'P0001',
  null,
  'withdraw_profile_claim() refuses to act on an already-withdrawn claim'
);

reset role;

-- user_b cannot withdraw user_a's claim (not the owner). claim_ax was
-- captured as the unrestricted owner role above, so this call reaches
-- withdraw_profile_claim()'s own ownership check with a real,
-- resolvable id -- it isn't just failing because RLS hid the row from
-- user_b before the function was ever called.
set local role authenticated;
set local request.jwt.claim.sub to :'user_b';

select throws_ok(
  format($sql$ select public.withdraw_profile_claim('%s') $sql$, :'claim_ax'),
  'P0001',
  null,
  'withdraw_profile_claim() refuses to act on a claim the caller does not own'
);

reset role;

-- Reset that claim back to submitted (bypassing RLS/grants as owner)
-- so later approval-path tests have a submitted claim to work with.
update public.profile_claims
set status = 'submitted', decided_at = null
where claimant_user_id = :'user_a' and claimed_person_id = :'person_x';

-- ---------------------------------------------------------------------
-- 8. A user cannot create an approved link directly (client-side).
-- ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select throws_ok(
  format($sql$
    insert into public.user_person_links (user_id, person_id)
    values ('%s', '%s')
  $sql$, :'user_a', :'person_x'),
  '42501',
  null,
  'an authenticated user cannot insert directly into user_person_links'
);

reset role;

-- ---------------------------------------------------------------------
-- 9. One user cannot be linked to two people; one person cannot be
--    linked to two users. Exercised via the privileged (owner) role,
--    the same way an approved service-role workflow would create links.
-- ---------------------------------------------------------------------

-- Properly approve user_a's claim on person_x first, so the link is
-- backed by a valid, approved claim (exercises the FK-integrity trigger
-- too).
update public.profile_claims
set status = 'approved', reviewer_admin_id = :'user_b', decided_at = now()
where claimant_user_id = :'user_a' and claimed_person_id = :'person_x';

select lives_ok(
  format($sql$
    insert into public.user_person_links (user_id, person_id, source_claim_id)
    select '%s', '%s', id from public.profile_claims
    where claimant_user_id = '%s' and claimed_person_id = '%s' and status = 'approved'
  $sql$, :'user_a', :'person_x', :'user_a', :'person_x'),
  'an approved claim can back a properly-created user_person_links row'
);

select throws_ok(
  format($sql$
    insert into public.user_person_links (user_id, person_id)
    values ('%s', '%s')
  $sql$, :'user_a', :'person_y'),
  '23505',
  null,
  'user_a cannot hold a second simultaneously active link to a different person'
);

select throws_ok(
  format($sql$
    insert into public.user_person_links (user_id, person_id)
    values ('%s', '%s')
  $sql$, :'user_b', :'person_x'),
  '23505',
  null,
  'person_x cannot be actively linked to a second, different user'
);

-- ---------------------------------------------------------------------
-- 10. A given approved claim cannot back a second user_person_links
--     row, even after the first link created from it is revoked.
-- ---------------------------------------------------------------------

update public.user_person_links
set status = 'revoked', revoked_at = now(), revoked_reason = 'test revocation'
where user_id = :'user_a' and person_id = :'person_x';

select throws_ok(
  format($sql$
    insert into public.user_person_links (user_id, person_id, source_claim_id)
    select '%s', '%s', id from public.profile_claims
    where claimant_user_id = '%s' and claimed_person_id = '%s' and status = 'approved'
  $sql$, :'user_a', :'person_x', :'user_a', :'person_x'),
  '23505',
  null,
  'a source_claim_id already used for one link cannot authorize a second, even after the first link is revoked'
);

-- ---------------------------------------------------------------------
-- 11. No claimant can hold more than one approved claim, and no person
--     can be the subject of more than one approved claim -- enforced
--     directly on profile_claims, independent of user_person_links.
-- ---------------------------------------------------------------------

-- user_a already has an approved claim on person_x (from step 9).
--
-- SECURITY CORRECTION (M5.3 review) fixture note: before
-- profile_claims_one_active_or_approved_per_claimant_idx existed
-- (supabase/migrations/20260802110300_add_claim_discovery_search_function.sql),
-- this test proved "one claimant cannot hold two simultaneously approved
-- claims" in two steps: first successfully inserting a second, merely
-- *submitted* claim for user_a on a different person (person_z), then
-- showing that second claim could never itself be flipped to approved
-- (the older profile_claims_one_approved_per_claimant_idx, 23505 at the
-- UPDATE step). That two-step fixture no longer works, because the new,
-- stronger index rejects the second claim at INSERT time -- there is no
-- longer any reachable state in which a second submitted claim for
-- user_a co-exists with the first, already-approved one, so there is
-- nothing left to later attempt approving. This is not a weaker proof of
-- the same requirement; it is the same product invariant ("one
-- claimant, at most one active-or-approved claim at a time -- which
-- necessarily includes at most one *approved* one") now caught one step
-- earlier in the pipeline. The assertion moves with it: the INSERT
-- itself is the operation now expected to fail.
select throws_ok(
  format($sql$
    insert into public.profile_claims (claimant_user_id, claimed_person_id, status)
    values ('%s', '%s', 'submitted')
  $sql$, :'user_a', :'person_z'),
  '23505',
  null,
  'one claimant cannot hold a second simultaneously active-or-approved claim while already holding an approved one -- rejected at insert time by profile_claims_one_active_or_approved_per_claimant_idx'
);

-- person_x already has an approved claim (by user_a, from step 9). A
-- different claimant's claim on the same person_x cannot also become
-- approved -- this half of the test is about the *person*-level
-- constraint (profile_claims_one_approved_per_person_idx), not the
-- claimant-level one exercised immediately above.
--
-- Fixture note: this needs a claimant who does not already hold a
-- conflicting active/approved claim of their own, purely so the setup
-- insert below succeeds and the person-level constraint is the only
-- thing left to test. user_b is no longer usable here: user_b already
-- holds an active submitted claim (on person_y, from section 3), so
-- reusing user_b would now trip
-- profile_claims_one_active_or_approved_per_claimant_idx instead --
-- correctly, but for the wrong reason, masking the person-level
-- assertion this test exists to prove. A fresh, otherwise-claim-free
-- claimant (user_c) isolates the person-level constraint, per "use a
-- distinct claimant when the test needs a separate active claim."
\set user_c '66666666-6666-6666-6666-666666666666'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'user_c', 'authenticated', 'authenticated', 'user-c@example.test', 'not-a-real-hash', now(), now(), now());

insert into public.profile_claims (claimant_user_id, claimed_person_id, status)
values (:'user_c', :'person_x', 'submitted');

select throws_ok(
  format($sql$
    update public.profile_claims
    set status = 'approved', reviewer_admin_id = '%s', decided_at = now()
    where claimant_user_id = '%s' and claimed_person_id = '%s'
  $sql$, :'user_a', :'user_c', :'person_x'),
  '23505',
  null,
  'one person cannot be the subject of two simultaneously approved claims'
);

-- ---------------------------------------------------------------------
-- 12. Anonymous access is denied across the board.
--
-- people, profile_claims, and user_person_links have no GRANT at all to
-- anon (see the Grants section of the migration), so these fail at the
-- privilege layer before RLS is even evaluated -- a stronger guarantee
-- than an RLS policy alone.
-- ---------------------------------------------------------------------

set local role anon;

select throws_ok(
  $sql$ select count(*) from public.people $sql$,
  '42501',
  null,
  'anonymous role has no privilege to read people at all'
);

select throws_ok(
  $sql$ select count(*) from public.profile_claims $sql$,
  '42501',
  null,
  'anonymous role has no privilege to read profile_claims at all'
);

select throws_ok(
  $sql$ select count(*) from public.user_person_links $sql$,
  '42501',
  null,
  'anonymous role has no privilege to read user_person_links at all'
);

reset role;

-- ---------------------------------------------------------------------
-- 13. Audit logs are not readable by ordinary users.
--
-- audit_logs also has no GRANT to authenticated, so this is a
-- privilege-layer denial too, not just an RLS filter.
-- ---------------------------------------------------------------------

insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label)
values (:'user_b', 'approve', 'profile_claims', gen_random_uuid(), 'test audit row');

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select throws_ok(
  $sql$ select count(*) from public.audit_logs $sql$,
  '42501',
  null,
  'an ordinary authenticated user has no privilege to read audit_logs at all'
);

reset role;

select * from finish();

rollback;
