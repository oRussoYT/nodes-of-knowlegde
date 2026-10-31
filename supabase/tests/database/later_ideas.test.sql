-- pgTAP tests for the "Depois" ideas (supabase/migrations/20261031120000_add_later_ideas.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(20);

\set rev   'ee000000-0000-4000-8000-0000000000a1'
\set gr    'ee000000-0000-4000-8000-0000000000a2'
\set auth  'ee000000-0000-4000-8000-0000000000a3'
\set non   'ee000000-0000-4000-8000-0000000000a4'
\set subj  'ee000000-0000-4000-8000-0000000000a5'
\set p     'ee000000-0000-4000-8000-000000000010'
\set q     'ee000000-0000-4000-8000-000000000011'
\set r     'ee000000-0000-4000-8000-000000000012'
\set org   'ee000000-0000-4000-8000-000000000020'
\set org2  'ee000000-0000-4000-8000-000000000021'
\set w     'ee000000-0000-4000-8000-000000000030'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'rev',  'authenticated', 'authenticated', 'li-rev@example.test',  'x', now(), now(), now()),
       (:'gr',   'authenticated', 'authenticated', 'li-gr@example.test',   'x', now(), now(), now()),
       (:'auth', 'authenticated', 'authenticated', 'li-au@example.test',   'x', now(), now(), now()),
       (:'non',  'authenticated', 'authenticated', 'li-no@example.test',   'x', now(), now(), now()),
       (:'subj', 'authenticated', 'authenticated', 'li-su@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'rev', 'active', :'gr');
insert into public.member_profiles (user_id, display_name) values (:'auth', 'Ana Autora');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p', 'Paula', 'Primeira', 'Paula Primeira', 'imported_historical'),
       (:'q', 'Quinn', 'Segundo', 'Quinn Segundo', 'imported_historical'),
       (:'r', 'Rosa', 'Terceira', 'Rosa Terceira', 'imported_historical');
insert into public.user_person_links (user_id, person_id, status) values (:'subj', :'p', 'active');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Shared Station', 'field_station', 'active', 'admin_entered', 'provisional'),
       (:'org2', 'Elsewhere Institute', 'research_institute', 'active', 'admin_entered', 'provisional');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'p', :'org', 'researcher', '2000-01-01', 'year', '2010-01-01', 'year', 'imported_historical'),
       (:'q', :'org', 'student', '2005-01-01', 'year', '2015-01-01', 'year', 'imported_historical'),
       (:'r', :'org2', 'researcher', '2000-01-01', 'year', null, null, 'imported_historical');
insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, source_type)
values ('mentorship', true, :'p', :'q', '2005-01-01', 'year', 'imported_historical');
insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type)
values (:'w', 'A recent shared paper', 'ecological_interpretation', (current_date - interval '1 year')::date, 'year', 'imported_historical');
insert into public.person_contributions (contribution_id, person_id, capacity, source_type)
values (:'w', :'p', 'field_observation', 'imported_historical'), (:'w', :'q', 'field_observation', 'imported_historical');

-- Interpretations
set local role anon;
select throws_ok(format($$select public.write_interpretation('person', %L, 'A long enough reading of the record.')$$, :'p'),
                 '42501', null, 'visitors do not write interpretations'); -- 1

set local role authenticated;
set local request.jwt.claim.sub to :'non';
select throws_ok(format($$select public.write_interpretation('person', %L, 'A long enough reading of the record.')$$, :'p'),
                 '22023', null, 'an interpretation is signed: no name, no interpretation'); -- 2

set local request.jwt.claim.sub to :'auth';
create temporary table i on commit drop as
  select public.write_interpretation('person', :'p', 'Her years at the station shaped a whole generation.', 'Oral history, 2019') as id;
grant select on i to authenticated;
select isnt((select id from i), null, 'a named member writes one'); -- 3
select is((public.interpretations_for('person', :'p') -> 0 ->> 'status'), 'proposed', 'the author sees it waiting'); -- 4
select throws_ok(format('select public.steward_decide_interpretation(%L, true)', (select id from i)), '42501', null,
                 'the author does not publish it'); -- 5

set local request.jwt.claim.sub to :'non';
select is(jsonb_array_length(public.interpretations_for('person', :'p')), 0, 'others do not see it before review'); -- 6

set local request.jwt.claim.sub to :'rev';
select is((public.interpretations_for('person', :'p') -> 0 ->> 'canDecide')::boolean, true, 'a steward can decide it'); -- 7
select lives_ok(format('select public.steward_decide_interpretation(%L, true)', (select id from i)), 'a steward publishes it'); -- 8

set local request.jwt.claim.sub to :'non';
select is((public.interpretations_for('person', :'p') -> 0 ->> 'author'), 'Ana Autora', 'then everyone sees it, signed'); -- 9
select throws_ok(format('select public.hide_interpretation_about_me(%L)', (select id from i)), '42501', null,
                 'only the person it is about hides it'); -- 10

set local request.jwt.claim.sub to :'subj';
select is((public.interpretations_for('person', :'p') -> 0 ->> 'canHide')::boolean, true, 'she can hide it'); -- 11
select lives_ok(format('select public.hide_interpretation_about_me(%L)', (select id from i)), 'and does'); -- 12
set local request.jwt.claim.sub to :'non';
select is(jsonb_array_length(public.interpretations_for('person', :'p')), 0, 'it is gone from her page'); -- 13

-- Declaring ties
set local request.jwt.claim.sub to :'subj';
select isnt(public.save_support_item('{"title":"Fragment dynamics II","funder":"NSF","status":"pending","startYear":"2027"}'::jsonb), null,
            'she lists a pending proposal'); -- 14
select is((public.my_support_draft() -> 'advisees' -> 0 ->> 'name'), 'Quinn Segundo', 'the draft knows her advisee'); -- 15
select is((public.my_support_draft() -> 'coauthors' -> 0 ->> 'works')::int, 1, 'and her recent co-author'); -- 16
set local request.jwt.claim.sub to :'rev';
select is((select count(*)::int from public.support_items), 0, 'nobody else reads her support, not even a reviewer'); -- 17

-- Conflict screening
set local request.jwt.claim.sub to :'non';
create temporary table c on commit drop as select public.conflict_check(array[:'p', :'q', :'r']::uuid[]) as r;
grant select on c to authenticated;
select is(jsonb_array_length((select r from c) -> 'pairs'), 1, 'only the pair with documented ties appears'); -- 18
select is(((select r from c) -> 'pairs' -> 0 -> 'sharedPlaces' -> 0 ->> 'fromYear')::int * 10000
          + ((select r from c) -> 'pairs' -> 0 -> 'sharedPlaces' -> 0 ->> 'toYear')::int, 20052010,
          'with the bond, the shared work and the years they overlapped (2005-2010)'); -- 19

-- Public API
set local role anon;
select ok(exists (select 1 from jsonb_array_elements(public.public_api_nodes()) n where n ->> 'slug' = 'pdbff'),
          'the public API lists the Nodes'); -- 20

select * from finish();
rollback;
