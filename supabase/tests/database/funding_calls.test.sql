-- pgTAP tests for calls and grants (supabase/migrations/20261029140000_add_funding_calls.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(10);

\set reviewer 'e7000000-0000-4000-8000-0000000000a1'
\set granter  'e7000000-0000-4000-8000-0000000000a2'
\set ana      'e7000000-0000-4000-8000-0000000000a3'
\set p_ana    'e7000000-0000-4000-8000-000000000010'
\set org      'e7000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reviewer', 'authenticated', 'authenticated', 'f-reviewer@example.test', 'x', now(), now(), now()),
       (:'granter',  'authenticated', 'authenticated', 'f-granter@example.test',  'x', now(), now(), now()),
       (:'ana',      'authenticated', 'authenticated', 'f-ana@example.test',      'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type) values (:'p_ana', 'Ana', 'Fund', 'Ana Fund', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status, country_code)
values (:'org', 'Fund Camp', 'field_station', 'active', 'admin_entered', 'provisional', 'BR');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'p_ana', :'org', 'researcher', true, 'imported_historical');
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana');
alter table public.user_person_links enable trigger user;
insert into public.person_topics (person_id, kind, label, topic_key, source, status)
values (:'p_ana', 'theme', 'Forest fragmentation', public.topic_key('Forest fragmentation'), 'person', 'confirmed');

set local role authenticated;
set local request.jwt.claim.sub to :'ana';
select throws_ok($$select public.save_funding_call('{"title":"A call","funder":"FF","url":"https://x.org"}'::jsonb)$$, '42501', null, 'members cannot add calls'); -- 1

set local request.jwt.claim.sub to :'reviewer';
select lives_ok($$select public.save_funding_call('{"title":"Amazon fragments grant","funder":"CNPq","url":"https://cnpq.br/c1","closesOn":"2099-01-01","themes":["forest fragmentation","edge effects"],"eligibleCountries":["br"],"careerStages":["early_career"],"scope":"national"}'::jsonb)$$, 'a steward adds a national call'); -- 2
select public.save_funding_call('{"title":"Ocean call","funder":"EU","url":"https://ec.europa.eu/o","closesOn":"2099-02-01","themes":["coral reefs"]}'::jsonb);
select public.save_funding_call('{"title":"Old call","funder":"XF","url":"https://x.org/old","closesOn":"2000-01-01","themes":["forest fragmentation"]}'::jsonb);
select public.save_funding_call('{"title":"US only","funder":"NSF","url":"https://nsf.gov/a","closesOn":"2099-03-01","themes":["Forest Fragmentation"],"eligibleCountries":["US"]}'::jsonb);
select throws_ok($$select public.save_funding_call('{"title":"Bad link","funder":"FF","url":"ftp://x"}'::jsonb)$$, '23514', null, 'a call needs a web link'); -- 3

set local request.jwt.claim.sub to :'ana';
create temporary table fm on commit drop as select public.funding_matches_for(:'p_ana') as r;
grant select on fm to authenticated;
select is(jsonb_array_length((select r from fm)), 1, 'only open, eligible calls on her themes match'); -- 4
select is(((select r from fm) -> 0 ->> 'title'), 'Amazon fragments grant', 'the Amazon call'); -- 5
select is(((select r from fm) -> 0 -> 'reasons' -> 'sharedThemes' ->> 0), 'Forest fragmentation', 'because of the shared theme'); -- 6
select is(((select r from fm) -> 0 -> 'reasons' ->> 'country'), 'BR', 'and her country is eligible'); -- 7
select is(((select r from fm) -> 0 -> 'reasons' ->> 'careerStage'), 'early_career', 'and her career stage'); -- 8
select is(jsonb_array_length(public.list_funding_calls()), 3, 'closed calls are not listed'); -- 9
select is(jsonb_array_length(public.list_funding_calls('ocean')), 1, 'calls can be searched'); -- 10

select * from finish();
rollback;
