-- pgTAP tests for connections by topic
-- (supabase/migrations/20261029130000_add_topic_connections.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(11);

\set ana  'e6000000-0000-4000-8000-0000000000a1'
\set bob  'e6000000-0000-4000-8000-0000000000a2'
\set p_ana 'e6000000-0000-4000-8000-000000000010'
\set p_bob 'e6000000-0000-4000-8000-000000000011'
\set p_cy  'e6000000-0000-4000-8000-000000000012'
\set p_di  'e6000000-0000-4000-8000-000000000013'
\set org  'e6000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'ana', 'authenticated', 'authenticated', 't-ana@example.test', 'x', now(), now(), now()),
       (:'bob', 'authenticated', 'authenticated', 't-bob@example.test', 'x', now(), now(), now());
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p_ana', 'Ana', 'Topic', 'Ana Topic', 'imported_historical'),
       (:'p_bob', 'Bob', 'Topic', 'Bob Topic', 'imported_historical'),
       (:'p_cy',  'Cy',  'Topic', 'Cy Topic',  'imported_historical'),
       (:'p_di',  'Di',  'Topic', 'Di Topic',  'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Topic Camp', 'field_station', 'active', 'admin_entered', 'provisional');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'p_ana', :'org', 'researcher', true, 'imported_historical'), (:'p_cy', :'org', 'researcher', true, 'imported_historical');
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana'), (:'bob', :'p_bob');
alter table public.user_person_links enable trigger user;
-- Cy (inside) and Di (outside) state the same theme; Di also a proposed one.
insert into public.person_topics (person_id, kind, label, topic_key, source, status)
values (:'p_cy', 'theme', 'Forest fragmentation', public.topic_key('Forest fragmentation'), 'person', 'confirmed'),
       (:'p_di', 'theme', 'forest  FRAGMENTATION', public.topic_key('forest  FRAGMENTATION'), 'person', 'confirmed'),
       (:'p_di', 'organism', 'Bearded saki', public.topic_key('Bearded saki'), 'ai', 'proposed');

set local role authenticated;
set local request.jwt.claim.sub to :'ana';

select is(public.add_person_topics(:'p_ana', '[{"kind":"theme","label":"Forest fragmentation"},{"kind":"organism","label":"Bearded saki"},{"label":"x"}]'::jsonb), 2,
  'a member states her own topics (too-short ones ignored)'); -- 1
select is((public.person_topics_json(:'p_ana') -> 0 ->> 'status'), 'confirmed', 'her own topics are confirmed'); -- 2
select throws_ok(format('select public.add_person_topics(%L, %L::jsonb)', :'p_bob', '[{"label":"Ants"}]'), '42501', null,
  'nobody adds topics for someone else'); -- 3

create temporary table c on commit drop as select public.my_topic_connections() as r;
grant select on c to authenticated;
select is(jsonb_array_length((select r from c) -> 'connections'), 2, 'two people share a confirmed topic'); -- 4
select is(((select r from c) -> 'connections' -> 0 ->> 'displayName'), 'Cy Topic', 'people who share an institution come first'); -- 5
select is(((select r from c) -> 'connections' -> 0 ->> 'inside')::boolean, true, 'Cy is inside'); -- 6
select is(((select r from c) -> 'connections' -> 1 ->> 'inside')::boolean, false, 'Di is outside'); -- 7
select is(jsonb_array_length((select r from c) -> 'connections' -> 1 -> 'shared'), 1, 'a proposed topic does not connect'); -- 8
select ok(((select r from c) -> 'connections' -> 1 -> 'shared' -> 0 ->> 'label') = 'Forest fragmentation', 'the reason is the shared theme'); -- 9

-- 10: opted-out people are never offered.
reset role;
insert into public.suggestion_opt_outs (person_id) values (:'p_di');
set local role authenticated;
select is(jsonb_array_length(public.my_topic_connections() -> 'connections'), 1, 'people who opted out are not offered'); -- 10

-- 11: a proposed topic is not visible to other members.
set local request.jwt.claim.sub to :'bob';
select is(jsonb_array_length(public.person_topics_json(:'p_di')), 1, 'others see only confirmed topics'); -- 11

select * from finish();
rollback;
