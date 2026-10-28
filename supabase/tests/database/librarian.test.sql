-- pgTAP tests for the librarian's sources (supabase/migrations/20261029150000_add_librarian.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(7);

\set ana  'e8000000-0000-4000-8000-0000000000a1'
\set p1   'e8000000-0000-4000-8000-000000000010'
\set org  'e8000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'ana', 'authenticated', 'authenticated', 'l-ana@example.test', 'x', now(), now(), now());
insert into public.people (id, given_name, family_name, display_name, source_type) values (:'p1', 'Zélia', 'Quillmark', 'Zélia Quillmark', 'imported_historical');
insert into public.organizations (id, name, short_name, organization_type, status, source_type, verification_status)
values (:'org', 'Quillmark Field Station', 'QFS', 'field_station', 'active', 'admin_entered', 'provisional');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'p1', :'org', 'field_assistant', '1988-01-01', 'year', '1991-01-01', 'year', 'imported_historical');
insert into public.heritage_items (kind, title, source_note, review_status, visibility) values ('photo', 'Quillmark camp, 1989', 'Album', 'accepted', 'members'),
  ('oral_history', 'Quillmark secret interview', 'Tape', 'accepted', 'restricted');

set local role anon;
select throws_ok($$select public.librarian_sources(array['quillmark'])$$, '42501', null, 'not for visitors'); -- 1

set local role authenticated;
set local request.jwt.claim.sub to :'ana';
create temporary table s on commit drop as select public.librarian_sources(array['QUILLMARK', 'x']) as r;
grant select on s to authenticated;
select is((select count(*)::int from jsonb_array_elements((select r from s)) e where e ->> 'type' = 'person'), 1, 'finds the person, accents and case aside'); -- 2
select ok((select e ->> 'text' from jsonb_array_elements((select r from s)) e where e ->> 'type' = 'person') like '%Field assistant at Quillmark Field Station (1988–1991)%',
  'with her periods as a factual line'); -- 3
select is((select e ->> 'url' from jsonb_array_elements((select r from s)) e where e ->> 'type' = 'institution'), '/institutions/' || :'org', 'each source links to its page'); -- 4
select is((select count(*)::int from jsonb_array_elements((select r from s)) e where e ->> 'type' = 'history'), 1, 'restricted material is not a source'); -- 5
select is(jsonb_array_length(public.librarian_sources(array['zz'])), 0, 'short words are ignored'); -- 6
select is((public.librarian_gaps(:'p1') ->> 'periods')::int, 1, 'gaps: what is there and what is missing'); -- 7

select * from finish();
rollback;
