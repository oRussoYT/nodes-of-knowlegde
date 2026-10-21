-- pgTAP tests for Milestone M8.3: Revelation Engine -- lineage & institutional
-- evolution (supabase/migrations/20260813090000_add_lineage_revelation.sql).
--
-- Run locally via: npm run supabase:test (requires `supabase start`). NOT run in
-- the authoring environment.
--
-- Scope: reveal_organization_lineage(uuid) and reveal_person_mentorship_lineage(uuid)
-- -- the bounded, cycle-safe, deterministic composition of directional same-kind
-- relationship Assertions into a documented lineage. Asserts: authorization +
-- deny-by-default; that only the descent kinds are followed (succession/merger for
-- institutions; mentorship for people) and governance/other kinds are NOT; that no
-- inferred lineage arises from anything but explicit directional edges; merged
-- people excluded; directionality (from=source, to=target) and inverse role from
-- the vocabulary; canonical-source preservation; neutral ordering; cycle-safety
-- (termination without explosion); the exact ProjectedNode projection shape; honest
-- empty/nonexistent behaviour; and determinism. Fixtures inserted as the table
-- owner and rolled back.

create extension if not exists pgtap;
begin;
select plan(31);

\set reader   'd0000000-0000-4000-8000-0000000000aa'
-- institutions: a -> b -> c(focal) -> d ; merger e -> c ; admin g -> c
\set o_a 'd0000000-0000-4000-8000-000000000101'
\set o_b 'd0000000-0000-4000-8000-000000000102'
\set o_c 'd0000000-0000-4000-8000-000000000103'
\set o_d 'd0000000-0000-4000-8000-000000000104'
\set o_e 'd0000000-0000-4000-8000-000000000105'
\set o_g 'd0000000-0000-4000-8000-000000000106'
\set o_lonely 'd0000000-0000-4000-8000-000000000107'
\set o_cyc1 'd0000000-0000-4000-8000-000000000108'
\set o_cyc2 'd0000000-0000-4000-8000-000000000109'
\set r1 'd0000000-0000-4000-8000-000000000201'
\set r2 'd0000000-0000-4000-8000-000000000202'
\set r3 'd0000000-0000-4000-8000-000000000203'
\set r4 'd0000000-0000-4000-8000-000000000204'
\set r5 'd0000000-0000-4000-8000-000000000205'
\set rc1 'd0000000-0000-4000-8000-000000000206'
\set rc2 'd0000000-0000-4000-8000-000000000207'
-- people: m1 -> m2 -> focal -> s1 -> s2 ; merged -> focal ; advisor -> focal
\set p_m1 'd0000000-0000-4000-8000-000000000301'
\set p_m2 'd0000000-0000-4000-8000-000000000302'
\set p_focal 'd0000000-0000-4000-8000-000000000303'
\set p_s1 'd0000000-0000-4000-8000-000000000304'
\set p_s2 'd0000000-0000-4000-8000-000000000305'
\set p_merged 'd0000000-0000-4000-8000-00000000030f'
\set p_adv 'd0000000-0000-4000-8000-000000000306'
\set rm1 'd0000000-0000-4000-8000-000000000401'
\set rm2 'd0000000-0000-4000-8000-000000000402'
\set rm3 'd0000000-0000-4000-8000-000000000403'
\set rm4 'd0000000-0000-4000-8000-000000000404'
\set rm5 'd0000000-0000-4000-8000-00000000040f'
\set rm6 'd0000000-0000-4000-8000-000000000406'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reader', 'authenticated', 'authenticated', 'revelation-lineage@example.test', 'x', now(), now(), now());

select has_function('public', 'reveal_organization_lineage', array['uuid'], 'reveal_organization_lineage(uuid) exists');
select has_function('public', 'reveal_person_mentorship_lineage', array['uuid'], 'reveal_person_mentorship_lineage(uuid) exists');

insert into public.organizations (id, name, short_name, source_type, verification_status) values
  (:'o_a', 'Alpha Origin', 'AO', 'imported_historical', 'provisional'),
  (:'o_b', 'Beta Mid',     'BM', 'imported_historical', 'provisional'),
  (:'o_c', 'Gamma Focal',  'GF', 'imported_historical', 'provisional'),
  (:'o_d', 'Delta New',    'DN', 'imported_historical', 'provisional'),
  (:'o_e', 'Epsilon Merged','EM','imported_historical', 'provisional'),
  (:'o_g', 'Governor Body','GB', 'imported_historical', 'provisional'),
  (:'o_lonely', 'Lonely Institute','LI','imported_historical','provisional'),
  (:'o_cyc1','Cycle One','C1','imported_historical','provisional'),
  (:'o_cyc2','Cycle Two','C2','imported_historical','provisional');

-- Directional descent assertions carry explicit dates (the schema's temporal
-- contract requires start_precision iff start_date, and start_date iff not
-- date_is_unknown). Dates are historically plausible; ordering in the read model
-- is by depth then name, so exact dates do not affect the assertions.
insert into public.organization_relationships (id, kind, is_directional, source_organization_id, target_organization_id, start_date, start_precision, source_type) values
  (:'r1','succession',    true, :'o_a', :'o_b', '1960-01-01', 'year', 'imported_historical'),
  (:'r2','succession',    true, :'o_b', :'o_c', '1970-01-01', 'year', 'imported_historical'),
  (:'r3','succession',    true, :'o_c', :'o_d', '1990-01-01', 'year', 'imported_historical'),
  (:'r4','merger',        true, :'o_e', :'o_c', '1975-01-01', 'year', 'imported_historical'),
  (:'r5','administration',true, :'o_g', :'o_c', '1980-01-01', 'year', 'imported_historical'),
  (:'rc1','succession',   true, :'o_cyc1', :'o_cyc2', '1950-01-01', 'year', 'imported_historical'),
  (:'rc2','succession',   true, :'o_cyc2', :'o_cyc1', '1955-01-01', 'year', 'imported_historical');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'p_m1', 'Grand','Mentor','Grand Mentor','provisional','imported_historical'),
  (:'p_m2', 'A','Mentor','A Mentor','provisional','imported_historical'),
  (:'p_focal','Focal','Person','Focal Person','provisional','imported_historical'),
  (:'p_s1', 'A','Student','A Student','provisional','imported_historical'),
  (:'p_s2', 'Grand','Student','Grand Student','provisional','imported_historical'),
  (:'p_merged','Merged','Mentor','Merged Mentor','merged','admin_entered'),
  (:'p_adv','An','Advisor','An Advisor','provisional','imported_historical');

insert into public.relationships (id, kind, is_directional, source_person_id, target_person_id, start_date, start_precision, source_type) values
  (:'rm1','mentorship', true, :'p_m1', :'p_m2', '1960-01-01', 'year', 'imported_historical'),
  (:'rm2','mentorship', true, :'p_m2', :'p_focal', '1980-01-01', 'year', 'imported_historical'),
  (:'rm3','mentorship', true, :'p_focal', :'p_s1', '1995-01-01', 'year', 'imported_historical'),
  (:'rm4','mentorship', true, :'p_s1', :'p_s2', '2005-01-01', 'year', 'imported_historical'),
  (:'rm5','mentorship', true, :'p_merged', :'p_focal', '1980-01-01', 'year', 'imported_historical'),
  (:'rm6','advising',   true, :'p_adv', :'p_focal', '1980-01-01', 'year', 'imported_historical');

-- ---- Authorization (3-4) ----
set local role anon;
select throws_ok($$ select public.reveal_organization_lineage('d0000000-0000-4000-8000-000000000103') $$, '42501', NULL, 'anon cannot execute reveal_organization_lineage');
select throws_ok($$ select public.reveal_person_mentorship_lineage('d0000000-0000-4000-8000-000000000303') $$, '42501', NULL, 'anon cannot execute reveal_person_mentorship_lineage');
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- ---- Institutional lineage (5-17) ----
select is(public.reveal_organization_lineage(:'o_c')->>'organization_id', :'o_c', 'institution lineage is centred on the focal institution');
select is(jsonb_array_length(public.reveal_organization_lineage(:'o_c')->'upstream'), 3, 'focal has three documented antecedent steps (b->c, e->c, a->b)');
select is(jsonb_array_length(public.reveal_organization_lineage(:'o_c')->'downstream'), 1, 'focal has one documented successor step (c->d)');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->0->'source'->>'id', :'r2', 'antecedents ordered by depth then name: depth-1 Beta Mid (b->c) first');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->1->'source'->>'id', :'r4', 'depth-1 Epsilon Merged (e->c) second by name');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->2->'source'->>'id', :'r1', 'depth-2 antecedent (a->b) last');
select is((public.reveal_organization_lineage(:'o_c')->'upstream'->2->>'depth')::int, 2, 'the depth-2 step reports depth 2');
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_organization_lineage(:'o_c')->'upstream') e
    where e->'source'->>'id' = :'r5' or e->'from'->>'id' = :'o_g' or e->'to'->>'id' = :'o_g'
  ),
  'a GOVERNANCE (administration) relationship never appears in the evolution descent (same-kind: succession/merger only)'
);
select is(
  (select e->'kind'->>'source_role' from jsonb_array_elements(public.reveal_organization_lineage(:'o_c')->'upstream') e where e->'source'->>'id' = :'r2'),
  'Predecessor',
  'a succession step carries the inverse source-role label from the vocabulary'
);
select is(
  (select e->'kind'->>'label' from jsonb_array_elements(public.reveal_organization_lineage(:'o_c')->'upstream') e where e->'source'->>'id' = :'r4'),
  'Merger',
  'a merger step is labelled Merger'
);
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->0->'from'->>'id', :'o_b', 'a step keeps the assertion direction: from=source (b), ...');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->0->'to'->>'id', :'o_c', '... to=target (c)');
select is(public.reveal_organization_lineage(:'o_c')->'downstream'->0->>'direction', 'downstream', 'a successor step is marked downstream');

-- ProjectedNode contract + source preservation (18-21)
select is(public.reveal_organization_lineage(:'o_c')->'organization'->>'type', 'organization', 'focal node carries type=organization (ProjectedNode contract)');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->0->'from'->>'type', 'organization', 'a step endpoint carries type=organization');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->0->'from'->>'label', 'Beta Mid', 'an endpoint carries its name under the canonical label key');
select is(public.reveal_organization_lineage(:'o_c')->'upstream'->0->'source'->>'type', 'organization_relationships', 'a step decomposes to its canonical organization_relationships row');

-- Cycle-safety, honest absence, determinism (22-25)
select is(jsonb_array_length(public.reveal_organization_lineage(:'o_cyc1')->'upstream'), 1, 'a cycle terminates without explosion (upstream bounded to 1)');
select is(public.reveal_organization_lineage(:'o_lonely')->'upstream', '[]'::jsonb, 'an institution with no descent edges gets empty upstream (honest absence)');
select is(public.reveal_organization_lineage('d0000000-0000-4000-8000-999999999999'), null::jsonb, 'a nonexistent institution returns null');
select is(public.reveal_organization_lineage(:'o_c'), public.reveal_organization_lineage(:'o_c'), 'institutional lineage is deterministic');

-- ---- Mentorship lineage (26-31) ----
select is(jsonb_array_length(public.reveal_person_mentorship_lineage(:'p_focal')->'upstream'), 2, 'focal has two documented mentor steps (m2->focal, m1->m2)');
select is(jsonb_array_length(public.reveal_person_mentorship_lineage(:'p_focal')->'downstream'), 2, 'focal has two documented student steps (focal->s1, s1->s2)');
select ok(
  not exists(
    select 1 from jsonb_array_elements(public.reveal_person_mentorship_lineage(:'p_focal')->'upstream') e
    where e->'source'->>'id' = :'rm5' or e->'from'->>'id' = :'p_merged'
       or e->'source'->>'id' = :'rm6' or e->'from'->>'id' = :'p_adv'
  ),
  'a MERGED mentor and a NON-mentorship (advising) relationship never appear (merged excluded; same-kind only)'
);
select is(
  (select e->'kind'->>'source_role' from jsonb_array_elements(public.reveal_person_mentorship_lineage(:'p_focal')->'upstream') e where e->'source'->>'id' = :'rm2'),
  'Mentor',
  'a mentorship step carries the Mentor source-role and decomposes to its relationships row'
);
select is(public.reveal_person_mentorship_lineage(:'p_focal')->'upstream'->0->'from'->>'type', 'person', 'a mentorship endpoint carries type=person (ProjectedNode contract)');
select is(public.reveal_person_mentorship_lineage(:'p_merged'), null::jsonb, 'a merged focal person returns null');

reset role;
select * from finish();
rollback;
