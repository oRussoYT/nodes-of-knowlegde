-- pgTAP tests for Milestone M6.3: Participation Engine.
--
-- Run locally via: npm run supabase:test  (supabase test db). Requires
-- `supabase start` (Docker). NOT executed in the authoring environment.
--
-- Scope: participation_capacities / organizations / participations (temporal +
-- belonging constraints, deny-by-default access) and get_person_participation
-- (authorization, organization + capacity resolution, provenance, chronological
-- ordering, undated handling, empty/merged/null). Error assertions match on
-- SQLSTATE; constraint/FK assertions additionally match PostgreSQL's native
-- message, which names the specific constraint that fired (proving the intended
-- invariant, not merely that some error occurred). Permission-denial assertions
-- pass NULL for the message -- only the 42501 SQLSTATE is contract.

create extension if not exists pgtap;

begin;

select plan(33);

\set user_a '11111111-1111-1111-1111-111111111111'
\set person_p '33333333-3333-3333-3333-333333333333'
\set person_merged '55555555-5555-5555-5555-555555555555'
\set person_empty '77777777-7777-7777-7777-777777777777'

\set org_alpha 'b0000000-0000-0000-0000-000000000001'
\set org_beta  'b0000000-0000-0000-0000-000000000002'

\set pa_researcher 'c0000000-0000-0000-0000-000000000001'
\set pa_director   'c0000000-0000-0000-0000-000000000002'
\set pa_visiting   'c0000000-0000-0000-0000-000000000003'
\set pa_student    'c0000000-0000-0000-0000-000000000004'

-- Independence: clear the NO ACTION people-child tables before people so this
-- suite does not abort on committed rows the e2e claim-workflow may leave on
-- the seeded people (profile_claims/user_person_links reference people ON
-- DELETE NO ACTION; both are empty in every other suite). No constraint is
-- weakened and FK enforcement stays on.
delete from public.user_person_links;
delete from public.profile_claims;
delete from public.people;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'x', now(), now(), now());

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'person_p', 'Parti', 'Cipant', 'Parti Cipant', 'provisional', 'imported_historical'),
  (:'person_merged', 'Merged', 'Away', 'Merged Away', 'merged', 'admin_entered'),
  (:'person_empty', 'No', 'Belonging', 'No Belonging', 'provisional', 'imported_historical');

insert into public.organizations (id, name, short_name) values
  (:'org_alpha', 'Alpha Research Station', 'ALFA'),
  (:'org_beta',  'Beta Institute',        null);

-- Four participations across two organizations, exercising: a dated range, an
-- open-ended (still-current) belonging, an approximate period, an undated
-- belonging, TWO capacities at one organization (Alpha), and a person
-- belonging to two organizations CONCURRENTLY (Alpha + Beta overlap ~1990).
insert into public.participations
  (id, person_id, organization_id, capacity, summary, start_date, start_precision, end_date, end_precision, is_approximate, is_ongoing, date_is_unknown, date_is_uncertain, source_type) values
  (:'pa_researcher', :'person_p', :'org_alpha', 'researcher',          'Field research programme.', '1987-01-01', 'year', '1991-01-01', 'year', false, false, false, false, 'imported_historical'),
  (:'pa_director',   :'person_p', :'org_alpha', 'director',            null,                        '1992-01-01', 'year', null,         null,   false, true,  false, false, 'imported_historical'),
  (:'pa_visiting',   :'person_p', :'org_beta',  'visiting_researcher', null,                        '1990-01-01', 'year', null,         null,   true,  false, false, false, 'imported_historical'),
  (:'pa_student',    :'person_p', :'org_beta',  'student',             null,                        null,         null,   null,         null,   false, false, true,  false, 'imported_historical');

-- ---- Constraint tests (as table owner; SQLSTATE + native constraint name) ----
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', '1990-01-01', 'century', 'admin_entered') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_start_precision_valid"',
  'invalid start_precision rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, start_date, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', '1990-01-01', 'admin_entered') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_start_precision_matches_date"',
  'start_date without precision rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', false, 'admin_entered') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_unknown_iff_no_start"',
  'no start and not unknown rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, date_is_unknown, is_approximate, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', true, true, 'admin_entered') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_unknown_excludes_qualifiers"',
  'undated + approximate rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', '1990-01-01', 'year', '1985-01-01', 'year', 'admin_entered') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_end_after_start"',
  'end before start rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, is_ongoing, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', '1990-01-01', 'year', '1992-01-01', 'year', true, 'admin_entered') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_ongoing_requires_open_start"',
  'ongoing with an end rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type, verification_status) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', true, 'admin_entered', 'made_up') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_verification_status_valid"',
  'invalid verification_status rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'researcher', true, 'made_up') $$,
  '23514',
  'new row for relation "participations" violates check constraint "participations_source_type_valid"',
  'invalid source_type rejected'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'no_such_capacity', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "participations" violates foreign key constraint "participations_capacity_fkey"',
  'unknown capacity rejected (FK)'
);
select throws_ok(
  $$ insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type) values ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-0000000000ff', 'researcher', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "participations" violates foreign key constraint "participations_organization_id_fkey"',
  'unknown organization rejected (FK)'
);
select throws_ok(
  $$ insert into public.organizations (name) values ('   ') $$,
  '23514',
  'new row for relation "organizations" violates check constraint "organizations_name_not_blank"',
  'blank organization name rejected'
);

-- ---- Read-model existence + authorization ----
select has_function('public', 'get_person_participation', array['uuid'], 'get_person_participation(uuid) exists');

set local role anon;
select throws_ok(
  $$ select public.get_person_participation('33333333-3333-3333-3333-333333333333') $$,
  '42501',
  NULL,
  'anon cannot execute get_person_participation'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select public.get_person_participation('33333333-3333-3333-3333-333333333333') $$,
  'get_person_participation: authentication required',
  'get_person_participation requires auth.uid()'
);
reset role;

-- Deny-by-default: no direct client reads of the participation tables.
set local role anon;
select throws_ok(
  $$ select 1 from public.participations limit 1 $$,
  '42501',
  NULL,
  'anon cannot read participations directly'
);
reset role;
set local role authenticated;
select throws_ok(
  $$ select 1 from public.participations limit 1 $$,
  '42501',
  NULL,
  'authenticated cannot read participations directly'
);
reset role;
set local role anon;
select throws_ok(
  $$ select 1 from public.organizations limit 1 $$,
  '42501',
  NULL,
  'anon cannot read organizations directly'
);
select throws_ok(
  $$ select 1 from public.participation_capacities limit 1 $$,
  '42501',
  NULL,
  'anon cannot read participation_capacities directly'
);
reset role;

-- ---- Read content, as an authenticated caller ----
-- Flat chronological order (start asc nulls last, created asc):
--   [0] researcher @ Alpha 1987-1991, [1] visiting @ Beta c.1990,
--   [2] director @ Alpha 1992-present, [3] student @ Beta (undated).
set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is(jsonb_array_length(public.get_person_participation(:'person_p')->'participations'), 4, 'returns all four participations');
select is((public.get_person_participation(:'person_p')->'participations'->0->'organization'->>'name'), 'Alpha Research Station', 'earliest participation is first (chronological order)');
select is((public.get_person_participation(:'person_p')->'participations'->0->'capacity'->>'key'), 'researcher', 'capacity key present');
select is((public.get_person_participation(:'person_p')->'participations'->0->'capacity'->>'label'), 'Researcher', 'capacity label resolved from vocabulary');
select is((public.get_person_participation(:'person_p')->'participations'->0->'temporal'->>'end_date'), '1991-01-01', 'bounded belonging end preserved');
select is((public.get_person_participation(:'person_p')->'participations'->0->'organization'->>'short_name'), 'ALFA', 'organization short_name resolved');
select is((public.get_person_participation(:'person_p')->'participations'->1->'temporal'->>'is_approximate'), 'true', 'approximate period flagged');
select is((public.get_person_participation(:'person_p')->'participations'->1->'organization'->>'name'), 'Beta Institute', 'concurrent belonging at a second organization present');
select is((public.get_person_participation(:'person_p')->'participations'->2->'temporal'->>'is_ongoing'), 'true', 'open-ended (still-current) belonging flagged');
select is((public.get_person_participation(:'person_p')->'participations'->3->'temporal'->>'date_is_unknown'), 'true', 'undated belonging sorts last and is flagged');
select is((public.get_person_participation(:'person_p')->'participations'->3->'capacity'->>'label'), 'Student', 'second capacity resolved from vocabulary');
select is((public.get_person_participation(:'person_p')->'participations'->0->'provenance'->>'source_type'), 'imported_historical', 'participation provenance present');

select is((public.get_person_participation(:'person_empty')->'participations'), '[]'::jsonb, 'a person with no participations gets an empty array, not null');
select is(public.get_person_participation(:'person_merged'), null::jsonb, 'merged person returns null');
select is(public.get_person_participation('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent person returns null');

reset role;

select * from finish();

rollback;
