-- pgTAP tests for the remaining features (supabase/migrations/20261031100000_add_remaining_features.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(9);

\set rev  'ed000000-0000-4000-8000-0000000000a1'
\set gr   'ed000000-0000-4000-8000-0000000000a2'
\set mem  'ed000000-0000-4000-8000-0000000000a3'
\set m    'ed000000-0000-4000-8000-000000000010'
\set s1   'ed000000-0000-4000-8000-000000000011'
\set s2   'ed000000-0000-4000-8000-000000000012'
\set org  'ed000000-0000-4000-8000-000000000020'
\set org2 'ed000000-0000-4000-8000-000000000021'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'rev', 'authenticated', 'authenticated', 'rf-rev@example.test', 'x', now(), now(), now()),
       (:'gr',  'authenticated', 'authenticated', 'rf-gr@example.test',  'x', now(), now(), now()),
       (:'mem', 'authenticated', 'authenticated', 'rf-m@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'rev', 'active', :'gr');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'m', 'Rita', 'Mentorova', 'Rita Mentorova', 'imported_historical'),
       (:'s1', 'Sam', 'Uno', 'Sam Uno', 'imported_historical'),
       (:'s2', 'Sia', 'Dos', 'Sia Dos', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status, latitude, longitude)
values (:'org', 'Mentor Station', 'field_station', 'active', 'admin_entered', 'provisional', -2.4, -59.9),
       (:'org2', 'Later Institute', 'research_institute', 'active', 'admin_entered', 'provisional', -3.1, -60.0);
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'m', :'org', 'principal_investigator', '1990-01-01', 'year', '2005-01-01', 'year', 'imported_historical'),
       (:'s1', :'org2', 'researcher', '2003-01-01', 'year', null, null, 'imported_historical');
insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, source_type)
values ('mentorship', true, :'m', :'s1', '1998-01-01', 'year', 'imported_historical'),
       ('mentorship', true, :'m', :'s2', '2001-01-01', 'year', 'imported_historical');

set local role anon;
select throws_ok(format('select public.person_cv(%L)', :'m'), '42501', null, 'the CV is for members'); -- 1

set local role authenticated;
set local request.jwt.claim.sub to :'mem';
select is(jsonb_array_length(public.person_cv(:'m') -> 'periods'), 1, 'the CV lists her periods'); -- 2
select is((public.person_cv(:'m') -> 'periods' -> 0 ->> 'latitude')::numeric, -2.4, 'with where they were'); -- 3

create temporary table a on commit drop as select public.find_advisors('mentor station') as r;
grant select on a to authenticated;
select is(((select r from a) -> 0 ->> 'advisees')::int, 2, 'an advisor found through her institution, with two advisees'); -- 4
select is(((select r from a) -> 0 -> 'whereAdviseesWent' ->> 0), 'Later Institute', 'and where they went'); -- 5
select is(((select r from a) -> 0 ->> 'adviseesWithLaterPeriods')::int, 1, 'only later periods count as "went on"'); -- 6

select is(jsonb_array_length(public.node_vocabulary_for('pdbff')) >= 5, true, 'the PDBFF has its own words'); -- 7
select throws_ok($$select public.steward_set_node_vocabulary('pdbff', '{"kind":"field","label":"Ants"}'::jsonb)$$, '42501', null, 'members do not change them'); -- 8
set local request.jwt.claim.sub to :'rev';
select throws_ok($$select public.steward_set_node_vocabulary('pdbff', '{"kind":"role","label":"Wizard"}'::jsonb)$$, '23514', null, 'a role maps to a common role'); -- 9

select * from finish();
rollback;
