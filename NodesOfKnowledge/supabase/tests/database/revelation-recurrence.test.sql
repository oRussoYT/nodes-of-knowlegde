-- pgTAP tests for Milestone M8.5: Revelation Engine -- documented recurrence
-- (supabase/migrations/20260815090000_add_recurrence_revelation.sql).
--
-- Run locally via: npm run supabase:test (requires `supabase start`). NOT run in
-- the authoring environment.
--
-- Scope: reveal_person_recurrence(uuid) and reveal_organization_recurrence(uuid)
-- -- the bounded, deterministic composition of a focal entity's OWN explicit
-- assertions into the phenomena documented to have RECURRED (same role at the
-- same institution; same-kind events; same-kind contributions), each shown only
-- when >= 2 distinct occurrences exist. Asserts: authorization; the >= 2 rule
-- (single occurrences excluded); NEUTRAL ordering (category then label, NEVER by
-- count -- a count-2 group precedes a count-3 group of the same category by
-- label); undated occurrences still COUNT and sort last; the ProjectedNode
-- contract and canonical-source decomposition (participations/events/
-- contributions, and contribution/event node types); institution recurrence
-- EXCLUDES participations (M8.4 continuity owns them); honest empty/nonexistent;
-- determinism; fail-closed auth and merged exclusion. Fixtures rolled back.

create extension if not exists pgtap;
begin;
select plan(34);

\set reader 'd0000000-0000-4000-8000-0000000000cc'
\set p_focal  'd0000000-0000-4000-8000-000000000601'
\set p_single 'd0000000-0000-4000-8000-000000000602'
\set p_merged 'd0000000-0000-4000-8000-00000000060f'
\set o1       'd0000000-0000-4000-8000-000000000611'
\set o_focal  'd0000000-0000-4000-8000-000000000612'
\set e1 'd0000000-0000-4000-8000-000000000701'
\set e2 'd0000000-0000-4000-8000-000000000702'
\set e3 'd0000000-0000-4000-8000-000000000703'
\set oe1 'd0000000-0000-4000-8000-000000000711'
\set oe2 'd0000000-0000-4000-8000-000000000712'
\set oe3 'd0000000-0000-4000-8000-000000000713'
\set c1 'd0000000-0000-4000-8000-000000000801'
\set c2 'd0000000-0000-4000-8000-000000000802'
\set c3 'd0000000-0000-4000-8000-000000000803'
\set oc1 'd0000000-0000-4000-8000-000000000811'
\set oc2 'd0000000-0000-4000-8000-000000000812'
\set oc3 'd0000000-0000-4000-8000-000000000813'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'revelation-recurrence@example.test', 'x', now(), now(), now());

select has_function('public', 'reveal_person_recurrence', array['uuid'], 'reveal_person_recurrence(uuid) exists');
select has_function('public', 'reveal_organization_recurrence', array['uuid'], 'reveal_organization_recurrence(uuid) exists');

-- Self-contained controlled vocabulary (idempotent).
insert into public.event_kinds (key, label) values
  ('expedition','Expedition'), ('award','Award'), ('ceremony','Ceremony')
  on conflict (key) do nothing;
insert into public.contribution_kinds (key, label) values
  ('publication','Publication'), ('dataset','Dataset'), ('report','Report')
  on conflict (key) do nothing;
insert into public.contribution_capacities (key, label) values
  ('author','Author') on conflict (key) do nothing;

insert into public.organizations (id, name, short_name, source_type, verification_status) values
  (:'o1', 'Alpha Station', 'AS', 'imported_historical', 'provisional'),
  (:'o_focal', 'Focal Institute', 'FI', 'imported_historical', 'provisional');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'p_focal', 'Ana', 'Alpha', 'Ana Alpha', 'provisional', 'imported_historical'),
  (:'p_single', 'Bruno', 'Beta', 'Bruno Beta', 'provisional', 'imported_historical'),
  (:'p_merged', 'Merged', 'Person', 'Merged Person', 'merged', 'admin_entered');

-- p_focal ROLE recurrence: director x3 (one UNDATED), coordinator x2, researcher x1.
-- Neutral order proof: coordinator (count 2) must precede director (count 3) by
-- LABEL, never by count. Researcher (count 1) is excluded.
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type) values
  (:'p_focal', :'o1', 'director',    '1980-01-01', 'year', 'imported_historical'),
  (:'p_focal', :'o1', 'director',    '1990-01-01', 'year', 'imported_historical'),
  (:'p_focal', :'o1', 'coordinator', '1975-01-01', 'year', 'imported_historical'),
  (:'p_focal', :'o1', 'coordinator', '1985-01-01', 'year', 'imported_historical'),
  (:'p_focal', :'o1', 'researcher',  '2000-01-01', 'year', 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type) values
  (:'p_focal', :'o1', 'director', true, 'imported_historical');

-- p_focal EVENT recurrence: two expeditions + one award.
insert into public.events (id, event_kind, title, start_date, start_precision, source_type) values
  (:'e1', 'expedition', 'First Expedition',  '1981-01-01', 'year', 'imported_historical'),
  (:'e2', 'expedition', 'Second Expedition', '1986-01-01', 'year', 'imported_historical'),
  (:'e3', 'award',      'A Medal',           '1991-01-01', 'year', 'imported_historical');
insert into public.person_events (person_id, event_id) values
  (:'p_focal', :'e1'), (:'p_focal', :'e2'), (:'p_focal', :'e3');

-- p_focal CONTRIBUTION recurrence: two publications + one dataset.
insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type) values
  (:'c1', 'Paper One', 'publication', '1982-01-01', 'year', 'imported_historical'),
  (:'c2', 'Paper Two', 'publication', '1987-01-01', 'year', 'imported_historical'),
  (:'c3', 'A Dataset', 'dataset',     '1992-01-01', 'year', 'imported_historical');
insert into public.person_contributions (contribution_id, person_id, capacity, source_type) values
  (:'c1', :'p_focal', 'author', 'imported_historical'),
  (:'c2', :'p_focal', 'author', 'imported_historical'),
  (:'c3', :'p_focal', 'author', 'imported_historical');

-- p_single: exactly one of each -> no recurrence at all.
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type) values
  (:'p_single', :'o1', 'director', '1970-01-01', 'year', 'imported_historical');

-- o_focal INSTITUTION recurrence: two expeditions + one ceremony (events); two
-- reports + one dataset (contributions); plus director participations that must
-- NOT appear (M8.4 continuity owns per-capacity coverage).
insert into public.events (id, event_kind, title, start_date, start_precision, source_type) values
  (:'oe1', 'expedition', 'Org Expedition A', '1961-01-01', 'year', 'imported_historical'),
  (:'oe2', 'expedition', 'Org Expedition B', '1966-01-01', 'year', 'imported_historical'),
  (:'oe3', 'ceremony',   'Org Ceremony',     '1971-01-01', 'year', 'imported_historical');
insert into public.organization_events (organization_id, event_id) values
  (:'o_focal', :'oe1'), (:'o_focal', :'oe2'), (:'o_focal', :'oe3');
insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type) values
  (:'oc1', 'Report One', 'report',  '1962-01-01', 'year', 'imported_historical'),
  (:'oc2', 'Report Two', 'report',  '1967-01-01', 'year', 'imported_historical'),
  (:'oc3', 'Org Dataset', 'dataset','1972-01-01', 'year', 'imported_historical');
insert into public.organization_contributions (contribution_id, organization_id, capacity, source_type) values
  (:'oc1', :'o_focal', 'author', 'imported_historical'),
  (:'oc2', :'o_focal', 'author', 'imported_historical'),
  (:'oc3', :'o_focal', 'author', 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type) values
  (:'p_focal', :'o_focal', 'director', '1960-01-01', 'year', 'imported_historical'),
  (:'p_single', :'o_focal', 'director', '1965-01-01', 'year', 'imported_historical');

-- ---- Authorization (3-4) ----
set local role anon;
select throws_ok($$ select public.reveal_person_recurrence('d0000000-0000-4000-8000-000000000601') $$, '42501', NULL, 'anon cannot execute reveal_person_recurrence');
select throws_ok($$ select public.reveal_organization_recurrence('d0000000-0000-4000-8000-000000000612') $$, '42501', NULL, 'anon cannot execute reveal_organization_recurrence');
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- ---- Person recurrence: shape, threshold, neutral order (5-11) ----
select is(public.reveal_person_recurrence(:'p_focal')->>'person_id', :'p_focal', 'person recurrence is centred on the focal person');
select is(jsonb_array_length(public.reveal_person_recurrence(:'p_focal')->'groups'), 4, 'four phenomena recurred (director, coordinator, expedition, publication); single occurrences excluded');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->0->>'category', 'role', 'groups are ordered by category first: role groups lead');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->0->>'label', 'Coordinator', 'within a category, groups order by LABEL (Coordinator before Director) -- never by count');
select is((public.reveal_person_recurrence(:'p_focal')->'groups'->0->>'count')::int, 2, 'the first role group (Coordinator) has count 2');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->1->>'label', 'Director', 'the second role group is Director...');
select is((public.reveal_person_recurrence(:'p_focal')->'groups'->1->>'count')::int, 3, '...with count 3 -- a higher count placed AFTER a lower one proves order is never by count');

-- ---- Anchor, occurrences, undated counts and sorts last (12-15) ----
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->0->'anchor'->>'type', 'organization', 'a role group carries its institution anchor as an organization ProjectedNode');
select is(jsonb_array_length(public.reveal_person_recurrence(:'p_focal')->'groups'->1->'occurrences'), 3, 'the Director group carries all three documented occurrences (undated included)');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->1->'occurrences'->0->'temporal'->>'date_is_unknown', 'false', 'dated occurrences sort first');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->1->'occurrences'->2->'temporal'->>'date_is_unknown', 'true', 'an undated occurrence still counts and is shown last (unknown stays unknown)');

-- ---- Event + contribution groups, node types, decomposition (16-23) ----
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->2->>'category', 'event', 'the event group follows the role groups');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->2->>'label', 'Expedition', 'the event group is the Expedition kind (Award, a single occurrence, is excluded)');
select is((public.reveal_person_recurrence(:'p_focal')->'groups'->2->>'count')::int, 2, 'two documented expeditions');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->2->'occurrences'->0->'node'->>'type', 'event', 'an event occurrence projects an event ProjectedNode (contract)');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->2->'occurrences'->0->'node'->'href', 'null'::jsonb, 'an event node has no page (href null), still carries its title');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->2->'occurrences'->0->'source'->>'type', 'events', 'an event occurrence decomposes to its canonical events row');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->3->>'label', 'Publication', 'the contribution group is the Publication kind (Dataset, a single occurrence, is excluded)');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->3->'occurrences'->0->'node'->>'type', 'contribution', 'a contribution occurrence projects a contribution ProjectedNode (a doorway)');
select is(public.reveal_person_recurrence(:'p_focal')->'groups'->3->'occurrences'->0->'source'->>'type', 'contributions', 'a contribution occurrence decomposes to its canonical contributions row');

-- ---- The >= 2 rule + focal contract (24-25) ----
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_person_recurrence(:'p_focal')->'groups') g
    where (g->>'count')::int < 2
  ),
  'every revealed group has >= 2 occurrences (a single documented occurrence is never a recurrence)');
select is(public.reveal_person_recurrence(:'p_focal')->'person'->>'type', 'person', 'the focal person node carries type=person (ProjectedNode contract)');

-- ---- Honest absence, fail-closed, determinism (26-28) ----
select is(public.reveal_person_recurrence(:'p_single')->'groups', '[]'::jsonb, 'a person with only single occurrences has an empty groups array (honest absence)');
select is(public.reveal_person_recurrence(:'p_merged'), null::jsonb, 'a merged person returns null');
select is(public.reveal_person_recurrence('d0000000-0000-4000-8000-999999999999'), null::jsonb, 'a nonexistent person returns null');

-- ---- Institution recurrence, participations excluded (29-33) ----
select is(jsonb_array_length(public.reveal_organization_recurrence(:'o_focal')->'groups'), 2, 'the institution has two recurrences (Expedition events, Report contributions)');
select is(public.reveal_organization_recurrence(:'o_focal')->'groups'->0->>'label', 'Expedition', 'institution event recurrence is Expedition (Ceremony, single, excluded)');
select is(public.reveal_organization_recurrence(:'o_focal')->'groups'->1->>'label', 'Report', 'institution contribution recurrence is Report (Dataset, single, excluded)');
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_organization_recurrence(:'o_focal')->'groups') g
    where g->>'category' = 'role'
  ),
  'institution recurrence NEVER includes participation roles (M8.4 continuity owns per-capacity coverage)');
select is(public.reveal_organization_recurrence('d0000000-0000-4000-8000-999999999999'), null::jsonb, 'a nonexistent institution returns null');

reset role;
select * from finish();
rollback;
