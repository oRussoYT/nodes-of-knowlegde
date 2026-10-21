-- pgTAP tests for Milestone M6.5: Institution Engine.
--
-- Run locally via: npm run supabase:test. Requires `supabase start` (Docker).
-- NOT executed in the authoring environment.
--
-- Scope: additive organizations identity extension; organization_types /
-- organization_names / organization_external_identifiers /
-- organization_narrative / organization_events; and get_organization /
-- get_organization_timeline / get_organization_participation (authorization,
-- Event projection WITHOUT duplication, Participation projection from canonical
-- records, historical/closed/nonexistent readability, empty states, ordering,
-- deny-by-default). 4-arg throws_ok; constraint/FK assertions match the native
-- constraint name; permission denials pass NULL. Each constraint fixture is
-- unique in every other respect so no unrelated constraint masks it.

create extension if not exists pgtap;

begin;

select plan(57);

\set user_a '11111111-1111-1111-1111-111111111111'
\set org_active 'a1000000-0000-0000-0000-000000000001'
\set org_hist   'a2000000-0000-0000-0000-000000000002'
\set org_bare   'a3000000-0000-0000-0000-000000000003'
\set person_p '33333333-3333-3333-3333-333333333333'
\set person_merged '55555555-5555-5555-5555-555555555555'
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

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'x', now(), now(), now());

insert into public.organizations
  (id, name, short_name, organization_type, status, founding_date, founding_precision, founding_is_approximate, location, website, source_type, verification_status) values
  (:'org_active', 'Alpha Field Station', 'AFS', 'field_station', 'active', '1979-01-01', 'year', true, 'Amazonas, Brazil', 'https://example.test', 'imported_historical', 'provisional');
insert into public.organizations
  (id, name, status, founding_date, founding_precision, closure_date, closure_precision) values
  (:'org_hist', 'Beta Historical Institute', 'historical', '1960-01-01', 'year', '1995-01-01', 'year');
insert into public.organizations (id, name) values
  (:'org_bare', 'Gamma Bare Organization');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'person_p', 'Percy', 'Person', 'Percy Person', 'provisional', 'imported_historical'),
  (:'person_merged', 'Mel', 'Merged', 'Mel Merged', 'merged', 'admin_entered');

insert into public.events (id, event_kind, title, start_date, start_precision, source_type) values
  (:'ev1', 'site_established', 'Station established', '1979-01-01', 'year', 'imported_historical');
insert into public.organization_events (organization_id, event_id) values (:'org_active', :'ev1');

insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type) values
  (:'person_p', :'org_active', 'researcher', '1980-01-01', 'year', 'imported_historical'),
  (:'person_merged', :'org_active', 'director', '1985-01-01', 'year', 'imported_historical');

insert into public.organization_names (organization_id, name, name_type, start_date, start_precision, end_date, end_precision, source_type) values
  (:'org_active', 'Alpha Research Camp', 'former', '1979-01-01', 'year', '1990-01-01', 'year', 'imported_historical');
insert into public.organization_external_identifiers (organization_id, scheme, identifier_value, source_type) values
  (:'org_active', 'ror', 'https://ror.org/01abc23de', 'imported_historical');
insert into public.organization_narrative (organization_id, kind, body, source_type) values
  (:'org_active', 'introduction', 'Founded to study tropical-forest fragmentation.', 'imported_historical');

-- ---- Constraint / integrity tests (SQLSTATE + native constraint name) ----
select throws_ok(
  $$ insert into public.organizations (name, status) values ('   ', 'active') $$,
  '23514', 'new row for relation "organizations" violates check constraint "organizations_name_not_blank"',
  'blank organization name rejected');
select throws_ok(
  $$ insert into public.organizations (name, status) values ('X', 'bogus') $$,
  '23514', 'new row for relation "organizations" violates check constraint "organizations_status_valid"',
  'invalid status rejected');
select throws_ok(
  $$ insert into public.organizations (name, organization_type) values ('X', 'no_such_type') $$,
  '23503', 'insert or update on table "organizations" violates foreign key constraint "organizations_organization_type_fkey"',
  'unknown organization_type rejected (FK)');
select throws_ok(
  $$ insert into public.organizations (name, founding_date) values ('X', '1979-01-01') $$,
  '23514', 'new row for relation "organizations" violates check constraint "organizations_founding_precision_matches_date"',
  'founding_date without precision rejected');
select throws_ok(
  $$ insert into public.organizations (name, founding_date, founding_precision, closure_date, closure_precision) values ('X', '1990-01-01', 'year', '1985-01-01', 'year') $$,
  '23514', 'new row for relation "organizations" violates check constraint "organizations_closure_after_founding"',
  'closure before founding rejected');
select throws_ok(
  $$ insert into public.organizations (name, founding_is_approximate) values ('X', true) $$,
  '23514', 'new row for relation "organizations" violates check constraint "organizations_founding_approx_requires_date"',
  'approximate founding without a date rejected');
select throws_ok(
  $$ insert into public.organizations (name, source_type) values ('X', 'made_up') $$,
  '23514', 'new row for relation "organizations" violates check constraint "organizations_source_type_valid"',
  'invalid organization source_type rejected');
select throws_ok(
  $$ insert into public.organization_names (organization_id, name, name_type, source_type) values ('a1000000-0000-0000-0000-000000000001', '   ', 'former', 'admin_entered') $$,
  '23514', 'new row for relation "organization_names" violates check constraint "organization_names_name_not_blank"',
  'blank historical name rejected');
select throws_ok(
  $$ insert into public.organization_names (organization_id, name, name_type, source_type) values ('a1000000-0000-0000-0000-000000000001', 'X', 'bogus', 'admin_entered') $$,
  '23514', 'new row for relation "organization_names" violates check constraint "organization_names_type_valid"',
  'invalid name_type rejected');
select throws_ok(
  $$ insert into public.organization_names (organization_id, name, name_type, start_date, source_type) values ('a1000000-0000-0000-0000-000000000001', 'X', 'former', '1979-01-01', 'admin_entered') $$,
  '23514', 'new row for relation "organization_names" violates check constraint "organization_names_start_precision_matches_date"',
  'name start_date without precision rejected');
select throws_ok(
  $$ insert into public.organization_external_identifiers (organization_id, scheme, identifier_value, source_type) values ('a1000000-0000-0000-0000-000000000001', 'ror', 'https://ror.org/01abc23de', 'admin_entered') $$,
  '23505', 'duplicate key value violates unique constraint "organization_external_identifiers_unique"',
  'duplicate external identifier rejected');
select throws_ok(
  $$ insert into public.organization_external_identifiers (organization_id, scheme, identifier_value, source_type) values ('a1000000-0000-0000-0000-000000000001', 'bogus', 'X', 'admin_entered') $$,
  '23514', 'new row for relation "organization_external_identifiers" violates check constraint "organization_external_identifiers_scheme_valid"',
  'invalid external identifier scheme rejected');
select throws_ok(
  $$ insert into public.organization_external_identifiers (organization_id, scheme, identifier_value, source_type) values ('a1000000-0000-0000-0000-000000000001', 'ror', '   ', 'admin_entered') $$,
  '23514', 'new row for relation "organization_external_identifiers" violates check constraint "organization_external_identifiers_value_not_blank"',
  'blank external identifier value rejected');
select throws_ok(
  $$ insert into public.organization_narrative (organization_id, kind, body, source_type) values ('a1000000-0000-0000-0000-000000000001', 'overview', '   ', 'admin_entered') $$,
  '23514', 'new row for relation "organization_narrative" violates check constraint "organization_narrative_body_not_blank"',
  'blank narrative body rejected');
select throws_ok(
  $$ insert into public.organization_narrative (organization_id, kind, body, source_type) values ('a1000000-0000-0000-0000-000000000001', 'bogus', 'X', 'admin_entered') $$,
  '23514', 'new row for relation "organization_narrative" violates check constraint "organization_narrative_kind_valid"',
  'invalid narrative kind rejected');
select throws_ok(
  $$ insert into public.organization_narrative (organization_id, kind, body, source_type) values ('a1000000-0000-0000-0000-000000000001', 'introduction', 'second intro', 'admin_entered') $$,
  '23505', 'duplicate key value violates unique constraint "organization_narrative_one_per_facet"',
  'a second narrative for the same facet rejected');
select throws_ok(
  $$ insert into public.organization_events (organization_id, event_id) values ('a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001') $$,
  '23505', 'duplicate key value violates unique constraint "organization_events_unique"',
  'duplicate event projection rejected');
select throws_ok(
  $$ insert into public.organization_events (organization_id, event_id) values ('a1000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-0000000000ff') $$,
  '23503', 'insert or update on table "organization_events" violates foreign key constraint "organization_events_event_id_fkey"',
  'projecting an unknown event rejected (FK)');

-- ---- Read-model existence + authorization ----
select has_function('public', 'get_organization', array['uuid'], 'get_organization(uuid) exists');
select has_function('public', 'get_organization_timeline', array['uuid'], 'get_organization_timeline(uuid) exists');
select has_function('public', 'get_organization_participation', array['uuid'], 'get_organization_participation(uuid) exists');

set local role anon;
select throws_ok($$ select public.get_organization('a1000000-0000-0000-0000-000000000001') $$, '42501', NULL, 'anon cannot execute get_organization');
select throws_ok($$ select public.get_organization_timeline('a1000000-0000-0000-0000-000000000001') $$, '42501', NULL, 'anon cannot execute get_organization_timeline');
select throws_ok($$ select public.get_organization_participation('a1000000-0000-0000-0000-000000000001') $$, '42501', NULL, 'anon cannot execute get_organization_participation');
select throws_ok($$ select 1 from public.organizations limit 1 $$, '42501', NULL, 'anon cannot read organizations directly');
select throws_ok($$ select 1 from public.organization_narrative limit 1 $$, '42501', NULL, 'anon cannot read organization_narrative directly');
select throws_ok($$ select 1 from public.organization_events limit 1 $$, '42501', NULL, 'anon cannot read organization_events directly');
reset role;

set local role authenticated;
select throws_ok($$ select public.get_organization('a1000000-0000-0000-0000-000000000001') $$, 'get_organization: authentication required', 'get_organization requires auth.uid()');
select throws_ok($$ select 1 from public.organizations limit 1 $$, '42501', NULL, 'authenticated cannot read organizations directly');
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is((public.get_organization(:'org_active')->>'name'), 'Alpha Field Station', 'canonical name returned');
select is((public.get_organization(:'org_active')->'type'->>'label'), 'Field station', 'institution type resolved from vocabulary');
select is((public.get_organization(:'org_active')->>'status'), 'active', 'status returned');
select is((public.get_organization(:'org_active')->'founding'->>'date'), '1979-01-01', 'founding date returned');
select is((public.get_organization(:'org_active')->'founding'->>'is_approximate'), 'true', 'approximate founding flagged');
select is((public.get_organization(:'org_active')->>'location'), 'Amazonas, Brazil', 'location returned');
select is(jsonb_array_length(public.get_organization(:'org_active')->'names'), 1, 'one historical name returned');
select is((public.get_organization(:'org_active')->'names'->0->>'name_type'), 'former', 'historical name type resolved');
select is((public.get_organization(:'org_active')->'names'->0->>'name'), 'Alpha Research Camp', 'historical name form preserved');
select is(jsonb_array_length(public.get_organization(:'org_active')->'external_identifiers'), 1, 'one external identifier returned');
select is((public.get_organization(:'org_active')->'external_identifiers'->0->>'scheme'), 'ror', 'external identifier scheme resolved');
select is(jsonb_array_length(public.get_organization(:'org_active')->'narrative'), 1, 'one narrative facet returned');
select is((public.get_organization(:'org_active')->'narrative'->0->>'kind'), 'introduction', 'narrative facet kind resolved');
select is((public.get_organization(:'org_active')->'provenance'->>'source_type'), 'imported_historical', 'organization provenance present');

select is((public.get_organization(:'org_hist')->>'status'), 'historical', 'a historical institution is readable, not hidden');
select is((public.get_organization(:'org_hist')->'closure'->>'date'), '1995-01-01', 'closure date returned for a historical institution');

select is(jsonb_array_length(public.get_organization_timeline(:'org_active')->'events'), 1, 'institution timeline projects one event');
select is((public.get_organization_timeline(:'org_active')->'events'->0->>'id'), 'e1000000-0000-0000-0000-000000000001', 'the projected event is the CANONICAL event (not a copy)');
select is((public.get_organization_timeline(:'org_active')->'events'->0->>'title'), 'Station established', 'projected event content resolved');

select is(jsonb_array_length(public.get_organization_participation(:'org_active')->'participations'), 1, 'institution participation projects one person (merged omitted)');
select is((public.get_organization_participation(:'org_active')->'participations'->0->'person'->>'display_name'), 'Percy Person', 'participation projects the person as counterpart');
select is((public.get_organization_participation(:'org_active')->'participations'->0->'capacity'->>'label'), 'Researcher', 'participation capacity resolved');

select is((public.get_organization(:'org_bare')->'names'), '[]'::jsonb, 'a bare institution has an empty names array, not null');
select is((public.get_organization(:'org_bare')->'narrative'), '[]'::jsonb, 'a bare institution has an empty narrative array, not null');
select is((public.get_organization_timeline(:'org_bare')->'events'), '[]'::jsonb, 'a bare institution has an empty timeline, not null');
select is(public.get_organization('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent institution returns null');
select is(public.get_organization_timeline('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent institution timeline returns null');
select is(public.get_organization_participation('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent institution participation returns null');

reset role;

select * from finish();

rollback;
