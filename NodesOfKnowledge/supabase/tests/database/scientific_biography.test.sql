-- pgTAP tests for Milestone M6.1: Scientific Biography Foundation.
--
-- Run locally via: npm run supabase:test  (supabase test db)
-- Requires: `supabase start` already running (Docker). NOT executed in the
-- environment this file was written in -- no Docker/CLI binary was available
-- there (same limitation documented in docs/supabase-development.md).
-- Please run these yourself before relying on them.
--
-- Scope: public.person_narrative (deny-by-default access + constraints) and
-- public.get_person_biography (authorization, provenance, conservative
-- withholding, claimed/unclaimed, honest null for merged/nonexistent).
-- Error assertions match on SQLSTATE, not exact message wording.

create extension if not exists pgtap;

begin;

select plan(26);

\set user_a '11111111-1111-1111-1111-111111111111'
\set reviewer_x '99999999-9999-9999-9999-999999999999'
\set person_prov '33333333-3333-3333-3333-333333333333'
\set person_admin '44444444-4444-4444-4444-444444444444'
\set person_merged '55555555-5555-5555-5555-555555555555'
\set person_linked '66666666-6666-6666-6666-666666666666'
\set person_deceased '77777777-7777-7777-7777-777777777777'
\set person_absent '88888888-8888-8888-8888-888888888888'

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
  (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'x', now(), now(), now()),
  (:'reviewer_x', 'authenticated', 'authenticated', 'reviewer-x@example.test', 'x', now(), now(), now());

insert into public.people (id, given_name, family_name, preferred_name, display_name, is_deceased, verification_status, source_type)
values
  (:'person_prov', 'Ada', 'Lovelace', null, 'Ada Lovelace', false, 'provisional', 'imported_historical'),
  (:'person_admin', 'Grace', 'Hopper', 'Grace', 'Grace Hopper', false, 'verified_admin', 'admin_entered'),
  (:'person_merged', 'Duplicate', 'Record', null, 'Duplicate Record', false, 'merged', 'admin_entered'),
  (:'person_linked', 'Already', 'Linked', null, 'Already Linked', false, 'verified_self', 'self_reported'),
  (:'person_deceased', 'Historic', 'Figure', null, 'Historic Figure', true, 'provisional', 'imported_historical');

insert into public.person_narrative (person_id, body, source_type, verification_status)
values (:'person_prov', 'A tropical-forest ecologist documented from historical records.', 'admin_entered', 'provisional');

insert into public.profile_claims (id, claimant_user_id, claimed_person_id, status, reviewer_admin_id, decided_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'user_a', :'person_linked', 'approved', :'reviewer_x', now());
insert into public.user_person_links (user_id, person_id, status, source_claim_id)
values (:'user_a', :'person_linked', 'active', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- 1. Function exists.
select has_function('public', 'get_person_biography', array['uuid'], 'get_person_biography(uuid) exists');

-- 2. anon has no EXECUTE -> permission denied (42501).
set local role anon;
select throws_ok(
  $$ select public.get_person_biography('33333333-3333-3333-3333-333333333333') $$,
  '42501',
  NULL,
  'anon cannot execute get_person_biography'
);
reset role;

-- 3. authenticated but no jwt sub -> function raises 'authentication required'.
set local role authenticated;
select throws_ok(
  $$ select public.get_person_biography('33333333-3333-3333-3333-333333333333') $$,
  'get_person_biography: authentication required',
  'get_person_biography requires auth.uid()'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

-- 4-9. Identity + provenance of the provisional person.
select is((public.get_person_biography(:'person_prov')->'identity'->>'display_name'), 'Ada Lovelace', 'display_name returned');
select is((public.get_person_biography(:'person_prov')->'identity'->>'given_name'), 'Ada', 'given_name returned');
select is((public.get_person_biography(:'person_prov')->'identity'->>'family_name'), 'Lovelace', 'family_name returned');
select is((public.get_person_biography(:'person_prov')->'identity'->>'is_deceased'), 'false', 'is_deceased false');
select is((public.get_person_biography(:'person_prov')->'provenance'->>'source_type'), 'imported_historical', 'identity provenance source_type');
select is((public.get_person_biography(:'person_prov')->'provenance'->>'verification_status'), 'provisional', 'identity provenance verification_status');

-- 10. Unclaimed.
select is((public.get_person_biography(:'person_prov')->>'is_claimed'), 'false', 'provisional person is not claimed');

-- 11. Exact life dates WITHHELD: no date_of_birth key on identity.
select is(((public.get_person_biography(:'person_prov')->'identity') ? 'date_of_birth'), false, 'date_of_birth withheld from identity');

-- 12-13. withheld policy list names the withheld date fields.
select is(((public.get_person_biography(:'person_prov')->'withheld') @> '["date_of_birth"]'::jsonb), true, 'withheld lists date_of_birth');
select is(((public.get_person_biography(:'person_prov')->'withheld') @> '["date_of_death"]'::jsonb), true, 'withheld lists date_of_death');

-- 14-15. Narrative present, with its own provenance.
select is((public.get_person_biography(:'person_prov')->'narrative'->>'body'), 'A tropical-forest ecologist documented from historical records.', 'narrative body returned');
select is((public.get_person_biography(:'person_prov')->'narrative'->>'source_type'), 'admin_entered', 'narrative carries its own source_type');

-- 16-17. Admin-verified person: state reflected, narrative absent (json null).
select is((public.get_person_biography(:'person_admin')->'provenance'->>'verification_status'), 'verified_admin', 'verified_admin reflected');
select is((public.get_person_biography(:'person_admin')->'narrative'), 'null'::jsonb, 'absent narrative is json null, not fabricated');

-- 18. Linked person reads as claimed.
select is((public.get_person_biography(:'person_linked')->>'is_claimed'), 'true', 'actively-linked person is claimed');

-- 19-20. Merged and nonexistent both return SQL null.
select is(public.get_person_biography(:'person_merged'), null::jsonb, 'merged person returns null');
select is(public.get_person_biography(:'person_absent'), null::jsonb, 'nonexistent person returns null');

-- 21. Deceased state surfaced (without exact date).
select is((public.get_person_biography(:'person_deceased')->'identity'->>'is_deceased'), 'true', 'is_deceased true surfaced');

reset role;

-- 22-23. person_narrative is not directly readable by anon or authenticated.
set local role anon;
select throws_ok(
  $$ select 1 from public.person_narrative limit 1 $$,
  '42501',
  NULL,
  'anon cannot read person_narrative directly'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'user_a';
select throws_ok(
  $$ select 1 from public.person_narrative limit 1 $$,
  '42501',
  NULL,
  'authenticated cannot read person_narrative directly'
);
reset role;

-- 24-26. person_narrative constraints (checked as table owner).
select throws_ok(
  $$ insert into public.person_narrative (person_id, body, source_type) values ('33333333-3333-3333-3333-333333333333', '   ', 'admin_entered') $$,
  '23514',
  'new row for relation "person_narrative" violates check constraint "person_narrative_body_not_blank"',
  'blank narrative body is rejected'
);
select throws_ok(
  $$ insert into public.person_narrative (person_id, body, source_type) values ('44444444-4444-4444-4444-444444444444', 'ok', 'not_a_valid_source') $$,
  '23514',
  'new row for relation "person_narrative" violates check constraint "person_narrative_source_type_valid"',
  'invalid narrative source_type is rejected'
);
select throws_ok(
  $$ insert into public.person_narrative (person_id, body, source_type) values ('33333333-3333-3333-3333-333333333333', 'second narrative', 'admin_entered') $$,
  '23505',
  'duplicate key value violates unique constraint "person_narrative_one_current_per_person"',
  'a second narrative for the same person is rejected (one current per person)'
);

select * from finish();

rollback;
