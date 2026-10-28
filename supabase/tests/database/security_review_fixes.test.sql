-- pgTAP tests for the security review fixes (supabase/migrations/20261029190000_security_review_fixes.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(8);

\set rev   'ec000000-0000-4000-8000-0000000000a1'
\set gr    'ec000000-0000-4000-8000-0000000000a2'
\set st_a  'ec000000-0000-4000-8000-0000000000a3'
\set ana   'ec000000-0000-4000-8000-0000000000a4'
\set bob   'ec000000-0000-4000-8000-0000000000a5'
\set p_ana 'ec000000-0000-4000-8000-000000000010'
\set org_a 'ec000000-0000-4000-8000-000000000020'
\set org_b 'ec000000-0000-4000-8000-000000000021'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'rev', 'authenticated', 'authenticated', 's-rev@example.test', 'x', now(), now(), now()),
       (:'gr',  'authenticated', 'authenticated', 's-gr@example.test',  'x', now(), now(), now()),
       (:'st_a','authenticated', 'authenticated', 's-sta@example.test', 'x', now(), now(), now()),
       (:'ana', 'authenticated', 'authenticated', 's-ana@example.test', 'x', now(), now(), now()),
       (:'bob', 'authenticated', 'authenticated', 's-bob@example.test', 'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'rev', 'active', :'gr');
insert into public.people (id, given_name, family_name, display_name, source_type) values (:'p_ana', 'Ana', 'Sec', 'Ana Sec', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Sec Station A', 'field_station', 'active', 'admin_entered', 'provisional'),
       (:'org_b', 'Sec Station B', 'field_station', 'active', 'admin_entered', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id) values (:'org_b', :'st_a', :'rev');
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana');
alter table public.user_person_links enable trigger user;
insert into public.record_candidates (kind, origin, about_person_id, organization_id, capacity, source_note, evidence_paths, proposed_by_user_id, source_type)
values ('participation', 'form', :'p_ana', :'org_a', 'researcher', 'roster', array[:'ana' || '/1-roster.pdf'], :'ana', 'self_reported');

set local role authenticated;

-- 1-2: evidence files.
set local request.jwt.claim.sub to :'st_a';
select is(public.evidence_file_visible(:'ana' || '/1-roster.pdf'), false, 'a steward of another institution cannot open the evidence'); -- 1
set local request.jwt.claim.sub to :'rev';
select is(public.evidence_file_visible(:'ana' || '/1-roster.pdf'), true, 'a platform reviewer can'); -- 2

-- 3-4: topics.
set local request.jwt.claim.sub to :'st_a';
select throws_ok(format('select public.add_person_topics(%L, %L::jsonb, %L)', :'p_ana', '[{"label":"Ants"}]', 'steward'), '42501', null,
  'stewards act only on people in their scope'); -- 3
set local request.jwt.claim.sub to :'rev';
select public.add_person_topics(:'p_ana', '[{"label":"Ants"}]'::jsonb, 'steward');
reset role;
create temporary table tp on commit drop as select id from public.person_topics where person_id = :'p_ana' limit 1;
grant select on tp to authenticated;
set local role authenticated;
select throws_ok(format('select public.decide_person_topic(%L, true)', (select id from tp)), '42501', null,
  'nobody confirms their own suggestion'); -- 4

-- 5: links after acceptance are not the proposer's to add.
set local request.jwt.claim.sub to :'ana';
create temporary table h on commit drop as select public.propose_heritage_item('{"kind":"photo","title":"Camp photo","sourceNote":"Album"}'::jsonb) as id;
grant select on h to authenticated;
set local request.jwt.claim.sub to :'rev';
select public.steward_decide_heritage_item((select id from h), 'accept');
set local request.jwt.claim.sub to :'ana';
select throws_ok(format('select public.link_heritage_item(%L, %L::jsonb)', (select id from h), jsonb_build_object('organizationId', :'org_b')), '42501', null,
  'accepted items are not relinked by their proposer'); -- 5

-- 6: community material needs a community organisation.
set local request.jwt.claim.sub to :'st_a';
select throws_ok(format($$select public.propose_heritage_item('{"kind":"photo","title":"x y","visibility":"community","communityOrganizationId":"%s","sourceNote":"s"}'::jsonb)$$, :'org_b'),
  '23514', null, 'a field station is not a community'); -- 6

-- 7: limiting revelations is honoured in the database.
set local request.jwt.claim.sub to :'rev';
select public.link_heritage_item((select id from h), jsonb_build_object('personId', :'p_ana', 'role', 'pictured'));
set local request.jwt.claim.sub to :'ana';
select public.set_my_privacy(true);
set local request.jwt.claim.sub to :'bob';
select is(jsonb_array_length(public.heritage_for(:'p_ana')), 0, 'others do not get what she limited'); -- 7

-- 8: calls are withdrawn only by who added them or a platform reviewer.
set local request.jwt.claim.sub to :'rev';
create temporary table fc on commit drop as select public.save_funding_call('{"title":"A call","funder":"FF","url":"https://x.org/c","themes":["ants"]}'::jsonb) as id;
grant select on fc to authenticated;
set local request.jwt.claim.sub to :'st_a';
select throws_ok(format('select public.steward_set_funding_call_status(%L, %L)', (select id from fc), 'withdrawn'), '42501', null,
  'another steward cannot withdraw it'); -- 8

select * from finish();
rollback;
