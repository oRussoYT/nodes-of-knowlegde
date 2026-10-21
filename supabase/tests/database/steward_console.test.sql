-- pgTAP tests for the steward console read functions
-- (supabase/migrations/20261017090000_add_steward_console.sql):
-- steward_overview / steward_attention / steward_corpus_timeline.
--
-- Self-contained: inserts its own fixtures as the table owner and rolls back.
-- Counts are checked against direct queries over the same tables, so the
-- tests hold whatever seed data is loaded.

create extension if not exists pgtap;

begin;

select plan(26);

\set reviewer    'e5000000-0000-4000-8000-0000000000a1'
\set granter     'e5000000-0000-4000-8000-0000000000a2'
\set ordinary    'e5000000-0000-4000-8000-0000000000a3'
\set p_alone     'e5000000-0000-4000-8000-000000000001'
\set p_dup_a     'e5000000-0000-4000-8000-000000000002'
\set p_dup_b     'e5000000-0000-4000-8000-000000000003'
\set p_dated     'e5000000-0000-4000-8000-000000000004'
\set p_merged    'e5000000-0000-4000-8000-000000000005'
\set org         'e5000000-0000-4000-8000-000000000010'
\set part_undated 'e5000000-0000-4000-8000-000000000020'
\set part_dated   'e5000000-0000-4000-8000-000000000021'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'steward-reviewer@example.test', 'not-a-real-hash', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'steward-granter@example.test',  'not-a-real-hash', now(), now(), now()),
  (:'ordinary', 'authenticated', 'authenticated', 'steward-ordinary@example.test', 'not-a-real-hash', now(), now(), now());

insert into public.reviewers (user_id, status, granted_by_user_id)
values (:'reviewer', 'active', :'granter');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'p_alone',  'Aaaron', 'Alone',    'Aaaron Steward Alone',      'provisional', 'imported_historical'),
  (:'p_dup_a',  'Aaaron', 'Duplicate', 'Aaaron Steward Duplicate',  'provisional', 'imported_historical'),
  (:'p_dup_b',  'Aaaron', 'Duplicate', '  aaaron  steward duplicate ', 'provisional', 'admin_entered'),
  (:'p_dated',  'Aaaron', 'Dated',    'Aaaron Steward Dated',      'provisional', 'imported_historical'),
  (:'p_merged', 'Aaaron', 'Merged',   'Aaaron Steward Alone',      'merged',      'imported_historical');

insert into public.organizations (id, name, short_name, organization_type, status, source_type, verification_status)
values (:'org', 'Aaaron Steward Institute', 'ASI', 'field_station', 'active', 'imported_historical', 'provisional');

insert into public.participations (id, person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'part_undated', :'p_dup_a', :'org', 'researcher', true, 'imported_historical');

insert into public.participations (id, person_id, organization_id, capacity, start_date, start_precision, source_type)
values (:'part_dated', :'p_dated', :'org', 'field_assistant', '1903-01-01', 'year', 'imported_historical');

insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type)
values (:'p_dup_b', :'org', 'technician', '1905-06-01', 'month', 'imported_historical');

-- 1-3. Functions exist.
select has_function('public', 'steward_overview', ARRAY['uuid'], 'steward_overview() exists');
select has_function('public', 'steward_attention', ARRAY['uuid'], 'steward_attention() exists');
select has_function('public', 'steward_corpus_timeline', ARRAY['uuid'], 'steward_corpus_timeline() exists');

-- 4-6. anon has no EXECUTE.
set local role anon;
select throws_ok($$ select public.steward_overview() $$, '42501', NULL, 'anon cannot execute steward_overview');
select throws_ok($$ select public.steward_attention() $$, '42501', NULL, 'anon cannot execute steward_attention');
select throws_ok($$ select * from public.steward_corpus_timeline() $$, '42501', NULL, 'anon cannot execute steward_corpus_timeline');
reset role;

-- 7. authenticated without a user -> authentication required.
set local role authenticated;
select throws_ok($$ select public.steward_overview() $$, 'steward_overview: authentication required',
  'steward_overview requires auth.uid()');
reset role;

-- 8-10. A signed-in non-reviewer is refused by all three.
set local role authenticated;
set local request.jwt.claim.sub to :'ordinary';
select throws_ok($$ select public.steward_overview() $$, 'steward_overview: reviewer authorization required',
  'non-reviewer cannot read the overview');
select throws_ok($$ select public.steward_attention() $$, 'steward_attention: reviewer authorization required',
  'non-reviewer cannot read the attention lists');
select throws_ok($$ select * from public.steward_corpus_timeline() $$, 'steward_corpus_timeline: reviewer authorization required',
  'non-reviewer cannot read the corpus timeline');
reset role;

-- Expected values, computed as the table owner before switching role.
create temporary table expected on commit drop as
select
  (select count(*) from public.people where verification_status <> 'merged') as people_total,
  (select count(*) from public.people where verification_status = 'merged') as people_merged,
  (select count(*) from public.participations) as parts_total,
  (select count(*) from public.participations where date_is_unknown) as parts_undated,
  (select count(*) from public.organizations) as orgs_total;
grant select on expected to authenticated;

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';

-- 11-16. Overview counts match the tables.
select is((public.steward_overview() -> 'people' ->> 'total')::bigint, (select people_total from expected),
  'overview: people total excludes merged records');
select is((public.steward_overview() -> 'people' ->> 'merged')::bigint, (select people_merged from expected),
  'overview: merged people are counted separately');
select is((public.steward_overview() -> 'participations' ->> 'total')::bigint, (select parts_total from expected),
  'overview: participations total');
select is((public.steward_overview() -> 'participations' ->> 'undated')::bigint, (select parts_undated from expected),
  'overview: undated participations');
select is((public.steward_overview() -> 'organizations' ->> 'total')::bigint, (select orgs_total from expected),
  'overview: organizations total');
select ok(public.steward_overview() ? 'claimsAwaitingReview', 'overview: carries the claims-awaiting-review count');

-- 17-18. Attention: people without participation.
select ok(
  (public.steward_attention() -> 'peopleWithoutParticipation' -> 'items') @> jsonb_build_array(jsonb_build_object('id', :'p_alone'::uuid)),
  'attention: a person with no participation is listed'
);
select ok(
  not ((public.steward_attention() -> 'peopleWithoutParticipation' -> 'items') @> jsonb_build_array(jsonb_build_object('id', :'p_dated'::uuid))),
  'attention: a person with a participation is not listed'
);

-- 19. Attention: undated participation listed with its person and institution.
select ok(
  (public.steward_attention() -> 'undatedParticipations' -> 'items') @> jsonb_build_array(jsonb_build_object(
    'id', :'part_undated'::uuid, 'personId', :'p_dup_a'::uuid, 'organizationName', 'Aaaron Steward Institute')),
  'attention: an undated participation is listed with person and institution'
);

-- 20-22. Possible duplicates: same normalized name grouped; merged excluded.
select ok(
  (public.steward_attention() -> 'possibleDuplicates' -> 'items') @> jsonb_build_array(jsonb_build_object(
    'nameKey', 'aaaron steward duplicate')),
  'attention: names equal after case/space normalization are grouped'
);
select is(
  (select jsonb_array_length(g -> 'people')
     from jsonb_array_elements(public.steward_attention() -> 'possibleDuplicates' -> 'items') g
    where g ->> 'nameKey' = 'aaaron steward duplicate'),
  2,
  'attention: the duplicate group holds both people'
);
select ok(
  not exists (
    select 1 from jsonb_array_elements(public.steward_attention() -> 'possibleDuplicates' -> 'items') g
     where g ->> 'nameKey' = 'aaaron steward alone'),
  'attention: a merged record does not create a duplicate group'
);

-- 23. Proposal, not action: reading the lists changes nothing.
reset role;
select is((select count(*) from public.people where id in (:'p_dup_a', :'p_dup_b') and verification_status = 'provisional'), 2::bigint,
  'attention: possible duplicates are left untouched');
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';

-- 24-26. Corpus timeline: chronological decades with counts.
select is(
  (select participations_starting from public.steward_corpus_timeline() where decade = 1900),
  2::bigint,
  'timeline: both 1900s participations are counted'
);
select is(
  (select people_starting from public.steward_corpus_timeline() where decade = 1900),
  2::bigint,
  'timeline: distinct people starting in the 1900s'
);
select ok(
  (select bool_and(d.decade > d.prev)
     from (select decade, lag(decade) over (order by ordinality) as prev
             from public.steward_corpus_timeline() with ordinality) d
    where d.prev is not null) is not false,
  'timeline: decades come back in chronological order'
);
reset role;

select * from finish();

rollback;
