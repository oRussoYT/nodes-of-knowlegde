-- pgTAP tests for bringing a person's history in from OpenAlex
-- (supabase/migrations/20261023100000_add_openalex_history.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

-- Self-contained: set aside the real records imported from OpenAlex (rolled back at the end).
delete from public.people where id in (select person_id from public.person_external_ids where source = 'openalex');
delete from public.organizations where source_type = 'imported_historical' and id in (select subject_id from public.external_record_sources where subject_type = 'organization');
delete from public.contributions where id in (select subject_id from public.external_record_sources where subject_type = 'contribution');
delete from public.external_record_sources;

select plan(16);

\set reviewer 'ae000000-0000-4000-8000-0000000000a1'
\set granter  'ae000000-0000-4000-8000-0000000000a2'
\set member   'ae000000-0000-4000-8000-0000000000a3'
\set person   'ae000000-0000-4000-8000-000000000010'
\set other    'ae000000-0000-4000-8000-000000000011'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'oa-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'oa-granter@example.test',  'x', now(), now(), now()),
  (:'member',   'authenticated', 'authenticated', 'oa-member@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'person', 'Rita', 'Forest', 'Rita Forest', 'imported_historical'),
       (:'other',  'Otto', 'Other',  'Otto Other',  'imported_historical');
insert into public.person_external_ids (person_id, source, external_id)
values (:'person', 'openalex', 'https://openalex.org/A1');

create temporary table payload on commit drop as select '{
  "authorId": "https://openalex.org/A1",
  "affiliations": [
    {"openalexId": "https://openalex.org/I1", "name": "Old Forest Institute", "ror": "0abc12345", "type": "facility",
     "country": "BR", "years": [2009, 2011, 2010], "rorStatus": "inactive", "established": "1979",
     "names": [{"name": "OFI", "kind": "acronym"}, {"name": "Instituto da Floresta Antiga", "kind": "label", "language": "pt"}]},
    {"openalexId": "https://openalex.org/I2", "name": "River University", "type": "education", "years": [2015]},
    {"openalexId": "https://openalex.org/I3", "name": "No Years Place", "years": []}
  ],
  "works": [
    {"openalexId": "https://openalex.org/W1", "title": "Fragments and birds", "year": 2011, "type": "dissertation",
     "venue": "Old Forest Institute", "doi": "https://doi.org/10.1/abc"},
    {"openalexId": "https://openalex.org/W2", "title": "A dataset", "type": "dataset"},
    {"openalexId": "not-an-id", "title": "Bad"}
  ]
}'::jsonb as p;
grant select on payload to authenticated;

set local role authenticated;

set local request.jwt.claim.sub to :'member';
select throws_ok(format('select public.steward_record_openalex_history(%L, (select p from payload))', :'person'),
  '42501', null, 'an ordinary member cannot import a history'); -- 1
select throws_ok(format('select public.steward_openalex_author_for_person(%L)', :'person'),
  '42501', null, 'an ordinary member cannot read the accepted OpenAlex id'); -- 2

set local request.jwt.claim.sub to :'reviewer';
select is(public.steward_openalex_author_for_person(:'person'), 'https://openalex.org/A1',
  'a reviewer reads the accepted OpenAlex id'); -- 3
select throws_ok(format('select public.steward_record_openalex_history(%L, (select p from payload))', :'other'),
  '22023', null, 'refused for a person without that accepted OpenAlex id'); -- 4

create temporary table r1 on commit drop as
select public.steward_record_openalex_history(:'person', (select p from payload)) as r;
select is((select r from r1),
  '{"institutionsCreated": 2, "institutionsLinked": 0, "affiliations": 2, "works": 2, "skipped": 2}'::jsonb,
  'first run creates two institutions, two affiliations, two works and skips the unusable rows'); -- 5

reset role;
select is((select status from public.organizations where name = 'Old Forest Institute'), 'closed',
  'an institution ROR lists as inactive is recorded as closed'); -- 6
select is((select extract(year from founding_date)::int from public.organizations where name = 'Old Forest Institute'), 1979,
  'its founding year comes from ROR'); -- 7
select is((select array_agg(name_type order by name_type) from public.organization_names n
             join public.organizations o on o.id = n.organization_id where o.name = 'Old Forest Institute'),
  array['acronym', 'translation'], 'its other names are recorded'); -- 8
select is((select concat(extract(year from start_date), '-', extract(year from end_date)) from public.participations
            where person_id = :'person' and organization_id = (select id from public.organizations where name = 'Old Forest Institute')),
  '2009-2011', 'the affiliation spans the first to the last year'); -- 9
select is((select verification_status from public.participations where person_id = :'person' limit 1), 'provisional',
  'imported affiliations are provisional'); -- 10
select is((select url from public.external_record_sources s join public.contributions c on c.id = s.subject_id
            where s.subject_type = 'contribution' and c.title = 'Fragments and birds'), 'https://doi.org/10.1/abc',
  'a work keeps its DOI link'); -- 11
select is((select description from public.contributions where title = 'Fragments and birds'), 'Thesis · Old Forest Institute',
  'a thesis is labelled as one'); -- 12
select ok((select date_is_unknown from public.contributions where title = 'A dataset'),
  'a work without a year has an unknown date'); -- 13
select is((select count(*)::int from public.audit_logs where subject_id = :'person' and metadata ->> 'import' = 'openalex_history'), 1,
  'the run is audited'); -- 14

set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';
create temporary table r2 on commit drop as
select public.steward_record_openalex_history(:'person', (select p from payload)) as r;
select is((select r ->> 'affiliations' from r2)::int + (select r ->> 'works' from r2)::int + (select r ->> 'institutionsCreated' from r2)::int, 0,
  'running again adds nothing new'); -- 15

set local request.jwt.claim.sub to :'member';
select is((select count(*)::int from public.external_record_sources where subject_type = 'contribution'), 2,
  'signed-in readers can see where records came from'); -- 16

select * from finish();
rollback;
