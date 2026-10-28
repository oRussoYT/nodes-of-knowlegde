-- pgTAP tests for "everything has a history"
-- (supabase/migrations/20261029100000_add_heritage_items.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(18);

\set reviewer 'e3000000-0000-4000-8000-0000000000a1'
\set granter  'e3000000-0000-4000-8000-0000000000a2'
\set ana      'e3000000-0000-4000-8000-0000000000a3'
\set bob      'e3000000-0000-4000-8000-0000000000a4'
\set p_ana    'e3000000-0000-4000-8000-000000000010'
\set org      'e3000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'h-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'h-granter@example.test',  'x', now(), now(), now()),
  (:'ana',      'authenticated', 'authenticated', 'h-ana@example.test',      'x', now(), now(), now()),
  (:'bob',      'authenticated', 'authenticated', 'h-bob@example.test',      'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p_ana', 'Ana', 'Field', 'Ana Field', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Camp 41', 'field_station', 'active', 'admin_entered', 'provisional');

set local role authenticated;
set local request.jwt.claim.sub to :'ana';

-- 1-3: a member proposes a photo, linked to a person and a station.
create temporary table h1 on commit drop as
select public.propose_heritage_item(jsonb_build_object(
  'kind', 'photo', 'title', 'Camp 41 kitchen, 1987', 'startYear', 1987, 'place', 'Camp 41',
  'latitude', -2.4, 'longitude', -59.9, 'organizationId', :'org', 'filePath', :'ana' || '/1-kitchen.jpg',
  'sourceNote', 'Personal album of Ana Field',
  'links', jsonb_build_array(jsonb_build_object('personId', :'p_ana', 'role', 'pictured')))) as id;
grant select on h1 to authenticated;
select ok((select id from h1) is not null, 'a member proposes a photo'); -- 1
select is(public.get_heritage_item((select id from h1)) ->> 'reviewStatus', 'proposed', 'a member''s addition is a proposal'); -- 2
select is(jsonb_array_length(public.get_heritage_item((select id from h1)) -> 'links'), 1, 'linked to the person'); -- 3

-- 4-7: rules.
select throws_ok($$select public.propose_heritage_item('{"kind":"photo","title":"No source","sourceNote":" "}'::jsonb)$$,
  '23514', null, 'every item says what documents it'); -- 4
select throws_ok(format($$select public.propose_heritage_item('{"kind":"photo","title":"Not mine","sourceNote":"x","filePath":"%s/a.jpg"}'::jsonb)$$, :'bob'),
  '42501', null, 'the file must be the proposer''s own'); -- 5
select throws_ok($$select public.propose_heritage_item('{"kind":"spaceship","title":"Bad kind","sourceNote":"x"}'::jsonb)$$,
  '23503', null, 'kinds come from the vocabulary'); -- 6
select throws_ok($$select public.propose_heritage_item('{"kind":"map","title":"Bad years","sourceNote":"x","startYear":1990,"endYear":1980}'::jsonb)$$,
  '23514', null, 'years in order'); -- 7

-- 8-9: another member does not see a proposal; the review is for stewards.
set local request.jwt.claim.sub to :'bob';
select is(public.get_heritage_item((select id from h1)), null, 'proposals are not shown to other members'); -- 8
select throws_ok(format('select public.steward_decide_heritage_item(%L, %L)', (select id from h1), 'accept'), '42501', null, 'members cannot decide'); -- 9

-- 10-13: a steward accepts; it is provisional and visible; confirm afterwards.
set local request.jwt.claim.sub to :'reviewer';
select ok(jsonb_array_length(public.steward_list_heritage_proposals()) >= 1, 'the steward sees proposals'); -- 10
select lives_ok(format('select public.steward_decide_heritage_item(%L, %L)', (select id from h1), 'accept'), 'the steward accepts'); -- 11
set local request.jwt.claim.sub to :'bob';
select is(public.get_heritage_item((select id from h1)) ->> 'verificationStatus', 'provisional', 'accepted is still provisional'); -- 12
select is((public.heritage_for(:'p_ana') -> 0 ->> 'role'), 'pictured', 'the person''s page lists it, with the role'); -- 13

-- 14-15: a steward adds directly (accepted) and a rejection needs a reason.
set local request.jwt.claim.sub to :'reviewer';
create temporary table h2 on commit drop as
select public.propose_heritage_item('{"kind":"expedition","title":"Rio Negro 1991","startYear":1991,"sourceNote":"Field book"}'::jsonb) as id;
grant select on h2 to authenticated;
select is(public.get_heritage_item((select id from h2)) ->> 'reviewStatus', 'accepted', 'a steward''s addition is accepted at once'); -- 14
select throws_ok(format('select public.steward_decide_heritage_item(%L, %L)', (select id from h2), 'reject'), '42501', null,
  'nobody reviews their own'); -- 15
select lives_ok(format('select public.steward_decide_heritage_item(%L, %L)', (select id from h1), 'confirm'), 'a steward confirms'); -- 16

-- 17-18: restricted items stay with the proposer and stewards.
set local request.jwt.claim.sub to :'ana';
create temporary table h3 on commit drop as
select public.propose_heritage_item('{"kind":"oral_history","title":"Interview with an elder","visibility":"restricted","sourceNote":"Recorded 2019"}'::jsonb) as id;
grant select on h3 to authenticated;
set local request.jwt.claim.sub to :'reviewer';
select public.steward_decide_heritage_item((select id from h3), 'accept');
set local request.jwt.claim.sub to :'bob';
select is(public.get_heritage_item((select id from h3)), null, 'restricted material is not shown to every member'); -- 17
select ok(exists (select 1 from jsonb_array_elements(public.heritage_counts()) c where c ->> 'kind' = 'photo' and (c ->> 'count')::int >= 1),
  'counts by kind'); -- 18

select * from finish();
rollback;
