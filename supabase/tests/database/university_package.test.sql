-- pgTAP tests for the university package
-- (supabase/migrations/20261029090000_add_university_package.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(20);

\set platform 'eb100000-0000-4000-8000-0000000000a1'
\set granter  'eb100000-0000-4000-8000-0000000000a2'
\set st_a     'eb100000-0000-4000-8000-0000000000a3'
\set member   'eb100000-0000-4000-8000-0000000000a4'
\set org_a    'eb100000-0000-4000-8000-000000000010'

-- 1-6: degree levels read from what lists say.
select is(public.degree_level_of('Pós-doutorado em Ecologia'), 'postdoc', 'post-doc before doctorate'); -- 1
select is(public.degree_level_of('PhD Ecology'), 'doctorate', 'PhD is a doctorate'); -- 2
select is(public.degree_level_of('Mestrado Profissional em Gestão'), 'professional_master', 'professional master''s'); -- 3
select is(public.degree_level_of('MSc'), 'master', 'MSc is a master''s'); -- 4
select is(public.degree_level_of('Bacharelado em Ciências Biológicas'), 'undergraduate', 'bacharelado is undergraduate'); -- 5
select is(public.degree_level_of(null), 'other', 'no degree is other'); -- 6

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'uni-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'uni-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'uni-a@example.test',        'x', now(), now(), now()),
  (:'member',   'authenticated', 'authenticated', 'uni-m@example.test',        'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Level University', 'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id) values (:'org_a', :'st_a', :'platform');

set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table bt on commit drop as
select public.steward_create_import_batch('Graduates', :'org_a',
  '[{"givenName":"Ada","familyName":"Found","degree":"Doutorado","programme":"Ecologia","graduationYear":"2015"},
    {"givenName":"Ben","familyName":"Master","degree":"Mestrado","programme":"Ecologia","graduationYear":"2018"},
    {"givenName":"Cy","familyName":"Under","degree":"Bacharelado","programme":"Biologia","graduationYear":"2020"}]'::jsonb) as id;
grant select on bt to authenticated;
create temporary table rw on commit drop as
select r ->> 'id' as id, r ->> 'familyName' as family
  from jsonb_array_elements(public.steward_import_candidates((select id from bt)) -> 'rows') r;
grant select on rw to authenticated;
select public.steward_resolve_import_row((select id::uuid from rw where family = f), 'create') from (values ('Found'), ('Master'), ('Under')) v(f);
select public.steward_record_external_matches((select id::uuid from rw where family = 'Found'), 'openalex',
  '[{"externalId":"https://openalex.org/AF","displayName":"Ada Found","lastKnownInstitution":"Delta University","lastKnownCountry":"CA",
     "lastKnownType":"education","affiliations":[{"institution":"Delta University","years":[2019,2021]}],"reasons":["same_name"]}]'::jsonb);
select public.steward_decide_external_match(
  (select (m ->> 'id')::uuid from jsonb_array_elements(public.steward_import_external((select id from bt)) -> 'rows') r,
          jsonb_array_elements(r -> 'matches') m where r ->> 'familyName' = 'Found'), true);

reset role;
create temporary table expected on commit drop as
select d.as_of_year - 2015 as years from public.person_destinations d join public.people p on p.id = d.person_id where p.display_name = 'Ada Found';
grant select on expected to authenticated;
set local role authenticated;
create temporary table rep on commit drop as select public.steward_university_report(:'org_a') as r;
grant select on rep to authenticated;

-- 7-12: the report by level.
select is(jsonb_array_length((select r from rep) -> 'levels'), 3, 'only levels with graduates are listed'); -- 7
select is(((select r from rep) -> 'levels' -> 0 ->> 'key'), 'undergraduate', 'levels in their natural order'); -- 8
select is((select (l ->> 'found')::int from rep, jsonb_array_elements(r -> 'levels') l where l ->> 'key' = 'doctorate'), 1, 'the located doctor counts'); -- 9
select is((select (l ->> 'abroad')::int from rep, jsonb_array_elements(r -> 'levels') l where l ->> 'key' = 'doctorate'), 1, 'abroad compares with the home country'); -- 10
select is((select (l ->> 'medianYearsToDestination')::int from rep, jsonb_array_elements(r -> 'levels') l where l ->> 'key' = 'doctorate'),
  (select years from expected),
  'years from graduation to the destination'); -- 11
select is((public.steward_university_report(:'org_a', null, null, null, 'CA') -> 'totals' ->> 'abroad')::int, 0, 'home country can be chosen'); -- 12
select ok(jsonb_array_length((select r from rep) -> 'method') >= 5, 'the method is stated'); -- 13

-- 14-15: the CAPES export has master's and doctorates only, and is audited.
select is((select count(*)::int from public.steward_capes_export(:'org_a')), 2, 'CAPES lists postgraduates only'); -- 14
select is((select destination_category from public.steward_capes_export(:'org_a') where display_name = 'Ben Master'), 'Não localizado', 'not located is said plainly'); -- 15

-- 16: others cannot read the report.
set local request.jwt.claim.sub to :'member';
select throws_ok(format('select public.steward_university_report(%L)', :'org_a'), null, null, 'only stewards read the report'); -- 16

-- 17-20: plan requests.
create temporary table pr on commit drop as
select public.request_plan('{"institutionName":"Museu Exemplo","institutionKind":"museum","contactName":"Rita","peopleEstimate":"300"}'::jsonb) as id;
grant select on pr to authenticated;
select is(public.my_plan_requests() -> 0 ->> 'plan', 'institution', 'a museum asks for the institution plan'); -- 17
select throws_ok('select public.steward_list_plan_requests()', '42501', null, 'members cannot list requests'); -- 18
set local request.jwt.claim.sub to :'platform';
select throws_ok(format('select public.steward_answer_plan_request(%L, %L)', (select id from pr), 'declined'), '22023', null, 'a decline needs a note'); -- 19
select public.steward_answer_plan_request((select id from pr), 'in_conversation', 'We will call you this week');
set local request.jwt.claim.sub to :'member';
select is(public.my_plan_requests() -> 0 ->> 'answerNote', 'We will call you this week', 'the requester sees the answer'); -- 20

select * from finish();
rollback;
