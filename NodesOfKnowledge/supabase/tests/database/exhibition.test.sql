-- pgTAP tests for the M6 System Exhibition local seed
-- (supabase/seeds/m6_exhibition.sql; see docs/m6-system-exhibition.md).
--
-- Run locally via: npm run supabase:test  (supabase test db)
-- Requires: `supabase start` running (Docker) AND a seeded database
-- (`supabase db reset` loads the exhibition seed). Unlike the other test
-- files, this one deliberately does NOT delete/recreate its fixtures: it
-- verifies the deterministic, seed-loaded showcase world exists and that
-- every canonical association resolves through the real read models,
-- without duplicating any canonical record. It runs inside a transaction
-- that rolls back, so it neither mutates nor depends on other test files.
--
-- The equivalent assertions were verified against a real PostgreSQL 16
-- instance during development; error/shape assertions match the read
-- models in supabase/migrations/*.

create extension if not exists pgtap;

begin;

select plan(34);

\set helena 'e6110000-0000-4000-8000-000000000001'
\set ana 'e6110000-0000-4000-8000-000000000003'
\set samuel 'e6110000-0000-4000-8000-000000000004'
\set ihfa 'e6220000-0000-4000-8000-000000000001'
\set aet 'e6220000-0000-4000-8000-000000000003'
\set oral 'e6660000-0000-4000-8000-000000000003'
\set interview 'e6330000-0000-4000-8000-000000000006'

-- Deterministic showcase entities exist, in exactly the seeded counts
-- (this doubles as a no-duplicate-canonical-records check).
select is((select count(*)::int from public.people where id::text like 'e611%'), 5, '5 exhibition people');
select is((select count(*)::int from public.organizations where id::text like 'e622%'), 3, '3 exhibition institutions');
select is((select count(*)::int from public.events where id::text like 'e633%'), 13, '13 exhibition events');
select is((select count(*)::int from public.participations where id::text like 'e644%'), 8, '8 exhibition participations');
select is((select count(*)::int from public.relationships where id::text like 'e655%'), 6, '6 exhibition relationships');
select is((select count(*)::int from public.contributions where id::text like 'e666%'), 3, '3 exhibition contributions');
-- M7: institutional relationships (the one new canonical relation) seeded for
-- Knowledge Network lineage inspection.
select is((select count(*)::int from public.organization_relationships where id::text like 'e677%'), 2, '2 exhibition institutional relationships');

set local role authenticated;
set local request.jwt.claim.sub to '00000000-0000-4000-8000-0000000000aa';

-- Scientific Biography: substantial, absent, and disputed states.
select is((public.get_person_biography(:'helena')->'identity'->>'display_name'),
  'Dr. Helena Arvoredo — Development Exhibition', 'principal person resolves with fictional label');
select isnt(public.get_person_biography(:'helena')->'narrative', 'null'::jsonb, 'principal person has a narrative');
select is(public.get_person_biography(:'ana')->'narrative', 'null'::jsonb, 'person with no narrative shows honest absence');
select is((public.get_person_biography(:'samuel')->'provenance'->>'verification_status'), 'disputed', 'disputed person record surfaces disputed provenance');

-- Timeline: the principal life exercises the full temporal spectrum.
select is(jsonb_array_length(public.get_person_timeline(:'helena')->'events'), 9, 'principal timeline has 9 events');
select ok((select bool_or((e->'temporal'->>'date_is_unknown')::bool)
  from jsonb_array_elements(public.get_person_timeline(:'helena')->'events') e), 'timeline includes an unknown date');
select ok((select bool_or((e->'temporal'->>'is_ongoing')::bool)
  from jsonb_array_elements(public.get_person_timeline(:'helena')->'events') e), 'timeline includes an ongoing period');
select ok((select bool_or((e->'temporal'->>'date_is_uncertain')::bool)
  from jsonb_array_elements(public.get_person_timeline(:'helena')->'events') e), 'timeline includes an uncertain date');
select ok((select bool_or(e->'temporal'->>'start_precision' = 'decade')
  from jsonb_array_elements(public.get_person_timeline(:'helena')->'events') e), 'timeline includes decade precision');

-- Participation: same canonical rows projected from both sides.
select is(jsonb_array_length(public.get_person_participation(:'helena')->'participations'), 3, 'person-side participation projection');
select is(jsonb_array_length(public.get_organization_participation(:'ihfa')->'participations'), 4, 'institution-side participation projection');

-- Relationships: directional + symmetric + disputed on one person.
select is(jsonb_array_length(public.get_person_relationships(:'helena')->'relationships'), 5, 'principal has 5 relationships');
select ok((select bool_or(r->'perspective'->>'direction' = 'symmetric')
  from jsonb_array_elements(public.get_person_relationships(:'helena')->'relationships') r), 'a symmetric relationship is present');
select ok((select bool_or(r->'provenance'->>'verification_status' = 'disputed')
  from jsonb_array_elements(public.get_person_relationships(:'helena')->'relationships') r), 'a disputed relationship is present');

-- Contribution: person + institution contributors, projected and on its page.
select is(jsonb_array_length(public.get_person_contributions(:'helena')->'contributions'), 2, 'person-side contribution projection');
select is(jsonb_array_length(public.get_organization_contributions(:'ihfa')->'contributions'), 1, 'institution-side contribution projection');
select is(jsonb_array_length(public.get_contribution(:'oral')->'contributors'->'people'), 2, 'contribution has two person contributors');
select is(jsonb_array_length(public.get_contribution(:'oral')->'contributors'->'organizations'), 1, 'contribution has an institution contributor');

-- Institution Engine: identity richness + closed/incomplete state.
select is(jsonb_array_length(public.get_organization(:'ihfa')->'names'), 2, 'active institution has name history (former + acronym)');
select is(jsonb_array_length(public.get_organization(:'ihfa')->'external_identifiers'), 1, 'active institution has an external identifier');
select is(jsonb_array_length(public.get_organization(:'ihfa')->'narrative'), 3, 'active institution has narrative facets');
select is((public.get_organization(:'aet')->>'status'), 'closed', 'closed institution surfaces closed status');
select ok((public.get_organization(:'aet')->'closure') is not null, 'closed institution surfaces a closure period');

-- Knowledge Network (M7): institutional lineage projects from both ends
-- without duplication -- one canonical succession, inverse roles.
select is(jsonb_array_length(public.get_organization_relationships(:'ihfa')->'relationships'), 2,
  'IHFA has two institutional relationships (a succession and an affiliation)');
select ok(
  (select bool_or(r->'counterpart'->>'id' = :'ihfa' and r->'perspective'->>'counterpart_role_label' = 'Successor')
   from jsonb_array_elements(public.get_organization_relationships(:'aet')->'relationships') r),
  'the one canonical succession reads IHFA as the Successor from AET (inverse projection)');

reset role;

-- Canonical Event reuse without duplication: one interview event row,
-- projected onto a person, an institution, and a contribution timeline.
select is((select count(*)::int from public.events where id = :'interview'), 1, 'canonical interview event exists exactly once');
select ok(
  exists(select 1 from public.person_events where event_id = :'interview')
  and exists(select 1 from public.organization_events where event_id = :'interview')
  and exists(select 1 from public.contribution_events where event_id = :'interview'),
  'canonical event is reused across person, institution, and contribution surfaces');

select * from finish();

rollback;
