-- pgTAP tests for Milestone M8.1: Revelation Engine -- co-presence
-- (supabase/migrations/20260811090000_add_revelation_engine.sql).
--
-- Run locally via: npm run supabase:test  (supabase test db). Requires
-- `supabase start` (Docker). NOT executed in the authoring environment.
--
-- Scope: public.reveal_person_cohorts(uuid) -- the deterministic composition of
-- participation Assertions into a person's DOCUMENTED COHORTS (other people at
-- the same institution during OVERLAPPING documented periods). Asserts:
-- authorization + deny-by-default; that co-presence requires BOTH a shared
-- institution AND a temporal overlap (a shared institution alone, or a
-- non-overlapping or undated participation, is NOT a cohort member -- the exact
-- boundary that keeps revelation from becoming inference); merged focal/members
-- handled; canonical-source preservation (every member decomposes to its
-- participations row); neutral ordering (organization name, then member
-- display_name); the focal anchor is carried; honest empty/merged/nonexistent
-- behaviour; and determinism. Fixtures are inserted as the table owner (the
-- privileged seed path, bypassing RLS exactly as the M7 tests do) with explicit
-- UUIDs, and rolled back, so this neither depends on nor mutates seed data or
-- other test files.

create extension if not exists pgtap;

begin;

select plan(30);

\set reader   'b0000000-0000-4000-8000-0000000000aa'
\set p1       'b0000000-0000-4000-8000-000000000001'
\set p3       'b0000000-0000-4000-8000-000000000003'
\set p6       'b0000000-0000-4000-8000-000000000006'
\set p4       'b0000000-0000-4000-8000-000000000004'
\set p5       'b0000000-0000-4000-8000-000000000005'
\set p_merged 'b0000000-0000-4000-8000-00000000000f'
\set p2       'b0000000-0000-4000-8000-000000000002'
\set p7       'b0000000-0000-4000-8000-000000000007'
\set p_none   'b0000000-0000-4000-8000-00000000000d'
\set p_empty  'b0000000-0000-4000-8000-00000000000e'
\set o0       'b0000000-0000-4000-8000-000000000100'
\set o1       'b0000000-0000-4000-8000-000000000101'
\set o2       'b0000000-0000-4000-8000-000000000102'
\set o3       'b0000000-0000-4000-8000-000000000103'
\set pf1      'b0000000-0000-4000-8000-000000000201'
\set pf0      'b0000000-0000-4000-8000-000000000200'
\set m_cara   'b0000000-0000-4000-8000-000000000203'
\set m_ada    'b0000000-0000-4000-8000-000000000206'
\set x_dan    'b0000000-0000-4000-8000-000000000204'
\set x_uma    'b0000000-0000-4000-8000-000000000205'
\set x_merged 'b0000000-0000-4000-8000-00000000020f'
\set x_bea    'b0000000-0000-4000-8000-000000000202'
\set m_zed    'b0000000-0000-4000-8000-000000000207'
\set pn       'b0000000-0000-4000-8000-00000000020d'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'revelation-reader@example.test', 'x', now(), now(), now());

-- ---- Existence (1) ----
select has_function('public', 'reveal_person_cohorts', array['uuid'], 'reveal_person_cohorts(uuid) exists');

-- ---- Fixtures (as the table owner; bypasses RLS like the privileged seed path) ----
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'p1',       'Focal', 'Faye',    'Focal Faye',   'provisional', 'imported_historical'),
  (:'p3',       'Cara',  'Stone',   'Cara Stone',   'provisional', 'imported_historical'),
  (:'p6',       'Ada',   'Overlap', 'Ada Overlap',  'provisional', 'imported_historical'),
  (:'p4',       'Dan',   'Early',   'Dan Early',    'provisional', 'imported_historical'),
  (:'p5',       'Uma',   'Undated', 'Uma Undated',  'provisional', 'imported_historical'),
  (:'p_merged', 'Mel',   'Merged',  'Mel Merged',   'merged',      'admin_entered'),
  (:'p2',       'Bea',   'Bright',  'Bea Bright',   'provisional', 'imported_historical'),
  (:'p7',       'Zed',   'Member',  'Zed Member',   'provisional', 'imported_historical'),
  (:'p_none',   'Nora',  'None',    'Nora None',    'provisional', 'imported_historical'),
  (:'p_empty',  'Eve',   'Empty',   'Eve Empty',    'provisional', 'imported_historical');

insert into public.organizations (id, name, short_name, source_type, verification_status) values
  (:'o0', 'Aardvark Institute', 'AI',  'imported_historical', 'provisional'),
  (:'o1', 'Alpha Institute',    'ALP', 'imported_historical', 'provisional'),
  (:'o2', 'Beta Archive',       'BA',  'imported_historical', 'provisional'),
  (:'o3', 'Gamma Station',      'GS',  'imported_historical', 'provisional');

-- Focal person's dated participations (the anchors).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'pf1', :'p1', :'o1', 'researcher', '1990-01-01', 'year', true, 'imported_historical'),
  (:'pf0', :'p1', :'o0', 'researcher', '1991-01-01', 'year', true, 'imported_historical');

-- Members whose documented periods OVERLAP the focal person's, at a shared org.
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'m_cara', :'p3', :'o1', 'researcher',      '1992-01-01', 'year', true, 'imported_historical'),
  (:'m_ada',  :'p6', :'o1', 'field_assistant', '1990-01-01', 'year', true, 'imported_historical'),
  (:'m_zed',  :'p7', :'o0', 'researcher',      '1992-01-01', 'year', true, 'imported_historical');

-- NON-members: a NON-overlapping period at the shared org (ended before focal began).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'x_dan', :'p4', :'o1', 'researcher', '1980-01-01', 'year', '1985-01-01', 'year', 'imported_historical');

-- NON-member: an UNDATED participation at the shared org (cannot establish temporal co-presence).
insert into public.participations (id, person_id, organization_id, capacity, date_is_unknown, source_type) values
  (:'x_uma', :'p5', :'o1', 'researcher', true, 'imported_historical');

-- NON-member: a MERGED person, overlapping, at the shared org (omitted like M7).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'x_merged', :'p_merged', :'o1', 'researcher', '1991-01-01', 'year', true, 'imported_historical');

-- NON-member: a person at a DIFFERENT institution (no shared institution).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'x_bea', :'p2', :'o2', 'researcher', '1990-01-01', 'year', true, 'imported_historical');

-- A person who is the sole documented participant at their institution -> empty cohort.
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'pn', :'p_none', :'o3', 'researcher', '1990-01-01', 'year', true, 'imported_historical');

-- ---- Deny-by-default / authorization (2-3) ----
set local role anon;
select throws_ok($$ select public.reveal_person_cohorts('b0000000-0000-4000-8000-000000000001') $$, '42501', NULL, 'anon cannot execute reveal_person_cohorts');
reset role;
set local role authenticated;
select throws_ok(
  $$ select public.reveal_person_cohorts('b0000000-0000-4000-8000-000000000001') $$,
  'reveal_person_cohorts: authentication required',
  'reveal_person_cohorts requires auth.uid()'
);
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- Focal + cohort shape (4-8)
select is(public.reveal_person_cohorts(:'p1')->>'person_id', :'p1', 'document is centred on the focal person');
select is(jsonb_array_length(public.reveal_person_cohorts(:'p1')->'cohorts'), 2, 'Faye has two documented cohorts (one per institution with overlapping members)');
select is(public.reveal_person_cohorts(:'p1')->'cohorts'->0->'organization'->>'id', :'o0', 'cohorts are ordered by institution name (Aardvark Institute first)');
select is(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'organization'->>'id', :'o1', 'second cohort is Alpha Institute');
select is(jsonb_array_length(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members'), 2, 'the Alpha Institute cohort has two overlapping members');

-- ProjectedNode contract (regression guard for the SQL<->parser node shape): the
-- projected organization and member nodes MUST carry the `type` discriminator and
-- the canonical `label`/`secondary_label` keys the reader layer parses -- the exact
-- shape M7 emits. Without this the parser drops every node and the lens reads empty.
select is(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'organization'->>'type', 'organization', 'the cohort organization node carries type=organization (ProjectedNode contract)');
select is(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'organization'->>'label', 'Alpha Institute', 'the organization node carries its name under the canonical label key (not name/short_name)');
select is(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members'->0->'person'->>'type', 'person', 'each cohort member node carries type=person (ProjectedNode contract)');

-- The overlap boundary: shared institution + overlap = member; anything less = NOT a member (9-14)
select ok(
  exists(select 1 from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p3'),
  'an overlapping co-participant IS a documented cohort member'
);
select ok(
  exists(select 1 from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p6'),
  'a second overlapping co-participant is a member'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p4'),
  'a co-participant whose period does NOT overlap is NOT a member (overlap is required -- no inference from shared institution alone)'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p5'),
  'an UNDATED co-participant is NOT a member (undated cannot establish temporal co-presence)'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p_merged'),
  'a MERGED co-participant is omitted'
);
select ok(
  not exists(select 1 from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts') co where co->'organization'->>'id' = :'o2'),
  'a person at a DIFFERENT institution never creates a cohort (no shared institution, no co-presence)'
);

-- Decomposition: every member points back at its canonical participations row (15-17)
select is(
  (select m->'source'->>'type' from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p3'),
  'participations',
  'a cohort member decomposes to its canonical participations Assertion'
);
select is(
  (select m->'source'->>'id' from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p3'),
  :'m_cara',
  'the member cites the exact participation row that establishes the overlap'
);
select is(
  (select m->'temporal'->>'start_date' from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p3'),
  '1992-01-01',
  'the member preserves its own participation temporal payload (shown with its own period, not a fabricated overlap window)'
);

-- Capacity resolved; neutral member ordering; focal anchor carried (18-21)
select is(
  (select m->'capacity'->>'label' from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members') m where m->'person'->>'id' = :'p3'),
  'Researcher',
  'the member capacity is resolved from the participation_capacities vocabulary'
);
select is(
  public.reveal_person_cohorts(:'p1')->'cohorts'->1->'members'->0->'person'->>'label',
  'Ada Overlap',
  'members are ordered by display_name (neutral), never by any metric'
);
select is(
  public.reveal_person_cohorts(:'p1')->'cohorts'->1->'focal_participations'->0->>'id',
  :'pf1',
  'the cohort carries the focal person''s own anchoring participation (both sides of the overlap are decomposable)'
);
select is(
  public.reveal_person_cohorts(:'p1')->'cohorts'->1->'focal_participations'->0->'temporal'->>'start_date',
  '1990-01-01',
  'the focal anchor preserves its temporal payload'
);

-- No inference: every revealed member is justified ONLY by a participation (22)
select ok(
  not exists(
    select 1
    from jsonb_array_elements(public.reveal_person_cohorts(:'p1')->'cohorts') co,
         jsonb_array_elements(co->'members') m
    where m->'source'->>'type' <> 'participations'
  ),
  'every cohort member is justified by a participations Assertion -- co-presence is never promoted to a relationship or any other family'
);

-- Honest absence / edge behaviour (23-26)
select is(public.reveal_person_cohorts(:'p_none')->'cohorts', '[]'::jsonb, 'a sole documented participant gets an empty cohorts array (honest absence), not null');
select is(public.reveal_person_cohorts(:'p_empty')->'cohorts', '[]'::jsonb, 'a person with no participations gets an empty cohorts array, not null');
select is(public.reveal_person_cohorts(:'p_merged'), null::jsonb, 'a merged focal person returns null');
select is(public.reveal_person_cohorts('b0000000-0000-4000-8000-999999999999'), null::jsonb, 'a nonexistent focal person returns null');

-- Determinism (27)
select is(
  public.reveal_person_cohorts(:'p1'),
  public.reveal_person_cohorts(:'p1'),
  'the revelation is deterministic: the same record yields the same result'
);

reset role;

select * from finish();

rollback;
