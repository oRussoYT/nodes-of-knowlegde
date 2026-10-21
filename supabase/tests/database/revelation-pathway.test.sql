-- pgTAP tests for Milestone M8.6: Revelation Engine -- bounded pathway (C6)
-- (supabase/migrations/20260816090000_add_pathway_revelation.sql).
--
-- Run locally via: npm run supabase:test (requires `supabase start`). NOT run in
-- the authoring environment (it was, however, developed and validated against a
-- disposable Postgres 16 with the full schema before delivery).
--
-- Scope: reveal_person_pathway(uuid, uuid) -- the bounded, cycle-safe,
-- heterogeneous, undirected traversal that reveals the shortest documented chain
-- of >= 2 explicit-assertion steps connecting a focal person to a selected target
-- entity. Asserts: authorization; the >= 2-step rule (a direct one-hop link is a
-- connection, not a pathway); heterogeneous composition across entity types;
-- correct traversal-ordered steps decomposable to canonical rows with
-- ProjectedNode endpoints; the small hop bound (4) enforced; honest
-- absence (unresolved target; disconnected; beyond the bound); merged exclusion;
-- fail-closed auth; determinism. Fixtures rolled back.

create extension if not exists pgtap;
begin;
select plan(26);

\set reader 'd0000000-0000-4000-8000-0000000000dd'
\set A 'a0000000-0000-4000-8000-000000000001'
\set B 'a0000000-0000-4000-8000-000000000002'
\set C 'a0000000-0000-4000-8000-000000000003'
\set D 'a0000000-0000-4000-8000-000000000004'
\set M 'a0000000-0000-4000-8000-00000000000f'
\set X 'b0000000-0000-4000-8000-000000000001'
\set K 'c0000000-0000-4000-8000-000000000001'
\set E 'e0000000-0000-4000-8000-000000000001'
-- a line of six people for the hop-bound test: G0-G1-G2-G3-G4-G5
\set G0 'f0000000-0000-4000-8000-000000000000'
\set G1 'f0000000-0000-4000-8000-000000000001'
\set G2 'f0000000-0000-4000-8000-000000000002'
\set G3 'f0000000-0000-4000-8000-000000000003'
\set G4 'f0000000-0000-4000-8000-000000000004'
\set G5 'f0000000-0000-4000-8000-000000000005'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'revelation-pathway@example.test', 'x', now(), now(), now());

select has_function('public', 'reveal_person_pathway', array['uuid', 'uuid'], 'reveal_person_pathway(uuid, uuid) exists');

-- Self-contained vocabulary.
insert into public.relationship_kinds (key, label, is_directional, source_role_label, source_role_label_plural, target_role_label, target_role_label_plural, description, sort_order)
values ('collaboration', 'Collaboration', false, 'Collaborator', 'Collaborators', 'Collaborator', 'Collaborators', 'x', 500) on conflict do nothing;
insert into public.contribution_capacities (key, label) values ('author', 'Author') on conflict (key) do nothing;
insert into public.event_kinds (key, label) values ('expedition', 'Expedition') on conflict (key) do nothing;
insert into public.contribution_kinds (key, label) values ('publication', 'Publication') on conflict (key) do nothing;

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'A', 'A', 'Alpha', 'A Alpha', 'provisional', 'imported_historical'),
  (:'B', 'B', 'Beta',  'B Beta',  'provisional', 'imported_historical'),
  (:'C', 'C', 'Gamma', 'C Gamma', 'provisional', 'imported_historical'),
  (:'D', 'D', 'Delta', 'D Delta', 'provisional', 'imported_historical'),
  (:'M', 'M', 'Merged','M Merged','merged',       'admin_entered'),
  (:'G0','G','Zero','G Zero','provisional','imported_historical'),
  (:'G1','G','One','G One','provisional','imported_historical'),
  (:'G2','G','Two','G Two','provisional','imported_historical'),
  (:'G3','G','Three','G Three','provisional','imported_historical'),
  (:'G4','G','Four','G Four','provisional','imported_historical'),
  (:'G5','G','Five','G Five','provisional','imported_historical');
insert into public.organizations (id, name, short_name, source_type, verification_status) values
  (:'X', 'Org Xavier', 'OX', 'imported_historical', 'provisional');
insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type) values
  (:'K', 'Contribution Kappa', 'publication', '1990-01-01', 'year', 'imported_historical');
insert into public.events (id, event_kind, title, start_date, start_precision, source_type) values
  (:'E', 'expedition', 'Event Epsilon', '1991-01-01', 'year', 'imported_historical');

-- Heterogeneous edges: A-X, B-X (participations); B-C (relationship); C-K
-- (contribution attribution); C-E (event association). A merged person M-C
-- relationship must be excluded. D is disconnected.
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type) values
  (:'A', :'X', 'researcher', '1980-01-01', 'year', 'imported_historical'),
  -- A SECOND documented participation of A at X (a PARALLEL edge for the same node
  -- pair A->X): the A->X hop now has two competing edges of equal depth, so this
  -- fixture exercises the M8.7 deterministic tie-break (min canonical source id).
  (:'A', :'X', 'researcher', '1979-01-01', 'year', 'imported_historical'),
  (:'B', :'X', 'researcher', '1982-01-01', 'year', 'imported_historical');
-- Capture the min A-X participation source id NOW, while still running as the
-- setup/owner role. The `authenticated` reader role has NO direct SELECT on
-- participations -- that deny-by-default boundary is the whole point of the
-- SECURITY DEFINER RPC -- so the tie-break assertion below must not read the
-- table itself. \gset binds the expected value as a client-side literal; the
-- assertion then compares the RPC's decomposed source id to that literal, never
-- touching participations as `authenticated`.
select min(p.id::text) as expected_min_ax
  from public.participations p
  where p.person_id = :'A' and p.organization_id = :'X' \gset
-- symmetric relationships are stored canonically (source < target); C < M here.
insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, source_type) values
  ('collaboration', false, :'B', :'C', '1985-01-01', 'year', 'imported_historical'),
  ('collaboration', false, :'C', :'M', '1985-01-01', 'year', 'imported_historical');
insert into public.person_contributions (contribution_id, person_id, capacity, source_type) values
  (:'K', :'C', 'author', 'imported_historical');
insert into public.person_events (person_id, event_id) values (:'C', :'E');
-- the six-person line (5 relationship steps end to end)
insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, source_type) values
  ('collaboration', false, :'G0', :'G1', '1970-01-01', 'year', 'imported_historical'),
  ('collaboration', false, :'G1', :'G2', '1971-01-01', 'year', 'imported_historical'),
  ('collaboration', false, :'G2', :'G3', '1972-01-01', 'year', 'imported_historical'),
  ('collaboration', false, :'G3', :'G4', '1973-01-01', 'year', 'imported_historical'),
  ('collaboration', false, :'G4', :'G5', '1974-01-01', 'year', 'imported_historical');

-- ---- Authorization (2) ----
set local role anon;
select throws_ok($$ select public.reveal_person_pathway('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003') $$, '42501', NULL, 'anon cannot execute reveal_person_pathway');
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- ---- A -> C: heterogeneous 3-step chain (3-13) ----
select is(public.reveal_person_pathway(:'A', :'C')->>'from_id', :'A', 'pathway is centred on the focal person');
select is((public.reveal_person_pathway(:'A', :'C')->>'found')::boolean, true, 'a documented chain A..C is found');
select is((public.reveal_person_pathway(:'A', :'C')->>'step_count')::int, 3, 'the chain is three steps (A-X participation, X-B participation, B-C relationship)');
select is(jsonb_array_length(public.reveal_person_pathway(:'A', :'C')->'steps'), 3, 'three step objects are returned');
select is(public.reveal_person_pathway(:'A', :'C')->'steps'->0->'from'->>'id', :'A', 'step 1 begins at the focal person (traversal order)');
select is(public.reveal_person_pathway(:'A', :'C')->'steps'->0->>'category', 'participation', 'step 1 is a participation (heterogeneous edge)');
select is(public.reveal_person_pathway(:'A', :'C')->'steps'->0->'to'->>'type', 'organization', 'step 1 reaches an organization intermediary (ProjectedNode contract)');
select is(public.reveal_person_pathway(:'A', :'C')->'steps'->2->>'category', 'relationship', 'the last step is a person-person relationship');
select is(public.reveal_person_pathway(:'A', :'C')->'steps'->2->'to'->>'id', :'C', 'the chain ends at the selected target');
select is(public.reveal_person_pathway(:'A', :'C')->'steps'->0->'source'->>'type', 'participations', 'a step decomposes to its canonical participations row');
select is(public.reveal_person_pathway(:'A', :'C')->'from'->>'type', 'person', 'the focal node carries type=person (ProjectedNode contract)');

-- ---- Heterogeneous target types + the >= 2 rule (14-17) ----
select is((public.reveal_person_pathway(:'A', :'K')->>'step_count')::int, 4, 'a chain to a CONTRIBUTION target is four steps (A-X-B-C-K)');
select is(public.reveal_person_pathway(:'A', :'K')->'to'->>'type', 'contribution', 'the resolved target is a contribution');
select is((public.reveal_person_pathway(:'A', :'X')->>'found')::boolean, false, 'a DIRECT one-hop link (A-X participation) is NOT a pathway (>= 2-step rule)');
select is(public.reveal_person_pathway(:'A', :'X')->'to'->>'type', 'organization', 'the direct target still resolves (as an organization), it is just not a pathway');

-- ---- Merged exclusion (18) ----
select is((public.reveal_person_pathway(:'A', :'M')->>'target_resolved')::boolean, false, 'a merged person is not a resolvable target (its page 404s)');

-- ---- The small hop bound (19-20) ----
select is((public.reveal_person_pathway(:'G0', :'G4')->>'step_count')::int, 4, 'a four-step line is within the hop bound and found');
select is((public.reveal_person_pathway(:'G0', :'G5')->>'found')::boolean, false, 'a five-step line exceeds the hop bound of four -> honest absence, never "not connected"');

-- ---- Honest absence + fail-closed + determinism (21-24) ----
select is((public.reveal_person_pathway(:'A', :'D')->>'found')::boolean, false, 'a disconnected target yields no chain (honest absence)');
select is(public.reveal_person_pathway(:'A', '99999999-9999-4999-8999-999999999999')->>'target_resolved', 'false', 'a nonexistent target is unresolved');
select is(public.reveal_person_pathway(:'M', :'C'), null::jsonb, 'a merged FOCAL person returns null');
select is(public.reveal_person_pathway(:'A', :'C'), public.reveal_person_pathway(:'A', :'C'), 'the pathway is deterministic');

-- ---- M8.7 closure: deterministic tie-break across PARALLEL edges (25-26) ----
-- Two documented A-X participations make the A->X hop a pair of competing edges of
-- equal depth. Pre-M8.7 the winner (and thus the exact canonical row the step
-- decomposed to) was chosen by physical/plan order; post-M8.7 the chain is chosen
-- by (depth, node sequence, then each edge's source id), so it is fully
-- determined -- it decomposes to the min-source-id participation -- and the
-- parallel edge never changes the minimal chain's length.
select is(
  public.reveal_person_pathway(:'A', :'C')->'steps'->0->'source'->>'id',
  :'expected_min_ax',
  'a parallel A-X edge resolves deterministically to the min-source-id participation (M8.7 tie-break)');
select is(
  (public.reveal_person_pathway(:'A', :'C')->>'step_count')::int,
  3,
  'a parallel A-X edge does not change the minimal chain length (still the 3-step A-X-B-C)');

reset role;
select * from finish();
rollback;
