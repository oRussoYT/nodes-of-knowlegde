-- pgTAP tests for graduate confirmation links, public programme pages and
-- suggestions (supabase/migrations/20261017160000_add_confirmations_programmes_suggestions.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(36);

\set platform 'ec000000-0000-4000-8000-0000000000a1'
\set granter  'ec000000-0000-4000-8000-0000000000a2'
\set st_a     'ec000000-0000-4000-8000-0000000000a3'
\set st_b     'ec000000-0000-4000-8000-0000000000a4'
\set me_user  'ec000000-0000-4000-8000-0000000000a5'
\set org_a    'ec000000-0000-4000-8000-000000000010'
\set org_b    'ec000000-0000-4000-8000-000000000011'
\set me       'ec000000-0000-4000-8000-000000000001'
\set peer     'ec000000-0000-4000-8000-000000000002'
\set later    'ec000000-0000-4000-8000-000000000003'
\set mentor   'ec000000-0000-4000-8000-000000000004'
\set sibling  'ec000000-0000-4000-8000-000000000005'
\set related  'ec000000-0000-4000-8000-000000000006'
\set shy      'ec000000-0000-4000-8000-000000000007'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'cps-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'cps-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'cps-a@example.test',        'x', now(), now(), now()),
  (:'st_b',     'authenticated', 'authenticated', 'cps-b@example.test',        'x', now(), now(), now()),
  (:'me_user',  'authenticated', 'authenticated', 'cps-me@example.test',       'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Confirm University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Elsewhere College',  'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
values (:'org_a', :'st_a', :'platform'), (:'org_b', :'st_b', :'platform');

-- ---------------------------------------------------------------- A. links
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table bt on commit drop as
select public.steward_create_import_batch('Grads', :'org_a',
  '[{"givenName":"Gia","familyName":"Ronde","degree":"PhD","programme":"Ecology","graduationYear":"2014"},
    {"givenName":"Hal","familyName":"Ostin","degree":"PhD","programme":"Ecology","graduationYear":"2016"},
    {"givenName":"Ivo","familyName":"Pending","programme":"Ecology"}]'::jsonb) as id;
grant select on bt to authenticated;
create temporary table rw on commit drop as
select r ->> 'id' as id, r ->> 'familyName' as family
  from jsonb_array_elements(public.steward_import_candidates((select id from bt)) -> 'rows') r;
grant select on rw to authenticated;
select public.steward_resolve_import_row((select id::uuid from rw where family = 'Ronde'), 'create');
select public.steward_resolve_import_row((select id::uuid from rw where family = 'Ostin'), 'create');

select is(public.steward_create_confirmations((select id from bt)), 2, 'one link per decided row');                       -- 1
select is(public.steward_create_confirmations((select id from bt)), 0, 'creating again adds nothing');                     -- 2
set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_create_confirmations(%L) $$, (select id from bt)),
  'steward_create_confirmations: reviewer authorization required', 'another institution cannot create links');          -- 3
set local request.jwt.claim.sub to :'st_a';
create temporary table tk on commit drop as
select display_name, token from public.steward_list_confirmations((select id from bt));
grant select on tk to authenticated, anon;
select ok((select bool_and(length(token) >= 48) from tk), 'links are long random tokens');                                -- 4
reset role;

set local role anon;
select is(public.get_confirmation((select token from tk where display_name = 'Gia Ronde')) ->> 'displayName', 'Gia Ronde',
  'anyone with the link sees the record it is about');                                                                    -- 5
select is(public.get_confirmation((select token from tk where display_name = 'Gia Ronde')) ->> 'institution', 'Confirm University',
  'with the institution');                                                                                                -- 6
select is(public.get_confirmation('short'), null, 'a malformed link shows nothing');                                       -- 7
select is(public.get_confirmation(repeat('x', 64)), null, 'an unknown link shows nothing');                                -- 8
select throws_ok(format($$ select public.respond_confirmation(%L, 'corrected') $$, (select token from tk where display_name = 'Gia Ronde')),
  'respond_confirmation: tell us what is wrong', 'a correction needs a note');                                            -- 9
select is(public.respond_confirmation((select token from tk where display_name = 'Gia Ronde'), 'confirmed'), 'confirmed', 'a graduate confirms'); -- 10
select throws_ok(format($$ select public.respond_confirmation(%L, 'declined') $$, (select token from tk where display_name = 'Gia Ronde')),
  'respond_confirmation: this link was already used', 'a link answers once');                                             -- 11
reset role;
update public.people set is_public = true, published_at = now() where display_name = 'Hal Ostin';
set local role anon;
select is(public.respond_confirmation((select token from tk where display_name = 'Hal Ostin'), 'declined', 'Please do not list me.'), 'declined',
  'a graduate can decline');                                                                                               -- 12
reset role;
select is((select is_public from public.people where display_name = 'Hal Ostin'), false, 'declining takes their public page down at once'); -- 13
select ok(exists(select 1 from public.audit_logs where subject_type = 'graduate_confirmation'), 'answers are audited');      -- 14
update public.graduate_confirmations set expires_at = now() - interval '1 day' where person_id = (select id from public.people where display_name = 'Gia Ronde');
set local role anon;
select is(public.get_confirmation((select token from tk where display_name = 'Gia Ronde')), null, 'an expired link shows nothing'); -- 15
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
select is((select response from public.steward_list_confirmations((select id from bt)) where display_name = 'Hal Ostin'), 'declined',
  'the steward sees each answer');                                                                                         -- 16
reset role;

-- ---------------------------------------------------------------- B. programme pages
set local role anon;
select is(public.get_public_programme(:'org_a', 'Ecology'), null, 'nothing is public until the institution publishes');    -- 17
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_set_outcomes_public(%L, true) $$, :'org_a'),
  'steward_set_outcomes_public: reviewer authorization required', 'another institution cannot publish them');            -- 18
set local request.jwt.claim.sub to :'st_a';
select is(public.steward_set_outcomes_public(:'org_a', true), true, 'the institution''s steward publishes its outcomes');  -- 19
reset role;
set local role anon;
select is((public.get_public_programme(:'org_a', 'Ecology') ->> 'graduates')::int, 1,
  'graduates who declined are left out of public counts');                                                                -- 20
select ok(public.get_public_programme(:'org_a', 'Ecology')::text not like '%Gia%', 'the programme page carries no names'); -- 21
select ok(exists(select 1 from public.list_public_programmes() where organization_id = :'org_a' and programme = 'Ecology'),
  'published programmes are listed');                                                                                     -- 22
select is(public.get_public_programme(:'org_a', 'Unknown'), null, 'an unknown programme shows nothing');                  -- 23
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
select is(public.steward_set_outcomes_public(:'org_a', false), false, 'and can unpublish');                               -- 24
reset role;
set local role anon;
select is(public.get_public_programme(:'org_a', 'Ecology'), null, 'unpublished pages disappear');                         -- 25
reset role;

-- ---------------------------------------------------------------- C. suggestions
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values (:'me', 'Mia', 'Self', 'Mia Self', 'verified_self', 'self_reported'),
       (:'peer', 'Pat', 'Peer', 'Pat Peer', 'provisional', 'imported_historical'),
       (:'later', 'Lou', 'Later', 'Lou Later', 'provisional', 'imported_historical'),
       (:'mentor', 'Max', 'Mentor', 'Max Mentor', 'provisional', 'imported_historical'),
       (:'sibling', 'Sol', 'Sibling', 'Sol Sibling', 'provisional', 'imported_historical'),
       (:'related', 'Rae', 'Related', 'Rae Related', 'provisional', 'imported_historical'),
       (:'shy', 'Sam', 'Shy', 'Sam Shy', 'provisional', 'imported_historical');
insert into public.user_person_links (user_id, person_id, status) values (:'me_user', :'me', 'active');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'me',      :'org_b', 'student',    '2000-01-01', 'year', '2004-01-01', 'year', 'self_reported'),
       (:'peer',    :'org_b', 'student',    '2002-01-01', 'year', '2006-01-01', 'year', 'imported_historical'),
       (:'later',   :'org_b', 'student',    '2010-01-01', 'year', '2012-01-01', 'year', 'imported_historical'),
       (:'related', :'org_b', 'researcher', '2001-01-01', 'year', '2003-01-01', 'year', 'imported_historical'),
       (:'shy',     :'org_b', 'student',    '2001-01-01', 'year', '2003-01-01', 'year', 'imported_historical');
insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type)
values ('mentorship', true, :'mentor', :'me', true, 'imported_historical'),
       ('mentorship', true, :'mentor', :'sibling', true, 'imported_historical'),
       ('collaboration', false, :'me', :'related', true, 'imported_historical');
insert into public.suggestion_opt_outs (person_id) values (:'shy');

set local role anon;
select throws_ok($$ select public.my_suggestions() $$, '42501', NULL, 'signed-out visitors get no suggestions');            -- 26
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'me_user';
create temporary table sg on commit drop as
select s ->> 'personId' as id, s -> 'reasons' as reasons from jsonb_array_elements(public.my_suggestions() -> 'suggestions') s;
grant select on sg to authenticated;
select ok(exists(select 1 from sg where id = :'peer'), 'someone documented at the same place and time is suggested');      -- 27
select is((select reasons -> 0 ->> 'institution' from sg where id = :'peer'), 'Elsewhere College', 'with the place');      -- 28
select is((select (reasons -> 0 ->> 'fromYear')::int from sg where id = :'peer'), 2002, 'and the shared years');           -- 29
select ok(exists(select 1 from sg where id = :'sibling' and reasons -> 0 ->> 'kind' = 'same_mentor'), 'a fellow student of the same mentor is suggested'); -- 30
select ok(not exists(select 1 from sg where id = :'later'), 'someone there at another time is not');                       -- 31
select ok(not exists(select 1 from sg where id = :'related'), 'someone already related is not');                           -- 32
select ok(not exists(select 1 from sg where id = :'shy'), 'someone who opted out is never suggested');                     -- 33
select is(public.dismiss_suggestion(:'peer'), true, 'a suggestion can be dismissed');                                       -- 34
select ok(not exists(select 1 from jsonb_array_elements(public.my_suggestions() -> 'suggestions') s where s ->> 'personId' = :'peer'),
  'and does not come back');                                                                                               -- 35
select is(public.set_my_suggestion_opt_out(true), true, 'a person can leave everyone''s suggestions');                     -- 36
reset role;

select * from finish();

rollback;
