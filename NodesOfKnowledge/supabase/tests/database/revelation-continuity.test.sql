-- pgTAP tests for Milestone M8.4: Revelation Engine -- continuity & rupture
-- (supabase/migrations/20260814090000_add_continuity_revelation.sql).
--
-- Run locally via: npm run supabase:test (requires `supabase start`). NOT run in
-- the authoring environment.
--
-- Scope: reveal_organization_continuity(uuid) -- the bounded, deterministic
-- composition of a time-ordered series of dated participation Assertions into
-- per-capacity coverage (merged year-intervals + the silences between them),
-- alongside the institution's own explicit terminal status and closure. Asserts:
-- authorization + deny-by-default; the ProjectedNode projection shape and
-- canonical-source decomposition; interval merge (overlapping AND adjacent years
-- merge into one span); a genuine multi-year silence surfaced as a gap and NEVER
-- as an end; an open-ended record read as continuation; undated participations
-- and merged people excluded; the terminal status/closure surfaced from the
-- explicit vocabulary and NEVER back-filled into a practice's end; honest
-- empty/nonexistent behaviour; determinism. Fixtures inserted as the table owner
-- and rolled back.
--
-- The four honest states, each pinned by a test: CONTINUATION (technician, open
-- span); RUPTURE (o_closed, status ended + closure); EVIDENTIARY GAP (director,
-- two spans + a gap); UNKNOWN OUTCOME (o_closed researcher span ends 1990, NOT
-- the 1998 closure -- the institution's end never dates the practice's).

create extension if not exists pgtap;
begin;
select plan(27);

\set reader 'd0000000-0000-4000-8000-0000000000bb'
\set o_focal   'd0000000-0000-4000-8000-000000000111'
\set o_closed  'd0000000-0000-4000-8000-000000000112'
\set o_dormant 'd0000000-0000-4000-8000-000000000113'
\set p_a 'd0000000-0000-4000-8000-000000000501'
\set p_b 'd0000000-0000-4000-8000-000000000502'
\set p_c 'd0000000-0000-4000-8000-000000000503'
\set p_d 'd0000000-0000-4000-8000-000000000504'
\set p_e 'd0000000-0000-4000-8000-000000000505'
\set p_merged 'd0000000-0000-4000-8000-00000000050f'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'revelation-continuity@example.test', 'x', now(), now(), now());

select has_function('public', 'reveal_organization_continuity', array['uuid'], 'reveal_organization_continuity(uuid) exists');

-- o_focal: active (default status). o_closed: a documented rupture with a closure
-- date. o_dormant: paused, no participations.
insert into public.organizations (id, name, short_name, status, source_type, verification_status) values
  (:'o_focal',   'Focal Station', 'FS', 'active',  'imported_historical', 'provisional'),
  (:'o_dormant', 'Dormant House', 'DH', 'dormant', 'imported_historical', 'provisional');
insert into public.organizations (id, name, short_name, status, closure_date, closure_precision, source_type, verification_status) values
  (:'o_closed',  'Closed Institute', 'CI', 'closed', '1998-06-01', 'month', 'imported_historical', 'provisional');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'p_a', 'Ana',   'Alpha', 'Ana Alpha',   'provisional', 'imported_historical'),
  (:'p_b', 'Bruno', 'Beta',  'Bruno Beta',  'provisional', 'imported_historical'),
  (:'p_c', 'Cara',  'Gamma', 'Cara Gamma',  'provisional', 'imported_historical'),
  (:'p_d', 'Davi',  'Delta', 'Davi Delta',  'provisional', 'imported_historical'),
  (:'p_e', 'Elena', 'Epsilon','Elena Epsilon','provisional','imported_historical'),
  (:'p_merged', 'Merged', 'Person', 'Merged Person', 'merged', 'admin_entered');

-- researcher @ focal: two OVERLAPPING records -> one continuous span 1970-1980.
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'p_a', :'o_focal', 'researcher', '1970-01-01', 'year', '1975-12-31', 'year', 'imported_historical'),
  (:'p_b', :'o_focal', 'researcher', '1974-01-01', 'year', '1980-12-31', 'year', 'imported_historical');

-- coordinator @ focal: two ADJACENT-year records (1975 then 1976) -> one span
-- 1970-1979, NO gap (adjacency merges; only a whole-year silence is a gap).
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'p_a', :'o_focal', 'coordinator', '1970-01-01', 'year', '1975-12-31', 'year', 'imported_historical'),
  (:'p_b', :'o_focal', 'coordinator', '1976-01-01', 'year', '1979-12-31', 'year', 'imported_historical');

-- director @ focal: two records with a MULTI-YEAR silence -> two spans + a gap.
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'p_a', :'o_focal', 'director', '1960-01-01', 'year', '1965-12-31', 'year', 'imported_historical'),
  (:'p_c', :'o_focal', 'director', '1980-01-01', 'year', '1985-12-31', 'year', 'imported_historical');

-- technician @ focal: an OPEN-ENDED record -> one open span (continuation).
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, is_ongoing, source_type) values
  (:'p_d', :'o_focal', 'technician', '1990-01-01', 'year', true, 'imported_historical');

-- student @ focal: only an UNDATED record and a MERGED person -> no valid
-- coverage, so the student practice never appears.
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type) values
  (:'p_e', :'o_focal', 'student', true, 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'p_merged', :'o_focal', 'student', '1970-01-01', 'year', '1972-12-31', 'year', 'imported_historical');

-- researcher @ closed: a CLOSED span ending 1990, while the institution's own
-- closure is 1998 -- the two must never be conflated.
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type) values
  (:'p_a', :'o_closed', 'researcher', '1980-01-01', 'year', '1990-12-31', 'year', 'imported_historical');

-- ---- Authorization (2) ----
set local role anon;
select throws_ok($$ select public.reveal_organization_continuity('d0000000-0000-4000-8000-000000000111') $$, '42501', NULL, 'anon cannot execute reveal_organization_continuity');
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- ---- Focal document, status, ordering (3-6) ----
select is(public.reveal_organization_continuity(:'o_focal')->>'organization_id', :'o_focal', 'continuity is centred on the focal institution');
select is(public.reveal_organization_continuity(:'o_focal')->'status'->>'key', 'active', 'an active institution reports its explicit status key');
select is(public.reveal_organization_continuity(:'o_focal')->'status'->>'status_category', 'active', 'active maps to the active category');
select is(jsonb_array_length(public.reveal_organization_continuity(:'o_focal')->'practices'), 4, 'four capacities have valid coverage (student dropped: only undated/merged)');

-- practices ordered by capacity label: Coordinator, Director, Researcher, Technician
select is(public.reveal_organization_continuity(:'o_focal')->'practices'->0->'capacity'->>'key', 'coordinator', 'practices are ordered by capacity label (Coordinator first)');

-- ---- Continuous + adjacency merge (7-9) ----
select is(
  (select jsonb_array_length(e->'spans') from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'researcher'),
  1, 'two overlapping researcher records merge into one continuous span');
select is(
  (select e->'spans'->0->>'start_year' || '-' || (e->'spans'->0->>'end_year') from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'researcher'),
  '1970-1980', 'the merged researcher span spans 1970 to 1980');
select is(
  (select jsonb_array_length(e->'gaps') from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'coordinator'),
  0, 'adjacent-year coordinator records merge into one span with NO gap');

-- ---- Evidentiary gap, never an end (10-13) ----
select is(
  (select jsonb_array_length(e->'spans') from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'director'),
  2, 'a multi-year silence yields two director spans');
select is(
  (select jsonb_array_length(e->'gaps') from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'director'),
  1, 'the silence between the director spans is reported as one evidentiary gap');
select is(
  (select e->'gaps'->0->>'from_year' || '-' || (e->'gaps'->0->>'to_year') from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'director'),
  '1965-1980', 'the gap runs from the earlier span end (1965) to the later span start (1980)');
select is(
  (select e->'spans'->0->>'is_open' from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'director'),
  'false', 'the earlier director span is closed -- a gap follows a closed span, never a claimed end');

-- ---- Continuation: open-ended record (14-15) ----
select is(
  (select e->'spans'->0->>'is_open' from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'technician'),
  'true', 'an open-ended technician record is a continuation span (is_open)');
select is(
  (select e->'spans'->0->'end_year' from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') e where e->'capacity'->>'key' = 'technician'),
  'null'::jsonb, 'an open span carries a null end year');

-- ---- Exclusions (16) ----
select ok(
  not exists(
    select 1
    from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') pr,
         jsonb_array_elements(pr->'spans') sp,
         jsonb_array_elements(sp->'participations') pa
    where pa->'person'->>'id' in (:'p_merged', :'p_e')
      or pr->'capacity'->>'key' = 'student'
  ),
  'merged people and undated participations are excluded, so the student practice never appears');

-- ---- ProjectedNode contract + source decomposition (17-20) ----
select is(public.reveal_organization_continuity(:'o_focal')->'organization'->>'type', 'organization', 'focal node carries type=organization (ProjectedNode contract)');
select is(
  (select pa->'person'->>'type' from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') pr, jsonb_array_elements(pr->'spans') sp, jsonb_array_elements(sp->'participations') pa limit 1),
  'person', 'a coverage participation projects a person ProjectedNode');
select is(
  (select pa->'person'->>'label' from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') pr, jsonb_array_elements(pr->'spans') sp, jsonb_array_elements(sp->'participations') pa where pa->'person'->>'id' = :'p_d' limit 1),
  'Davi Delta', 'a person endpoint carries its display name under the canonical label key');
select is(
  (select pa->'source'->>'type' from jsonb_array_elements(public.reveal_organization_continuity(:'o_focal')->'practices') pr, jsonb_array_elements(pr->'spans') sp, jsonb_array_elements(sp->'participations') pa limit 1),
  'participations', 'a coverage span decomposes to its canonical participations rows');

-- ---- Rupture + unknown outcome held apart (21-24) ----
select is(public.reveal_organization_continuity(:'o_closed')->'status'->>'status_category', 'ended', 'a closed institution maps to the ended category (a documented rupture)');
select is(public.reveal_organization_continuity(:'o_closed')->'closure'->>'date', '1998-06-01', 'the documented closure date is surfaced from the explicit record');
select is(
  (select e->'spans'->0->>'end_year' from jsonb_array_elements(public.reveal_organization_continuity(:'o_closed')->'practices') e where e->'capacity'->>'key' = 'researcher'),
  '1990', 'the researcher span ends at its OWN documented end (1990), never back-filled to the 1998 closure');
select is(public.reveal_organization_continuity(:'o_dormant')->'status'->>'status_category', 'paused', 'a dormant institution maps to the paused category');

-- ---- Honest empty / nonexistent / determinism (25-26) ----
select is(jsonb_array_length(public.reveal_organization_continuity(:'o_dormant')->'practices'), 0, 'an institution with no dated participations has empty coverage (honest absence), yet still returns its status');
select is(public.reveal_organization_continuity('d0000000-0000-4000-8000-999999999999'), null::jsonb, 'a nonexistent institution returns null');

reset role;
select * from finish();
rollback;
