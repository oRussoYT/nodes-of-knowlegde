-- pgTAP tests for the Observatory (supabase/migrations/20261029120000_add_observatory.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(9);

\set p1   'e5000000-0000-4000-8000-000000000010'
\set p2   'e5000000-0000-4000-8000-000000000011'
\set camp 'e5000000-0000-4000-8000-000000000020'
\set uni  'e5000000-0000-4000-8000-000000000021'
\set node 'e5000000-0000-4000-8000-000000000030'

insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p1', 'Ana', 'Obs', 'Ana Obs', 'imported_historical'), (:'p2', 'Rui', 'Obs', 'Rui Obs', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status, country_code)
values (:'camp', 'Obs Camp', 'field_station', 'active', 'admin_entered', 'provisional', 'BR'),
       (:'uni',  'Obs University', 'university', 'active', 'admin_entered', 'provisional', 'CA');
insert into public.nodes (id, slug, name, short_name, plan, status) values (:'node', 'obs-test', 'Observatory Test Node', 'OBS', 'pro_bono', 'active');
insert into public.node_organizations (node_id, organization_id, role) values (:'node', :'camp', 'core');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'p1', :'camp', 'field_assistant', '1990-01-01', 'year', '1992-01-01', 'year', 'imported_historical'),
       (:'p2', :'camp', 'researcher',      '1991-01-01', 'year', '1991-01-01', 'year', 'imported_historical'),
       (:'p1', :'uni',  'student',         '1993-01-01', 'year', '1997-01-01', 'year', 'imported_historical');

set local role anon;
create temporary table o on commit drop as select public.node_observatory('obs-test') as r;

select is(((select r from o) -> 'totals' ->> 'people')::int, 2, 'two people passed through the Node'); -- 1
select is(((select r from o) -> 'totals' ->> 'firstYear')::int, 1990, 'since 1990'); -- 2
select is((select (y ->> 'active')::int from o, jsonb_array_elements(r -> 'byYear') y where (y ->> 'year')::int = 1991), 2, 'in 1991, two were active'); -- 3
select is((select (y ->> 'arrived')::int from o, jsonb_array_elements(r -> 'byYear') y where (y ->> 'year')::int = 1991), 1, 'and one arrived'); -- 4
select is(((select r from o) -> 'totals' ->> 'peopleWhoWentOn')::int, 1, 'one went on elsewhere'); -- 5
select is(((select r from o) -> 'diffusionByCountry' -> 0 ->> 'countryCode'), 'CA', 'to Canada'); -- 6
select is(((select r from o) -> 'institutionsReachedList' -> 0 ->> 'name'), 'Obs University', 'the institution reached is listed'); -- 7
select ok(((select r from o)::text) not like '%Ana Obs%', 'no person is named'); -- 8
select is(public.node_observatory('no-such-node'), null, 'unknown Nodes return nothing'); -- 9

select * from finish();
rollback;
