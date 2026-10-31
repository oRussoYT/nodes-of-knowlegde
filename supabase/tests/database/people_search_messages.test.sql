-- pgTAP tests for people search and member messages
-- (supabase/migrations/20261023110000_add_people_search_and_messages.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

-- Self-contained: set aside the real records imported from OpenAlex (rolled back at the end).
delete from public.people where id in (select person_id from public.person_external_ids where source = 'openalex');
delete from public.organizations where source_type = 'imported_historical' and id in (select subject_id from public.external_record_sources where subject_type = 'organization');
delete from public.contributions where id in (select subject_id from public.external_record_sources where subject_type = 'contribution');
delete from public.external_record_sources;

select plan(17);

\set ana    'af000000-0000-4000-8000-0000000000a1'
\set ben    'af000000-0000-4000-8000-0000000000a2'
\set cid    'af000000-0000-4000-8000-0000000000a3'
\set p_ana  'af000000-0000-4000-8000-000000000010'
\set p_ben  'af000000-0000-4000-8000-000000000011'
\set p_old  'af000000-0000-4000-8000-000000000012'
\set org    'af000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'ana', 'authenticated', 'authenticated', 'msg-ana@example.test', 'x', now(), now(), now()),
  (:'ben', 'authenticated', 'authenticated', 'msg-ben@example.test', 'x', now(), now(), now()),
  (:'cid', 'authenticated', 'authenticated', 'msg-cid@example.test', 'x', now(), now(), now());
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p_ana', 'Ana', 'Silva', 'Ana Silva', 'imported_historical'),
       (:'p_ben', 'Bén', 'Araújo', 'Bén Araújo', 'imported_historical'),
       (:'p_old', 'Olga', 'Field', 'Olga Field', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Instituto Nacional de Pesquisas da Amazônia', 'research_institute', 'active', 'imported_historical', 'provisional');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'p_old', :'org', 'researcher', '1985-01-01', 'year', '1992-01-01', 'year', 'imported_historical');
-- Ana and Ben have accounts linked to their records; only Ben accepts messages.
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana'), (:'ben', :'p_ben');
alter table public.user_person_links enable trigger user;
insert into public.member_profiles (user_id, display_name, accepts_messages) values (:'ana', 'Ana S.', false), (:'ben', 'Ben A.', true);

set local role authenticated;
set local request.jwt.claim.sub to :'cid';

select is(jsonb_array_length(public.search_people('araujo')), 1, 'search ignores accents and case'); -- 1
select is(public.search_people('amazonia') -> 0 ->> 'displayName', 'Olga Field', 'search finds people through their institution'); -- 2
select is(public.search_people('olga') -> 0 -> 'lastInstitution' ->> 'toYear', '1992', 'results show where the person was last documented'); -- 3
select is((select array_agg(e ->> 'displayName' order by o) from jsonb_array_elements(public.search_people(null)) with ordinality t(e, o)
            where e ->> 'id' in (:'p_ana', :'p_ben', :'p_old')),
  array['Ana Silva', 'Bén Araújo', 'Olga Field'], 'with no query everyone is listed alphabetically'); -- 4
select ok((public.search_people('ben') -> 0 ->> 'acceptsMessages')::boolean, 'results say who can be messaged'); -- 5

select ok((public.person_contact_options(:'p_ben') ->> 'canMessage')::boolean, 'Ben can be messaged'); -- 6
select ok(not (public.person_contact_options(:'p_ana') ->> 'canMessage')::boolean, 'Ana did not opt in'); -- 7
select ok(not (public.person_contact_options(:'p_old') ->> 'hasAccount')::boolean, 'Olga has no account'); -- 8

select lives_ok(format($$select public.send_message_to_person(%L, 'Hello Ben, we were both at INPA.')$$, :'p_ben'),
  'a member messages someone who accepts messages'); -- 9
select throws_ok(format($$select public.send_message_to_person(%L, 'Hello Ana')$$, :'p_ana'),
  '42501', null, 'cannot message someone who did not opt in'); -- 10
select throws_ok(format($$select public.send_message_to_person(%L, 'Hello Olga')$$, :'p_old'),
  '42501', null, 'cannot message a record without an account'); -- 11
select throws_ok(format($$select public.send_message_to_person(%L, '   ')$$, :'p_ben'),
  '22023', null, 'an empty message is refused'); -- 12

select ok(not exists (select 1 from public.member_messages where body like '%' || 'msg-' || '%'),
  'no email address appears in messages'); -- 13

set local request.jwt.claim.sub to :'ben';
select is(public.unread_message_count(), 1, 'Ben has one unread message'); -- 14
select is(public.my_messages() -> 0 ->> 'otherLabel', 'A member', 'the sender is shown by name, never by email'); -- 15
select lives_ok(format($$select public.reply_to_message(%L, 'Hi! Yes, 1999.')$$,
  (select id from public.member_messages where recipient_user_id = :'ben' limit 1)),
  'Ben replies even though Cid does not accept messages'); -- 16

set local request.jwt.claim.sub to :'ana';
select is((select count(*)::int from public.member_messages), 0, 'others cannot read the conversation'); -- 17

select * from finish();
rollback;
