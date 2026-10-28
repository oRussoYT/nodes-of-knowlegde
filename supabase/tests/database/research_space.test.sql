-- pgTAP tests for the private research space (supabase/migrations/20261029160000_add_research_space.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(9);

\set ana      'e9000000-0000-4000-8000-0000000000a1'
\set bob      'e9000000-0000-4000-8000-0000000000a2'
\set reviewer 'e9000000-0000-4000-8000-0000000000a3'
\set granter  'e9000000-0000-4000-8000-0000000000a4'
\set p1       'e9000000-0000-4000-8000-000000000010'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'ana', 'authenticated', 'authenticated', 'r-ana@example.test', 'x', now(), now(), now()),
       (:'bob', 'authenticated', 'authenticated', 'r-bob@example.test', 'x', now(), now(), now()),
       (:'reviewer', 'authenticated', 'authenticated', 'r-rev@example.test', 'x', now(), now(), now()),
       (:'granter', 'authenticated', 'authenticated', 'r-gr@example.test', 'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type) values (:'p1', 'Elder', 'Voice', 'Elder Voice', 'imported_historical');

set local role authenticated;
set local request.jwt.claim.sub to :'ana';
create temporary table n on commit drop as
select public.save_research_note(jsonb_build_object('kind', 'hypothesis', 'title', 'Edge birds left first',
  'body', 'Maybe the understory birds left the 1 ha fragments before 1985.', 'personIds', jsonb_build_array(:'p1'))) as id;
grant select on n to authenticated;

select is(jsonb_array_length(public.my_research_notes()), 1, 'a member keeps a private note'); -- 1
select is((public.get_my_research_note((select id from n)) -> 'people' -> 0 ->> 'displayName'), 'Elder Voice', 'linked to a person'); -- 2
select is(jsonb_array_length(public.my_research_notes('understory')), 1, 'notes can be searched'); -- 3
select throws_ok($$select public.save_research_note('{"title":"bad","filePath":"someone-else/x.pdf"}'::jsonb)$$, '23514', null, 'files must be in her own folder'); -- 4

set local request.jwt.claim.sub to :'bob';
select is(jsonb_array_length(public.my_research_notes()), 0, 'another member sees nothing'); -- 5
select is(public.get_my_research_note((select id from n)), null, 'not even by id'); -- 6
set local request.jwt.claim.sub to :'reviewer';
select is(public.get_my_research_note((select id from n)), null, 'and stewards cannot read it either'); -- 7
select policies_are('public', 'research_notes', array['research_notes_owner'], 'the table has only the owner policy'); -- 8

-- 9: sending for review links the note to a proposal of hers only.
set local request.jwt.claim.sub to :'ana';
create temporary table h on commit drop as
select public.propose_heritage_item('{"kind":"document","title":"Edge birds note","sourceNote":"My field notes"}'::jsonb) as id;
grant select on h to authenticated;
select public.mark_research_note_submitted((select id from n), (select id from h));
select is(public.get_my_research_note((select id from n)) ->> 'submittedStatus', 'proposed', 'the note shows its proposal waiting for review'); -- 9

select * from finish();
rollback;
