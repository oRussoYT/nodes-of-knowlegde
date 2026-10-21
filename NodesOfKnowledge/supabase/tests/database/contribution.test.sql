-- pgTAP tests for Milestone M6.6: Contribution Engine.
--
-- Run locally via: npm run supabase:test. Requires `supabase start` (Docker).
-- NOT executed in the authoring environment.
--
-- Scope: contribution_kinds / contribution_capacities vocabularies;
-- contributions (canonical record + shared temporal invariants);
-- person_contributions / organization_contributions attributions (each its own
-- provenance-bearing assertion, capacity distinct from kind); contribution_
-- narrative; contribution_events (canonical Event projection WITHOUT
-- duplication); and get_contribution / get_contribution_timeline /
-- get_person_contributions / get_organization_contributions (authorization,
-- projection consistency, merged-person omission, collective/empty/nonexistent
-- states, ordering, deny-by-default). 4-arg throws_ok; constraint/FK assertions
-- match the native constraint name; permission denials pass NULL. Each
-- constraint fixture is unique in every other respect so no unrelated
-- constraint masks it.

create extension if not exists pgtap;

begin;

select plan(77);

\set user_a '11111111-1111-1111-1111-111111111111'
\set c_full 'c1000000-0000-0000-0000-000000000001'
\set c_bare 'c2000000-0000-0000-0000-000000000002'
\set c_collective 'c3000000-0000-0000-0000-000000000003'
\set person_p '33333333-3333-3333-3333-333333333333'
\set person_merged '55555555-5555-5555-5555-555555555555'
\set person_none '66666666-6666-6666-6666-666666666666'
\set org1 'a1000000-0000-0000-0000-000000000001'
\set ev1 'e1000000-0000-0000-0000-000000000001'

-- Independence: clear the NO ACTION people-child tables before people so this
-- suite does not abort on committed rows the e2e claim-workflow may leave on
-- the seeded people (profile_claims/user_person_links reference people ON
-- DELETE NO ACTION; both are empty in every other suite). No constraint is
-- weakened and FK enforcement stays on.
delete from public.user_person_links;
delete from public.profile_claims;
delete from public.people;
delete from public.organizations;
delete from public.contributions;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'x', now(), now(), now());

insert into public.organizations (id, name, short_name) values
  (:'org1', 'Alpha Institute', 'AI');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'person_p', 'Percy', 'Person', 'Percy Person', 'provisional', 'imported_historical'),
  (:'person_merged', 'Mel', 'Merged', 'Mel Merged', 'merged', 'admin_entered'),
  (:'person_none', 'Nadia', 'None', 'Nadia None', 'provisional', 'imported_historical');

insert into public.events (id, event_kind, title, start_date, start_precision, source_type) values
  (:'ev1', 'other', 'Programme announced', '1980-01-01', 'year', 'imported_historical');

insert into public.contributions
  (id, title, contribution_kind, description, start_date, start_precision, is_ongoing, place, source_type, verification_status) values
  (:'c_full', 'Establishment of long-term monitoring', 'long_term_monitoring', 'A decades-long monitoring programme.', '1980-01-01', 'year', true, 'Amazonas, Brazil', 'imported_historical', 'provisional');
insert into public.contributions (id, title, contribution_kind, date_is_unknown, source_type) values
  (:'c_bare', 'Bare contribution', 'other', true, 'imported_historical');
insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type) values
  (:'c_collective', 'Community stewardship practice', 'community_governance', '1990-01-01', 'year', 'imported_historical');

insert into public.person_contributions (contribution_id, person_id, capacity, attribution_note, source_type) values
  (:'c_full', :'person_p', 'field_observation', 'Led the field observations.', 'imported_historical'),
  (:'c_full', :'person_merged', 'coordination', null, 'imported_historical');

insert into public.organization_contributions (contribution_id, organization_id, capacity, attribution_note, source_type) values
  (:'c_full', :'org1', 'funding', 'Funded the programme.', 'imported_historical'),
  (:'c_collective', :'org1', 'community_governance', null, 'imported_historical');

insert into public.contribution_narrative (contribution_id, kind, body, source_type) values
  (:'c_full', 'overview', 'A programme that monitored forest dynamics over decades.', 'imported_historical');

insert into public.contribution_events (contribution_id, event_id) values (:'c_full', :'ev1');

-- ---- Vocabulary integrity ----
select throws_ok(
  $$ insert into public.contribution_kinds (key, label) values ('   ', 'X') $$,
  '23514', 'new row for relation "contribution_kinds" violates check constraint "contribution_kinds_key_not_blank"',
  'blank contribution_kind key rejected');
select throws_ok(
  $$ insert into public.contribution_capacities (key, label) values ('   ', 'X') $$,
  '23514', 'new row for relation "contribution_capacities" violates check constraint "contribution_capacities_key_not_blank"',
  'blank contribution_capacity key rejected');

-- ---- contributions: constraints + shared temporal invariants ----
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, start_precision, source_type) values ('   ', 'other', '1990-01-01', 'year', 'admin_entered') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_title_not_blank"',
  'blank contribution title rejected');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, start_precision, source_type) values ('X', 'no_such_kind', '1990-01-01', 'year', 'admin_entered') $$,
  '23503', 'insert or update on table "contributions" violates foreign key constraint "contributions_contribution_kind_fkey"',
  'unknown contribution_kind rejected (FK)');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, source_type) values ('X', 'other', '1990-01-01', 'admin_entered') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_start_precision_matches_date"',
  'start_date without precision rejected');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, start_precision, end_date, end_precision, source_type) values ('X', 'other', '1995-01-01', 'year', '1990-01-01', 'year', 'admin_entered') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_end_after_start"',
  'end before start rejected');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, start_precision, end_date, end_precision, is_ongoing, source_type) values ('X', 'other', '1990-01-01', 'year', '1995-01-01', 'year', true, 'admin_entered') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_ongoing_requires_open_start"',
  'ongoing with a closed end rejected');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, date_is_unknown, is_approximate, source_type) values ('X', 'other', true, true, 'admin_entered') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_unknown_excludes_qualifiers"',
  'undated contribution cannot also be approximate');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, start_precision, source_type) values ('X', 'other', '1990-01-01', 'year', 'made_up') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_source_type_valid"',
  'invalid contribution source_type rejected');
select throws_ok(
  $$ insert into public.contributions (title, contribution_kind, start_date, start_precision, source_type, verification_status) values ('X', 'other', '1990-01-01', 'year', 'admin_entered', 'bogus') $$,
  '23514', 'new row for relation "contributions" violates check constraint "contributions_verification_status_valid"',
  'invalid contribution verification_status rejected');

-- ---- person_contributions: attribution integrity ----
select throws_ok(
  $$ insert into public.person_contributions (contribution_id, person_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'field_observation', 'admin_entered') $$,
  '23503', 'insert or update on table "person_contributions" violates foreign key constraint "person_contributions_person_id_fkey"',
  'attribution to an unknown person rejected (FK)');
select throws_ok(
  $$ insert into public.person_contributions (contribution_id, person_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'no_such_capacity', 'admin_entered') $$,
  '23503', 'insert or update on table "person_contributions" violates foreign key constraint "person_contributions_capacity_fkey"',
  'attribution with an unknown capacity rejected (FK)');
select throws_ok(
  $$ insert into public.person_contributions (contribution_id, person_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'field_observation', 'admin_entered') $$,
  '23505', 'duplicate key value violates unique constraint "person_contributions_unique"',
  'duplicate person attribution (same capacity) rejected');
select throws_ok(
  $$ insert into public.person_contributions (contribution_id, person_id, capacity, attribution_note, source_type) values ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'documentation', '   ', 'admin_entered') $$,
  '23514', 'new row for relation "person_contributions" violates check constraint "person_contributions_note_not_blank"',
  'blank attribution note rejected');
select throws_ok(
  $$ insert into public.person_contributions (contribution_id, person_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'analysis', 'made_up') $$,
  '23514', 'new row for relation "person_contributions" violates check constraint "person_contributions_source_type_valid"',
  'invalid person attribution source_type rejected');

-- ---- organization_contributions: attribution integrity ----
select throws_ok(
  $$ insert into public.organization_contributions (contribution_id, organization_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-0000000000ff', 'funding', 'admin_entered') $$,
  '23503', 'insert or update on table "organization_contributions" violates foreign key constraint "organization_contributions_organization_id_fkey"',
  'attribution to an unknown organization rejected (FK)');
select throws_ok(
  $$ insert into public.organization_contributions (contribution_id, organization_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'no_such_capacity', 'admin_entered') $$,
  '23503', 'insert or update on table "organization_contributions" violates foreign key constraint "organization_contributions_capacity_fkey"',
  'organization attribution with an unknown capacity rejected (FK)');
select throws_ok(
  $$ insert into public.organization_contributions (contribution_id, organization_id, capacity, source_type) values ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'funding', 'admin_entered') $$,
  '23505', 'duplicate key value violates unique constraint "organization_contributions_unique"',
  'duplicate organization attribution (same capacity) rejected');

-- ---- contribution_narrative: facet integrity ----
select throws_ok(
  $$ insert into public.contribution_narrative (contribution_id, kind, body, source_type) values ('c1000000-0000-0000-0000-000000000001', 'context', '   ', 'admin_entered') $$,
  '23514', 'new row for relation "contribution_narrative" violates check constraint "contribution_narrative_body_not_blank"',
  'blank narrative body rejected');
select throws_ok(
  $$ insert into public.contribution_narrative (contribution_id, kind, body, source_type) values ('c1000000-0000-0000-0000-000000000001', 'bogus', 'X', 'admin_entered') $$,
  '23514', 'new row for relation "contribution_narrative" violates check constraint "contribution_narrative_kind_valid"',
  'invalid narrative kind rejected');
select throws_ok(
  $$ insert into public.contribution_narrative (contribution_id, kind, body, source_type) values ('c1000000-0000-0000-0000-000000000001', 'overview', 'second overview', 'admin_entered') $$,
  '23505', 'duplicate key value violates unique constraint "contribution_narrative_one_per_facet"',
  'a second narrative for the same facet rejected');

-- ---- contribution_events: projection integrity ----
select throws_ok(
  $$ insert into public.contribution_events (contribution_id, event_id) values ('c1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001') $$,
  '23505', 'duplicate key value violates unique constraint "contribution_events_unique"',
  'duplicate event projection rejected');
select throws_ok(
  $$ insert into public.contribution_events (contribution_id, event_id) values ('c1000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-0000000000ff') $$,
  '23503', 'insert or update on table "contribution_events" violates foreign key constraint "contribution_events_event_id_fkey"',
  'projecting an unknown event rejected (FK)');

-- ---- Read-model existence + authorization ----
select has_function('public', 'get_contribution', array['uuid'], 'get_contribution(uuid) exists');
select has_function('public', 'get_contribution_timeline', array['uuid'], 'get_contribution_timeline(uuid) exists');
select has_function('public', 'get_person_contributions', array['uuid'], 'get_person_contributions(uuid) exists');
select has_function('public', 'get_organization_contributions', array['uuid'], 'get_organization_contributions(uuid) exists');

set local role anon;
select throws_ok($$ select public.get_contribution('c1000000-0000-0000-0000-000000000001') $$, '42501', NULL, 'anon cannot execute get_contribution');
select throws_ok($$ select public.get_contribution_timeline('c1000000-0000-0000-0000-000000000001') $$, '42501', NULL, 'anon cannot execute get_contribution_timeline');
select throws_ok($$ select public.get_person_contributions('33333333-3333-3333-3333-333333333333') $$, '42501', NULL, 'anon cannot execute get_person_contributions');
select throws_ok($$ select public.get_organization_contributions('a1000000-0000-0000-0000-000000000001') $$, '42501', NULL, 'anon cannot execute get_organization_contributions');
select throws_ok($$ select 1 from public.contributions limit 1 $$, '42501', NULL, 'anon cannot read contributions directly');
select throws_ok($$ select 1 from public.person_contributions limit 1 $$, '42501', NULL, 'anon cannot read person_contributions directly');
select throws_ok($$ select 1 from public.organization_contributions limit 1 $$, '42501', NULL, 'anon cannot read organization_contributions directly');
select throws_ok($$ select 1 from public.contribution_narrative limit 1 $$, '42501', NULL, 'anon cannot read contribution_narrative directly');
select throws_ok($$ select 1 from public.contribution_events limit 1 $$, '42501', NULL, 'anon cannot read contribution_events directly');
reset role;

set local role authenticated;
select throws_ok($$ select public.get_contribution('c1000000-0000-0000-0000-000000000001') $$, 'get_contribution: authentication required', 'get_contribution requires auth.uid()');
select throws_ok($$ select 1 from public.contributions limit 1 $$, '42501', NULL, 'authenticated cannot read contributions directly');
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is((public.get_contribution(:'c_full')->>'title'), 'Establishment of long-term monitoring', 'canonical title returned');
select is((public.get_contribution(:'c_full')->'kind'->>'key'), 'long_term_monitoring', 'contribution kind key resolved');
select is((public.get_contribution(:'c_full')->'kind'->>'label'), 'Long-term monitoring', 'contribution kind label resolved from vocabulary');
select is((public.get_contribution(:'c_full')->>'place'), 'Amazonas, Brazil', 'place returned at a chosen granularity');
select is((public.get_contribution(:'c_full')->'temporal'->>'start_date'), '1980-01-01', 'the contribution has its OWN temporal scope');
select is((public.get_contribution(:'c_full')->'temporal'->>'is_ongoing'), 'true', 'an ongoing contribution is flagged');
select is((public.get_contribution(:'c_full')->'provenance'->>'source_type'), 'imported_historical', 'the contribution record has its own provenance');
select is(jsonb_array_length(public.get_contribution(:'c_full')->'narrative'), 1, 'one narrative facet returned');
select is((public.get_contribution(:'c_full')->'narrative'->0->>'kind'), 'overview', 'narrative facet kind resolved');
select is(jsonb_array_length(public.get_contribution(:'c_full')->'contributors'->'people'), 1, 'people attributions returned (merged person omitted)');
select is((public.get_contribution(:'c_full')->'contributors'->'people'->0->'person'->>'display_name'), 'Percy Person', 'person attribution projects the person');
select is((public.get_contribution(:'c_full')->'contributors'->'people'->0->'capacity'->>'key'), 'field_observation', 'contributor capacity is distinct from kind');
select is((public.get_contribution(:'c_full')->'contributors'->'people'->0->>'attribution_note'), 'Led the field observations.', 'attribution note preserved');
select is((public.get_contribution(:'c_full')->'contributors'->'people'->0->'provenance'->>'source_type'), 'imported_historical', 'each attribution carries its own provenance');
select is(jsonb_array_length(public.get_contribution(:'c_full')->'contributors'->'organizations'), 1, 'one organization attribution returned');
select is((public.get_contribution(:'c_full')->'contributors'->'organizations'->0->'organization'->>'name'), 'Alpha Institute', 'organization attribution projects the institution');
select is((public.get_contribution(:'c_full')->'contributors'->'organizations'->0->'capacity'->>'key'), 'funding', 'funding is an institutional capacity, never inferred ownership');

select is(jsonb_array_length(public.get_contribution_timeline(:'c_full')->'events'), 1, 'contribution timeline projects one event');
select is((public.get_contribution_timeline(:'c_full')->'events'->0->>'id'), 'e1000000-0000-0000-0000-000000000001', 'the projected event is the CANONICAL event (not a copy)');
select is((public.get_contribution_timeline(:'c_full')->'events'->0->>'title'), 'Programme announced', 'projected event content resolved');

select is(jsonb_array_length(public.get_person_contributions(:'person_p')->'contributions'), 1, 'person contributions project one attribution');
select is((public.get_person_contributions(:'person_p')->'contributions'->0->'contribution'->>'id'), 'c1000000-0000-0000-0000-000000000001', 'person projection points at the CANONICAL contribution');
select is((public.get_person_contributions(:'person_p')->'contributions'->0->'contribution'->>'title'), 'Establishment of long-term monitoring', 'person projection carries the contribution identity');
select is((public.get_person_contributions(:'person_p')->'contributions'->0->'capacity'->>'key'), 'field_observation', 'person projection carries the person''s capacity');
select is((public.get_person_contributions(:'person_p')->'contributions'->0->'attribution_provenance'->>'source_type'), 'imported_historical', 'person projection carries the attribution provenance');

select is(jsonb_array_length(public.get_organization_contributions(:'org1')->'contributions'), 2, 'institution contributions project both attributions');
select is((public.get_organization_contributions(:'org1')->'contributions'->0->'capacity'->>'key'), 'funding', 'institution projection carries the institutional capacity (undated last: funding first)');

select is(jsonb_array_length(public.get_contribution(:'c_collective')->'contributors'->'people'), 0, 'a collective contribution has NO fabricated person');
select is(jsonb_array_length(public.get_contribution(:'c_collective')->'contributors'->'organizations'), 1, 'a collective contribution is carried by an organization');

select is((public.get_contribution(:'c_bare')->'narrative'), '[]'::jsonb, 'a bare contribution has an empty narrative array, not null');
select is((public.get_contribution(:'c_bare')->'contributors'->'people'), '[]'::jsonb, 'a bare contribution has an empty people array, not null');
select is((public.get_contribution(:'c_bare')->'contributors'->'organizations'), '[]'::jsonb, 'a bare contribution has an empty organizations array, not null');
select is((public.get_contribution_timeline(:'c_bare')->'events'), '[]'::jsonb, 'a bare contribution has an empty timeline, not null');
select is((public.get_person_contributions(:'person_none')->'contributions'), '[]'::jsonb, 'a person with none has an empty contributions array, not null');

select is(public.get_person_contributions(:'person_merged'), null::jsonb, 'a merged person returns null');
select is(public.get_contribution('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent contribution returns null');
select is(public.get_contribution_timeline('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent contribution timeline returns null');
select is(public.get_person_contributions('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent person contributions returns null');
select is(public.get_organization_contributions('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent institution contributions returns null');

reset role;

select * from finish();

rollback;
