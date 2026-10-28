-- pgTAP tests for privacy and the network (supabase/migrations/20261029170000_add_privacy_and_network.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(15);

\set reviewer 'ea000000-0000-4000-8000-0000000000a1'
\set granter  'ea000000-0000-4000-8000-0000000000a2'
\set ana      'ea000000-0000-4000-8000-0000000000a3'
\set elder    'ea000000-0000-4000-8000-0000000000a4'
\set bob      'ea000000-0000-4000-8000-0000000000a5'
\set p_ana    'ea000000-0000-4000-8000-000000000010'
\set comm     'ea000000-0000-4000-8000-000000000020'
\set camp     'ea000000-0000-4000-8000-000000000021'
\set other    'ea000000-0000-4000-8000-000000000022'
\set n1       'ea000000-0000-4000-8000-000000000030'
\set n2       'ea000000-0000-4000-8000-000000000031'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reviewer', 'authenticated', 'authenticated', 'pn-rev@example.test', 'x', now(), now(), now()),
       (:'granter',  'authenticated', 'authenticated', 'pn-gr@example.test',  'x', now(), now(), now()),
       (:'ana',      'authenticated', 'authenticated', 'pn-ana@example.test', 'x', now(), now(), now()),
       (:'elder',    'authenticated', 'authenticated', 'pn-el@example.test',  'x', now(), now(), now()),
       (:'bob',      'authenticated', 'authenticated', 'pn-bob@example.test', 'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type) values (:'p_ana', 'Ana', 'Private', 'Ana Private', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'comm', 'Comunidade Exemplo', 'indigenous_organization', 'active', 'admin_entered', 'provisional'),
       (:'camp', 'Net Camp', 'field_station', 'active', 'admin_entered', 'provisional'),
       (:'other', 'Net Other', 'field_station', 'active', 'admin_entered', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id) values (:'comm', :'elder', :'reviewer');
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana');
alter table public.user_person_links enable trigger user;
insert into public.nodes (id, slug, name, short_name, plan, status) values (:'n1', 'net-one', 'Net One', 'N1', 'pro_bono', 'active'), (:'n2', 'net-two', 'Net Two', 'N2', 'paid', 'active');
insert into public.node_organizations (node_id, organization_id, role) values (:'n1', :'camp', 'core'), (:'n2', :'other', 'core');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'p_ana', :'camp', 'researcher', true, 'imported_historical'), (:'p_ana', :'other', 'researcher', true, 'imported_historical');
insert into public.node_members (node_id, user_id) values (:'n1', :'ana');

set local role authenticated;

-- 1-3: consent.
set local request.jwt.claim.sub to :'ana';
select lives_ok('select public.set_my_privacy(true)', 'a person limits what the record reveals'); -- 1
set local request.jwt.claim.sub to :'bob';
select is(public.person_privacy_view(:'p_ana') ->> 'limitRevelations', 'true', 'others see that she limited it'); -- 2
reset role;
select ok(exists (select 1 from public.suggestion_opt_outs where person_id = :'p_ana'), 'and she leaves suggestions'); -- 3
set local role authenticated;

-- 4-9: community material.
set local request.jwt.claim.sub to :'ana';
select throws_ok($$select public.propose_heritage_item('{"kind":"oral_history","title":"Song","visibility":"community","sourceNote":"Recorded"}'::jsonb)$$,
  '23514', null, 'community material needs its community'); -- 4
create temporary table ci on commit drop as
select public.propose_heritage_item(jsonb_build_object('kind', 'oral_history', 'title', 'Origin story', 'visibility', 'community',
  'communityOrganizationId', :'comm', 'careLabels', jsonb_build_array('tk_secret_sacred'), 'sourceNote', 'Told by an elder, 2019')) as id;
grant select on ci to authenticated;
select is(public.get_heritage_item((select id from ci)) ->> 'reviewStatus', 'proposed', 'it waits for the community'); -- 5
set local request.jwt.claim.sub to :'reviewer';
select is(public.get_heritage_item((select id from ci)), null, 'platform reviewers do not see community material'); -- 6
select throws_ok(format('select public.steward_decide_heritage_item(%L, %L)', (select id from ci), 'accept'), '42501', null,
  'and cannot decide about it'); -- 7
set local request.jwt.claim.sub to :'elder';
select lives_ok(format('select public.steward_decide_heritage_item(%L, %L)', (select id from ci), 'accept'), 'the community''s steward decides'); -- 8
select is((public.heritage_care((select id from ci)) -> 'labels' -> 0 ->> 'key'), 'tk_secret_sacred', 'its labels travel with it'); -- 9
set local request.jwt.claim.sub to :'bob';
select is(public.get_heritage_item((select id from ci)), null, 'accepted community material stays with the community'); -- 10

-- 11-14: forum.
set local request.jwt.claim.sub to :'bob';
select throws_ok($$select public.forum_start_thread('net-one', 'Hello all', 'Hi')$$, '42501', null, 'only members of the Node write'); -- 11
select is(public.forum_threads_for('net-one'), null, 'and only they read'); -- 12
set local request.jwt.claim.sub to :'ana';
create temporary table th on commit drop as select public.forum_start_thread('net-one', 'Camp memories', 'Who remembers 1987?') as id;
grant select on th to authenticated;
select public.forum_reply((select id from th), 'I do');
select is(jsonb_array_length(public.forum_thread((select id from th)) -> 'posts'), 2, 'a conversation with a reply'); -- 13
select is(((public.forum_threads_for('net-one')) -> 0 ->> 'posts')::int, 2, 'listed with its count'); -- 14

-- 15: Nodes connected through people in common, counted.
select is((public.node_links('net-one') -> 0 ->> 'peopleInCommon')::int, 1, 'Net One and Net Two share one person'); -- 15

select * from finish();
rollback;
