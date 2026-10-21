-- pgTAP tests for Milestone M8.2: Revelation Engine -- institution-surface
-- co-presence (supabase/migrations/20260812090000_add_organization_generations_revelation.sql).
--
-- Run locally via: npm run supabase:test  (supabase test db). Requires
-- `supabase start` (Docker). NOT executed in the authoring environment.
--
-- Scope: public.reveal_organization_generations(uuid) -- the deterministic
-- composition of participation Assertions into an institution's DOCUMENTED
-- CO-PRESENCE (which participants the record places there at the same time as
-- which others). Asserts: authorization + deny-by-default; that co-presence
-- requires BOTH the shared institution AND a temporal overlap (a shared
-- institution alone, a non-overlapping period, or an undated participation is
-- NOT co-presence -- the exact boundary that keeps revelation from becoming
-- inference); merged participants excluded; different-institution excluded;
-- canonical-source preservation; each anchor carrying ALL of their own
-- participations here; neutral ordering (participant display_name); the exact
-- ProjectedNode projection shape the parser requires; honest empty/nonexistent
-- behaviour; and determinism. Fixtures inserted as the table owner (privileged
-- seed path, bypassing RLS as the M7/M8.1 tests do), with explicit UUIDs, and
-- rolled back.

create extension if not exists pgtap;

begin;

select plan(27);

\set reader   'c0000000-0000-4000-8000-0000000000aa'
\set p_ann    'c0000000-0000-4000-8000-000000000001'
\set p_bob    'c0000000-0000-4000-8000-000000000002'
\set p_cara   'c0000000-0000-4000-8000-000000000003'
\set p_dee    'c0000000-0000-4000-8000-000000000006'
\set p_uma    'c0000000-0000-4000-8000-000000000004'
\set p_mel    'c0000000-0000-4000-8000-00000000000f'
\set p_zed    'c0000000-0000-4000-8000-000000000005'
\set p_solo   'c0000000-0000-4000-8000-000000000007'
\set o1       'c0000000-0000-4000-8000-000000000101'
\set o2       'c0000000-0000-4000-8000-000000000102'
\set o3       'c0000000-0000-4000-8000-000000000103'
\set o4       'c0000000-0000-4000-8000-000000000104'
\set part_ann 'c0000000-0000-4000-8000-000000000201'
\set part_bob 'c0000000-0000-4000-8000-000000000202'
\set part_dee1 'c0000000-0000-4000-8000-000000000203'
\set part_dee2 'c0000000-0000-4000-8000-000000000204'
\set part_cara 'c0000000-0000-4000-8000-000000000205'
\set part_uma 'c0000000-0000-4000-8000-000000000206'
\set part_mel 'c0000000-0000-4000-8000-00000000020f'
\set part_zed 'c0000000-0000-4000-8000-000000000207'
\set part_solo 'c0000000-0000-4000-8000-000000000208'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'revelation-org-reader@example.test', 'x', now(), now(), now());

-- ---- Existence (1) ----
select has_function('public', 'reveal_organization_generations', array['uuid'], 'reveal_organization_generations(uuid) exists');

-- ---- Fixtures (as the table owner; bypasses RLS like the privileged seed path) ----
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'p_ann',  'Ann',  'Anchor',     'Ann Anchor',      'provisional', 'imported_historical'),
  (:'p_bob',  'Bob',  'Overlap',    'Bob Overlap',     'provisional', 'imported_historical'),
  (:'p_cara', 'Cara', 'NonOverlap', 'Cara NonOverlap', 'provisional', 'imported_historical'),
  (:'p_dee',  'Dee',  'Overlap',    'Dee Overlap',     'provisional', 'imported_historical'),
  (:'p_uma',  'Uma',  'Undated',    'Uma Undated',     'provisional', 'imported_historical'),
  (:'p_mel',  'Mel',  'Merged',     'Mel Merged',      'merged',      'admin_entered'),
  (:'p_zed',  'Zed',  'OtherOrg',   'Zed OtherOrg',    'provisional', 'imported_historical'),
  (:'p_solo', 'Solo', 'Sole',       'Solo Sole',       'provisional', 'imported_historical');

insert into public.organizations (id, name, short_name, source_type, verification_status) values
  (:'o1', 'Alpha Institute', 'ALP', 'imported_historical', 'provisional'),
  (:'o2', 'Beta Archive',    'BA',  'imported_historical', 'provisional'),
  (:'o3', 'Gamma Station',   'GS',  'imported_historical', 'provisional'),
  (:'o4', 'Delta Depot',     'DD',  'imported_historical', 'provisional');

-- Ongoing (open-ended) overlapping participants at the focal institution o1.
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'part_ann', :'p_ann', :'o1', 'researcher',      '1990-01-01', 'year', true, 'imported_historical'),
  (:'part_bob', :'p_bob', :'o1', 'field_assistant', '1992-01-01', 'year', true, 'imported_historical');

-- Dee has TWO documented participations at o1 (both must be carried on the anchor).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'part_dee1', :'p_dee', :'o1', 'researcher', '1991-01-01', 'year', '1996-01-01', 'year', 'imported_historical'),
  (:'part_dee2', :'p_dee', :'o1', 'researcher', '2000-01-01', 'year', '2001-01-01', 'year', 'imported_historical');

-- NON-member: a CLOSED period at o1 that ends before the others begin (no overlap).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'part_cara', :'p_cara', :'o1', 'researcher', '1980-01-01', 'year', '1985-01-01', 'year', 'imported_historical');

-- NON-member: an UNDATED participation at o1 (cannot establish temporal co-presence).
insert into public.participations (id, person_id, organization_id, capacity, date_is_unknown, source_type) values
  (:'part_uma', :'p_uma', :'o1', 'researcher', true, 'imported_historical');

-- NON-member: a MERGED person, overlapping, at o1 (omitted like M7/M8.1).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'part_mel', :'p_mel', :'o1', 'researcher', '1991-01-01', 'year', true, 'imported_historical');

-- NON-member: a person at a DIFFERENT institution (o2).
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'part_zed', :'p_zed', :'o2', 'researcher', '1990-01-01', 'year', true, 'imported_historical');

-- A sole documented participant at o3 -> empty co-presence.
insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'part_solo', :'p_solo', :'o3', 'researcher', '1990-01-01', 'year', true, 'imported_historical');

-- ---- Deny-by-default / authorization (2-3) ----
set local role anon;
select throws_ok($$ select public.reveal_organization_generations('c0000000-0000-4000-8000-000000000101') $$, '42501', NULL, 'anon cannot execute reveal_organization_generations');
reset role;
set local role authenticated;
select throws_ok(
  $$ select public.reveal_organization_generations('c0000000-0000-4000-8000-000000000101') $$,
  'reveal_organization_generations: authentication required',
  'reveal_organization_generations requires auth.uid()'
);
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- Focal + anchor shape and neutral ordering (4-9)
select is(public.reveal_organization_generations(:'o1')->>'organization_id', :'o1', 'document is centred on the focal institution');
select is(jsonb_array_length(public.reveal_organization_generations(:'o1')->'anchors'), 3, 'three participants have documented co-presence (Ann, Bob, Dee)');
select is(public.reveal_organization_generations(:'o1')->'anchors'->0->'person'->>'label', 'Ann Anchor', 'anchors are ordered by participant display_name (neutral), never by any metric');
select is(public.reveal_organization_generations(:'o1')->'anchors'->1->'person'->>'label', 'Bob Overlap', 'second anchor by display_name');
select is(jsonb_array_length(public.reveal_organization_generations(:'o1')->'anchors'->0->'co_present'), 2, 'Ann is documented here at the same time as two others');
select is(public.reveal_organization_generations(:'o1')->'anchors'->0->'co_present'->0->'person'->>'label', 'Bob Overlap', 'co-present people are ordered by display_name (neutral)');

-- The overlap boundary: shared institution + overlap = co-presence; anything less = NOT (10-13)
select ok(
  not exists(select 1 from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors') a where a->'person'->>'id' = :'p_cara'),
  'a participant whose period does NOT overlap any other is NOT revealed (overlap is required -- no inference from shared institution alone)'
);
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors') a
    where a->'person'->>'id' = :'p_uma'
       or exists(select 1 from jsonb_array_elements(a->'co_present') m where m->'person'->>'id' = :'p_uma')
  ),
  'an UNDATED participant appears nowhere (undated cannot establish temporal co-presence)'
);
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors') a
    where a->'person'->>'id' = :'p_mel'
       or exists(select 1 from jsonb_array_elements(a->'co_present') m where m->'person'->>'id' = :'p_mel')
  ),
  'a MERGED participant appears nowhere (excluded as anchor and as co-present)'
);
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors') a
    where a->'person'->>'id' = :'p_zed'
       or exists(select 1 from jsonb_array_elements(a->'co_present') m where m->'person'->>'id' = :'p_zed')
  ),
  'a person at a DIFFERENT institution never appears (no shared institution, no co-presence)'
);

-- Decomposition + temporal preservation (14-16)
select is(
  (select m->'source'->>'type' from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors'->0->'co_present') m where m->'person'->>'id' = :'p_bob'),
  'participations',
  'a co-present person decomposes to its canonical participations Assertion'
);
select is(
  (select m->'source'->>'id' from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors'->0->'co_present') m where m->'person'->>'id' = :'p_bob'),
  :'part_bob',
  'the co-present person cites the exact participation row that establishes the overlap'
);
select is(
  (select m->'temporal'->>'start_date' from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors'->0->'co_present') m where m->'person'->>'id' = :'p_bob'),
  '1992-01-01',
  'the co-present person preserves its own participation temporal payload'
);

-- Anchor carries ALL of their own participations; capacity resolved (17-18)
select is(
  jsonb_array_length((select a->'participations' from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors') a where a->'person'->>'id' = :'p_dee')),
  2,
  'an anchor carries ALL of their own participations here (both sides of every overlap are decomposable)'
);
select is(
  public.reveal_organization_generations(:'o1')->'anchors'->0->'participations'->0->'capacity'->>'label',
  'Researcher',
  'the anchor participation capacity is resolved from the participation_capacities vocabulary'
);

-- ProjectedNode contract (regression guard for the SQL<->parser node shape): type + label (19-22)
select is(public.reveal_organization_generations(:'o1')->'organization'->>'type', 'organization', 'the focal organization node carries type=organization (ProjectedNode contract)');
select is(public.reveal_organization_generations(:'o1')->'organization'->>'label', 'Alpha Institute', 'the organization node carries its name under the canonical label key (not name/short_name)');
select is(public.reveal_organization_generations(:'o1')->'anchors'->0->'person'->>'type', 'person', 'each anchor node carries type=person (ProjectedNode contract)');
select is(public.reveal_organization_generations(:'o1')->'anchors'->0->'co_present'->0->'person'->>'type', 'person', 'each co-present node carries type=person (ProjectedNode contract)');

-- No inference: every co-present person is justified ONLY by a participation (23)
select ok(
  not exists(
    select 1
    from jsonb_array_elements(public.reveal_organization_generations(:'o1')->'anchors') a,
         jsonb_array_elements(a->'co_present') m
    where m->'source'->>'type' <> 'participations'
  ),
  'every co-present person is justified by a participations Assertion -- co-presence is never promoted to a relationship or any other family'
);

-- Honest absence / edge behaviour (24-26)
select is(public.reveal_organization_generations('c0000000-0000-4000-8000-999999999999'), null::jsonb, 'a nonexistent institution returns null');
select is(public.reveal_organization_generations(:'o3')->'anchors', '[]'::jsonb, 'an institution with a sole documented participant gets an empty anchors array (honest absence), not null');
select is(public.reveal_organization_generations(:'o4')->'anchors', '[]'::jsonb, 'an institution with no participants gets an empty anchors array, not null');

-- Determinism (27)
select is(
  public.reveal_organization_generations(:'o1'),
  public.reveal_organization_generations(:'o1'),
  'the revelation is deterministic: the same record yields the same result'
);

reset role;

select * from finish();

rollback;
