-- pgTAP tests for Milestone M7: Knowledge Network Engine
-- (supabase/migrations/20260810090000_add_knowledge_network_engine.sql).
--
-- Run locally via: npm run supabase:test  (supabase test db). Requires
-- `supabase start` (Docker). NOT executed in the authoring environment.
--
-- Scope: organization_relationship_kinds / organization_relationships (kind +
-- directionality FK, self-relationship policy, canonical reciprocal storage,
-- duplicate prevention, blank-note rejection, temporal + provenance invariants,
-- deny-by-default access, vocabulary integrity) and the bounded one-hop network
-- read models get_person_network / get_organization_network /
-- get_contribution_network / get_event_network / get_organization_relationships
-- (authorization, deny-by-default, every projection with canonical-source
-- preservation, direct-vs-projected honesty, the strict NO-INFERENCE boundary,
-- empty/merged/nonexistent behaviour, and stable ordering). Fixtures are
-- inserted as the table owner (the privileged seed path, bypassing RLS exactly
-- as the reading-index tests do) with explicit UUIDs, and rolled back, so this
-- neither depends on nor mutates seed data or other test files. Error assertions
-- match on SQLSTATE; constraint/FK assertions additionally match PostgreSQL's
-- native message naming the specific constraint; permission-denial assertions
-- pass NULL for the message.

create extension if not exists pgtap;

begin;

select plan(69);

\set reader   'a0000000-0000-4000-8000-0000000000aa'
\set p1       'a0000000-0000-4000-8000-000000000001'
\set p2       'a0000000-0000-4000-8000-000000000002'
\set p3       'a0000000-0000-4000-8000-000000000003'
\set p_merged 'a0000000-0000-4000-8000-00000000000f'
\set p_empty  'a0000000-0000-4000-8000-00000000000e'
\set o1       'a0000000-0000-4000-8000-000000000101'
\set o2       'a0000000-0000-4000-8000-000000000102'
\set c1       'a0000000-0000-4000-8000-000000000201'
\set e1       'a0000000-0000-4000-8000-000000000301'
\set part1    'a0000000-0000-4000-8000-000000000401'
\set rel1     'a0000000-0000-4000-8000-000000000402'
\set pc1      'a0000000-0000-4000-8000-000000000403'
\set oc1      'a0000000-0000-4000-8000-000000000404'
\set pe1      'a0000000-0000-4000-8000-000000000405'
\set oe1      'a0000000-0000-4000-8000-000000000406'
\set ce1      'a0000000-0000-4000-8000-000000000407'
\set orel1    'a0000000-0000-4000-8000-000000000408'
\set part3    'a0000000-0000-4000-8000-000000000409'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'network-reader@example.test', 'x', now(), now(), now());

-- ---- Schema / vocabulary existence (1-7) ----
select has_table('public', 'organization_relationship_kinds', 'organization_relationship_kinds table exists');
select has_table('public', 'organization_relationships', 'organization_relationships table exists');
select has_function('public', 'get_person_network', array['uuid'], 'get_person_network(uuid) exists');
select has_function('public', 'get_organization_network', array['uuid'], 'get_organization_network(uuid) exists');
select has_function('public', 'get_contribution_network', array['uuid'], 'get_contribution_network(uuid) exists');
select has_function('public', 'get_event_network', array['uuid'], 'get_event_network(uuid) exists');
select has_function('public', 'get_organization_relationships', array['uuid'], 'get_organization_relationships(uuid) exists');

-- ---- Vocabulary integrity (8-9) ----
select is(
  (select is_directional from public.organization_relationship_kinds where key = 'succession'),
  true,
  'succession is a directional kind (predecessor -> successor)'
);
select is(
  (select is_directional from public.organization_relationship_kinds where key = 'affiliation'),
  false,
  'affiliation is a symmetric kind'
);

-- ---- Fixtures (as the table owner; bypasses RLS like the privileged seed path) ----
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'p1', 'Alice', 'Aardvark', 'Alice Aardvark', 'provisional', 'imported_historical'),
  (:'p2', 'Bob',   'Booker',   'Bob Booker',     'provisional', 'imported_historical'),
  (:'p3', 'Carol', 'Carver',   'Carol Carver',   'provisional', 'imported_historical'),
  (:'p_merged', 'Mel', 'Merged', 'Mel Merged',   'merged',      'admin_entered'),
  (:'p_empty',  'Eve', 'Empty',  'Eve Empty',    'provisional', 'imported_historical');

insert into public.organizations (id, name, short_name, source_type, verification_status) values
  (:'o1', 'Institute of Forest History', 'IFH', 'imported_historical', 'provisional'),
  (:'o2', 'Tropical Ecology Archive',    'TEA', 'imported_historical', 'provisional');

insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type, verification_status) values
  (:'c1', 'Long-term canopy-monitoring programme', 'long_term_monitoring', '1990-01-01', 'year', 'imported_historical', 'provisional');

insert into public.events (id, event_kind, title, start_date, start_precision, source_type) values
  (:'e1', 'fieldwork', 'Canopy census', '1990-06-01', 'month', 'imported_historical');

-- Canonical assertions that the network PROJECTS (never copies):
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, source_type) values
  (:'part1', :'p1', :'o1', 'researcher', '1990-01-01', 'year', 'imported_historical'),
  (:'part3', :'p3', :'o1', 'researcher', '1992-01-01', 'year', 'imported_historical');

insert into public.relationships (id, kind, is_directional, source_person_id, target_person_id, narrative, start_date, start_precision, source_type) values
  (:'rel1', 'mentorship', true, :'p1', :'p2', 'Alice mentored Bob.', '1991-01-01', 'year', 'imported_historical'),
  -- a mentorship to a MERGED person: must be OMITTED from p1's network
  ('a0000000-0000-4000-8000-0000000004ff', 'mentorship', true, :'p1', :'p_merged', null, '1995-01-01', 'year', 'imported_historical');

insert into public.person_contributions (id, contribution_id, person_id, capacity, source_type, verification_status) values
  (:'pc1', :'c1', :'p1', 'field_observation', 'imported_historical', 'provisional');

insert into public.organization_contributions (id, contribution_id, organization_id, capacity, source_type, verification_status) values
  (:'oc1', :'c1', :'o1', 'institutional_support', 'imported_historical', 'provisional');

insert into public.person_events (id, person_id, event_id) values (:'pe1', :'p1', :'e1');
insert into public.organization_events (id, organization_id, event_id) values (:'oe1', :'o1', :'e1');
insert into public.contribution_events (id, contribution_id, event_id) values (:'ce1', :'c1', :'e1');

-- The one NEW canonical relation: a succession IFH -> TEA (directional, 1984).
insert into public.organization_relationships (id, kind, is_directional, source_organization_id, target_organization_id, note, start_date, start_precision, source_type) values
  (:'orel1', 'succession', true, :'o1', :'o2', 'IFH succeeded TEA.', '1984-01-01', 'year', 'imported_historical');

-- ---- Constraint / integrity tests on organization_relationships (10-24) ----
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('no_such_kind', true, 'a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000102', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "organization_relationships" violates foreign key constraint "organization_relationships_kind_fkey"',
  'unknown institutional relationship kind rejected (FK)'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('affiliation', true, 'a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000102', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "organization_relationships" violates foreign key constraint "organization_relationships_kind_fkey"',
  'is_directional not matching the kind rejected (composite FK)'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000101', true, 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_no_self"',
  'self-relationship rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('affiliation', false, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', true, 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_symmetric_canonical"',
  'symmetric relationship not in canonical order rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000102', true, 'admin_entered') $$,
  '23505',
  'duplicate key value violates unique constraint "organization_relationships_unique"',
  'duplicate institutional relationship rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, note, date_is_unknown, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', '   ', true, 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_note_not_blank"',
  'blank note rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, start_date, start_precision, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', '1990-01-01', 'century', 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_start_precision_valid"',
  'invalid start_precision rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, start_date, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', '1990-01-01', 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_start_precision_matches_date"',
  'start_date without precision rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', false, 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_unknown_iff_no_start"',
  'no start and not unknown rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, is_approximate, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', true, true, 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_unknown_excludes_qualifiers"',
  'undated + approximate rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, start_date, start_precision, end_date, end_precision, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', '1990-01-01', 'year', '1985-01-01', 'year', 'admin_entered') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_end_after_start"',
  'end before start rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type, verification_status) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', true, 'admin_entered', 'not_a_status') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_verification_status_valid"',
  'invalid verification_status rejected'
);
select throws_ok(
  $$ insert into public.organization_relationships (kind, is_directional, source_organization_id, target_organization_id, date_is_unknown, source_type) values ('succession', true, 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000101', true, 'not_a_source') $$,
  '23514',
  'new row for relation "organization_relationships" violates check constraint "organization_relationships_source_type_valid"',
  'invalid source_type rejected'
);
select throws_ok(
  $$ insert into public.organization_relationship_kinds (key, label, is_directional, source_role_label, source_role_label_plural, target_role_label, target_role_label_plural) values ('bad_symmetric', 'Bad', false, 'Alpha', 'Alphas', 'Beta', 'Betas') $$,
  '23514',
  'new row for relation "organization_relationship_kinds" violates check constraint "organization_relationship_kinds_symmetric_roles_match"',
  'symmetric kind with mismatched roles rejected'
);
select throws_ok(
  $$ insert into public.organization_relationship_kinds (key, label, is_directional, source_role_label, source_role_label_plural, target_role_label, target_role_label_plural) values ('succession', 'Dup', true, 'A', 'As', 'B', 'Bs') $$,
  '23505',
  'duplicate key value violates unique constraint "organization_relationship_kinds_pkey"',
  'duplicate vocabulary key rejected'
);

-- ---- Deny-by-default (25-31) ----
set local role anon;
select throws_ok($$ select 1 from public.organization_relationships limit 1 $$, '42501', NULL, 'anon cannot read organization_relationships directly');
reset role;
set local role authenticated;
select throws_ok($$ select 1 from public.organization_relationships limit 1 $$, '42501', NULL, 'authenticated cannot read organization_relationships directly');
reset role;
set local role anon;
select throws_ok($$ select 1 from public.organization_relationship_kinds limit 1 $$, '42501', NULL, 'anon cannot read organization_relationship_kinds directly');
select throws_ok($$ select public.get_person_network('a0000000-0000-4000-8000-000000000001') $$, '42501', NULL, 'anon cannot execute get_person_network');
select throws_ok($$ select public.get_organization_network('a0000000-0000-4000-8000-000000000101') $$, '42501', NULL, 'anon cannot execute get_organization_network');
select throws_ok($$ select public.get_contribution_network('a0000000-0000-4000-8000-000000000201') $$, '42501', NULL, 'anon cannot execute get_contribution_network');
reset role;
set local role authenticated;
select throws_ok(
  $$ select public.get_person_network('a0000000-0000-4000-8000-000000000001') $$,
  'get_person_network: authentication required',
  'get_person_network requires auth.uid()'
);
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- Person network for Alice (p1) (32-44)
select is(public.get_person_network(:'p1')->'focal'->>'id', :'p1', 'person network focal id is the person');
select is(
  jsonb_array_length(public.get_person_network(:'p1')->'connections'),
  4,
  'Alice has four documented connections (participation, relationship, contribution, event); merged counterpart omitted'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->'node'->>'id' = :'o1' and e->>'family' = 'participation'),
  'Person<->Institution PROJECTED from participation'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->'node'->>'id' = :'p2' and e->>'family' = 'relationship'),
  'Person<->Person PROJECTED from relationship'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->'node'->>'id' = :'p_merged'),
  'merged counterpart omitted from the network'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->'node'->>'id' = :'c1' and e->>'family' = 'contribution_attribution'),
  'Person<->Contribution PROJECTED from person_contributions'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->'node'->>'id' = :'e1' and e->>'family' = 'event_association'),
  'Person<->Event PROJECTED from person_events'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->'node'->>'id' = :'p3'),
  'NO edge to a person who merely shares an institution (no inference)'
);
select is(
  (select e->'source'->>'type' from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->>'family' = 'participation'),
  'participations',
  'projected connection preserves its canonical source table'
);
select is(
  (select e->>'id' from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->>'family' = 'participation'),
  'participation:' || :'part1',
  'projected connection id is deterministic (source:rowId), not a new assertion'
);
select is(
  (select e->'temporal'->>'start_date' from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->>'family' = 'participation'),
  '1990-01-01',
  'participation projection preserves its temporal payload'
);
select ok(
  (select jsonb_typeof(e->'temporal') = 'null' from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->>'family' = 'contribution_attribution'),
  'contribution attribution is honestly undated (temporal is JSON null), never invented'
);
select is(
  public.get_person_network(:'p1')->'connections'->0->>'family',
  'participation',
  'connections are deterministically ordered (participation family first for a person)'
);

-- Overlapping participation does NOT create a person-person edge (45-49)
select is(
  jsonb_array_length(public.get_person_network(:'p3')->'connections'),
  1,
  'Carol (who shares an institution with Alice) has only her own participation -- no inferred bond'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.get_person_network(:'p3')->'connections') e where e->'node'->>'id' = :'p1'),
  'shared institution never becomes a person-person connection'
);
select is(public.get_person_network(:'p_empty')->'connections', '[]'::jsonb, 'a person with no connections gets an empty array, not null');
select is(public.get_person_network(:'p_merged'), null::jsonb, 'merged focal person returns null');
select is(public.get_person_network('a0000000-0000-4000-8000-999999999999'), null::jsonb, 'nonexistent focal person returns null');

-- Institution network for IFH (o1) (50-58)
select is(public.get_organization_network(:'o1')->'focal'->>'id', :'o1', 'institution network focal id is the institution');
select ok(
  exists(select 1 from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->'node'->>'id' = :'o2' and e->>'family' = 'institutional_relationship'),
  'Institution<->Institution PROJECTED from organization_relationships'
);
select is(
  (select e->>'direction' from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->>'family' = 'institutional_relationship'),
  'outgoing',
  'succession reads as outgoing from the predecessor'
);
select is(
  (select e->'perspective'->>'counterpart_role_label' from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->>'family' = 'institutional_relationship'),
  'Successor',
  'from the predecessor page, the counterpart is the Successor'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->'node'->>'id' = :'p1' and e->>'family' = 'participation' and e->>'direction' = 'incoming'),
  'Institution<->Person PROJECTED from participation (incoming to the institution)'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->'node'->>'id' = :'p3'),
  'both members appear on the institution network'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->'node'->>'id' = :'c1' and e->>'family' = 'contribution_attribution'),
  'Institution<->Contribution PROJECTED from organization_contributions'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->'node'->>'id' = :'e1' and e->>'family' = 'event_association'),
  'Institution<->Event PROJECTED from organization_events'
);
select is(
  (select e->'source'->>'type' from jsonb_array_elements(public.get_organization_network(:'o1')->'connections') e where e->>'family' = 'institutional_relationship'),
  'organization_relationships',
  'institutional relationship projection preserves its canonical source table'
);

-- get_organization_relationships perspective projection (59-62)
select is(jsonb_array_length(public.get_organization_relationships(:'o1')->'relationships'), 1, 'IFH has one institutional relationship');
select is((public.get_organization_relationships(:'o1')->'relationships'->0->'counterpart'->>'id'), :'o2', 'counterpart is TEA');
select is((public.get_organization_relationships(:'o1')->'relationships'->0->'perspective'->>'counterpart_role_label'), 'Successor', 'from IFH the counterpart is the Successor');
select is((public.get_organization_relationships(:'o2')->'relationships'->0->'perspective'->>'counterpart_role_label'), 'Predecessor', 'INVERSE: from TEA the counterpart is the Predecessor');

-- Contribution network for c1 (63-66)
select is(public.get_contribution_network(:'c1')->'focal'->>'id', :'c1', 'contribution network focal id is the contribution');
select ok(
  exists(select 1 from jsonb_array_elements(public.get_contribution_network(:'c1')->'connections') e where e->'node'->>'id' = :'p1' and e->>'family' = 'contribution_attribution' and e->>'direction' = 'incoming'),
  'Contribution<->Person PROJECTED from person_contributions (incoming to the contribution)'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_contribution_network(:'c1')->'connections') e where e->'node'->>'id' = :'o1' and e->>'family' = 'contribution_attribution'),
  'Contribution<->Institution PROJECTED from organization_contributions'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.get_contribution_network(:'c1')->'connections') e where e->'node'->>'id' = :'e1' and e->>'family' = 'event_association'),
  'Contribution<->Event PROJECTED from contribution_events'
);

-- Event network for e1 (67-68)
select is(jsonb_array_length(public.get_event_network(:'e1')->'connections'), 3, 'event network has the person, institution, and contribution associated with it');
select ok(
  exists(select 1 from jsonb_array_elements(public.get_event_network(:'e1')->'connections') e where e->'node'->>'id' = :'p1'),
  'event network includes the associated person'
);

-- No copied canonical assertion: the projection points back to the canonical row (69)
select is(
  (select e->'source'->>'id' from jsonb_array_elements(public.get_person_network(:'p1')->'connections') e where e->>'family' = 'relationship'),
  :'rel1',
  'the relationship projection cites the canonical relationships row -- never a copied edge'
);

reset role;

select * from finish();

rollback;
