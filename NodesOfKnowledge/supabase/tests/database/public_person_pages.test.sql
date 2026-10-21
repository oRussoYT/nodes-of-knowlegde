-- pgTAP tests for public person pages
-- (supabase/migrations/20261017120000_add_public_person_pages.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(22);

\set reviewer 'e8000000-0000-4000-8000-0000000000a1'
\set granter  'e8000000-0000-4000-8000-0000000000a2'
\set owner    'e8000000-0000-4000-8000-0000000000a3'
\set stranger 'e8000000-0000-4000-8000-0000000000a4'
\set p_hist   'e8000000-0000-4000-8000-000000000001'
\set p_owned  'e8000000-0000-4000-8000-000000000002'
\set org      'e8000000-0000-4000-8000-000000000010'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'pub-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'pub-granter@example.test',  'x', now(), now(), now()),
  (:'owner',    'authenticated', 'authenticated', 'pub-owner@example.test',    'x', now(), now(), now()),
  (:'stranger', 'authenticated', 'authenticated', 'pub-stranger@example.test', 'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'p_hist',  'Historic', 'Figure', 'Historic Figure', 'provisional', 'imported_historical'),
  (:'p_owned', 'Owned',    'Page',   'Owned Page',      'verified_self', 'self_reported');
insert into public.user_person_links (user_id, person_id, status) values (:'owner', :'p_owned', 'active');

insert into public.organizations (id, name, short_name, organization_type, status, source_type, verification_status)
values (:'org', 'Public Field Station', 'PFS', 'field_station', 'active', 'imported_historical', 'provisional');
insert into public.participations (person_id, organization_id, capacity, summary, start_date, start_precision, end_date, end_precision, source_type)
values (:'p_hist', :'org', 'researcher', 'Private note about the person.', '1985-01-01', 'year', '1990-01-01', 'year', 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type, verification_status)
values (:'p_hist', :'org', 'director', true, 'nominated_by_other', 'disputed');

-- 1-3. Nothing is public by default.
select col_default_is('public', 'people', 'is_public', 'false', 'people are not public by default');
set local role anon;
select is(public.get_public_person(:'p_hist'), null, 'anon sees nothing for a person nobody published');
select ok(not exists(select 1 from public.list_public_people() where id = :'p_hist'), 'unpublished people are not listed');
reset role;

-- 4-7. Publishing is accountable.
set local role anon;
select throws_ok(format($$ select public.steward_set_person_public(%L, true, 'x') $$, :'p_hist'), '42501', NULL, 'anon cannot publish');
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'stranger';
select throws_ok(format($$ select public.steward_set_person_public(%L, true, 'x') $$, :'p_hist'),
  'steward_set_person_public: reviewer authorization required', 'a non-reviewer cannot publish someone else');
set local request.jwt.claim.sub to :'reviewer';
select throws_ok(format($$ select public.steward_set_person_public(%L, true) $$, :'p_hist'),
  'steward_set_person_public: a reason is required to publish', 'publishing needs a written reason');
select is(public.steward_set_person_public(:'p_hist', true, 'Well-documented historical figure; published records only.'), true,
  'a reviewer can publish with a reason');
reset role;

-- 8. Audited.
select ok(exists(select 1 from public.audit_logs where subject_id = :'p_hist' and metadata ->> 'change' = 'published'
                 and metadata ->> 'by' = 'steward'), 'publishing is audited with its reason');

-- 9-15. What the public sees, and what it does not.
set local role anon;
select is(public.get_public_person(:'p_hist') -> 'person' ->> 'displayName', 'Historic Figure', 'anon can read a published page');
select ok(exists(select 1 from public.list_public_people() where id = :'p_hist'), 'published people are listed');
select is(jsonb_array_length(public.get_public_person(:'p_hist') -> 'participation' -> 'participations'), 1,
  'disputed participations are not shown publicly');
select is(public.get_public_person(:'p_hist') -> 'participation' -> 'participations' -> 0 -> 'summary', 'null'::jsonb,
  'free-text summaries are never exposed publicly');
select is(public.get_public_person(:'p_hist') -> 'participation' -> 'participations' -> 0 -> 'organization' ->> 'name',
  'Public Field Station', 'the institution is shown');
select ok(not (public.get_public_person(:'p_hist') -> 'person' ? 'biography'), 'other person fields are not exposed');
select is((public.get_public_person(:'p_hist') -> 'person' ->> 'isClaimed')::boolean, false, 'unclaimed is stated');
reset role;

-- 16-17. Unpublish.
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';
select is(public.steward_set_person_public(:'p_hist', false), false, 'a reviewer can unpublish without a reason');
reset role;
set local role anon;
select is(public.get_public_person(:'p_hist'), null, 'an unpublished page disappears');
reset role;

-- 18-21. The person themselves.
set local role authenticated;
set local request.jwt.claim.sub to :'stranger';
select throws_ok($$ select public.set_my_person_public(true) $$,
  'set_my_person_public: no person record is linked to this account', 'an account with no person cannot publish');
set local request.jwt.claim.sub to :'owner';
select is(public.set_my_person_public(true), :'p_owned'::uuid, 'the linked person can publish their own page');
reset role;
set local role anon;
select is((public.get_public_person(:'p_owned') -> 'person' ->> 'isClaimed')::boolean, true, 'a claimed page says so');
reset role;
select ok(exists(select 1 from public.audit_logs where subject_id = :'p_owned' and metadata ->> 'by' = 'self'),
  'self-publishing is audited');

-- 22. Consistency constraint.
select throws_ok(format($$ update public.people set is_public = true where id = %L $$, :'p_hist'), '23514', NULL,
  'is_public cannot be set without a publication time');

select * from finish();

rollback;
