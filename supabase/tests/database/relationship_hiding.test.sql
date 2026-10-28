-- pgTAP tests for hiding a link from one's own page
-- (supabase/migrations/20261028110000_add_relationship_hiding.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(8);

\set ana   'c1000000-0000-4000-8000-0000000000a1'
\set other 'c1000000-0000-4000-8000-0000000000a2'
\set p_ana 'c1000000-0000-4000-8000-000000000010'
\set p_ben 'c1000000-0000-4000-8000-000000000011'
\set rel   'c1000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'ana', 'authenticated', 'authenticated', 'hide-ana@example.test', 'x', now(), now(), now()),
       (:'other', 'authenticated', 'authenticated', 'hide-other@example.test', 'x', now(), now(), now());
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p_ana', 'Ana', 'Hide', 'Ana Hide', 'imported_historical'),
       (:'p_ben', 'Ben', 'Seen', 'Ben Seen', 'imported_historical');
insert into public.relationships (id, kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type)
select :'rel', k.key, k.is_directional, :'p_ana', :'p_ben', true, 'imported_historical'
  from public.relationship_kinds k where not k.is_directional order by k.sort_order limit 1;
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana');
alter table public.user_person_links enable trigger user;

set local role authenticated;

set local request.jwt.claim.sub to :'other';
select throws_ok(format('select public.set_relationship_hidden(%L, true)', :'rel'), '42501', null,
  'someone else cannot hide the link'); -- 1

set local request.jwt.claim.sub to :'ana';
select ok(((public.get_person_relationships(:'p_ana') -> 'relationships' -> 0 ->> 'canHide')::boolean),
  'the person can hide links on their own page'); -- 2
select lives_ok(format('select public.set_relationship_hidden(%L, true)', :'rel'), 'Ana hides the link'); -- 3
select ok(((public.get_person_relationships(:'p_ana') -> 'relationships' -> 0 ->> 'hidden')::boolean),
  'Ana still sees it on her page, marked hidden'); -- 4

set local request.jwt.claim.sub to :'other';
select is(jsonb_array_length(public.get_person_relationships(:'p_ana') -> 'relationships'), 0,
  'others no longer see it on Ana''s page'); -- 5
select is(jsonb_array_length(public.get_person_relationships(:'p_ben') -> 'relationships'), 1,
  'it still shows on Ben''s page'); -- 6
reset role;
select ok(exists (select 1 from public.relationships where id = :'rel'), 'the record itself is kept'); -- 7
set local role authenticated;

set local request.jwt.claim.sub to :'ana';
select public.set_relationship_hidden(:'rel', false);
set local request.jwt.claim.sub to :'other';
select is(jsonb_array_length(public.get_person_relationships(:'p_ana') -> 'relationships'), 1,
  'bringing it back shows it again'); -- 8

select * from finish();
rollback;
