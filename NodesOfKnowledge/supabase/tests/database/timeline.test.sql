-- pgTAP tests for Milestone M6.2: Timeline Engine.
--
-- Run locally via: npm run supabase:test  (supabase test db). Requires
-- `supabase start` (Docker). NOT executed in the authoring environment.
--
-- Scope: events / person_events / event_kinds (constraints, temporal-state
-- validity, deny-by-default access) and get_person_timeline (authorization,
-- provenance, chronological ordering, undated handling, empty/merged/null).
-- Error assertions match on SQLSTATE; constraint/FK/uniqueness assertions
-- additionally match PostgreSQL's native message, which names the specific
-- constraint that fired (proving the intended invariant, not merely that some
-- error occurred). Permission-denial assertions pass NULL for the message,
-- because the native permission wording is not part of the application
-- contract -- only the 42501 SQLSTATE is.

create extension if not exists pgtap;

begin;

select plan(33);

\set user_a '11111111-1111-1111-1111-111111111111'
\set person_p '33333333-3333-3333-3333-333333333333'
\set person_merged '55555555-5555-5555-5555-555555555555'
\set person_empty '77777777-7777-7777-7777-777777777777'

\set ev_uncertain 'a0000000-0000-0000-0000-000000000001'
\set ev_approx    'a0000000-0000-0000-0000-000000000002'
\set ev_year      'a0000000-0000-0000-0000-000000000003'
\set ev_exact     'a0000000-0000-0000-0000-000000000004'
\set ev_interval  'a0000000-0000-0000-0000-000000000005'
\set ev_ongoing   'a0000000-0000-0000-0000-000000000006'
\set ev_undated   'a0000000-0000-0000-0000-000000000007'

-- Independence: clear the NO ACTION people-child tables before people so this
-- suite does not abort on committed rows the e2e claim-workflow may leave on
-- the seeded people (profile_claims/user_person_links reference people ON
-- DELETE NO ACTION; both are empty in every other suite). No constraint is
-- weakened and FK enforcement stays on.
delete from public.user_person_links;
delete from public.profile_claims;
delete from public.people;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'x', now(), now(), now());

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'person_p', 'Time', 'Line', 'Time Line', 'provisional', 'imported_historical'),
  (:'person_merged', 'Merged', 'Away', 'Merged Away', 'merged', 'admin_entered'),
  (:'person_empty', 'No', 'Events', 'No Events', 'provisional', 'imported_historical');

-- Seven events, one per temporal state, distinct start dates for a
-- deterministic chronological order (undated last).
insert into public.events (id, event_kind, title, start_date, start_precision, end_date, end_precision, is_approximate, is_ongoing, date_is_unknown, date_is_uncertain, source_type) values
  (:'ev_uncertain', 'observation',  'Uncertain observation', '1983-01-01', 'year',  null,        null,   false, false, false, true,  'imported_historical'),
  (:'ev_approx',    'fieldwork',    'Approximate fieldwork', '1985-01-01', 'year',  null,        null,   true,  false, false, false, 'imported_historical'),
  (:'ev_year',      'publication',  'Year publication',      '1987-01-01', 'year',  null,        null,   false, false, false, false, 'imported_historical'),
  (:'ev_exact',     'appointment',  'Exact appointment',     '1987-06-15', 'day',   null,        null,   false, false, false, false, 'imported_historical'),
  (:'ev_interval',  'fieldwork',    'Interval fieldwork',    '1989-01-01', 'year',  '1991-01-01','year', false, false, false, false, 'imported_historical'),
  (:'ev_ongoing',   'appointment',  'Ongoing appointment',   '1992-01-01', 'year',  null,        null,   false, true,  false, false, 'imported_historical'),
  (:'ev_undated',   'interview',    'Undated interview',     null,         null,    null,        null,   false, false, true,  false, 'imported_historical');

insert into public.person_events (person_id, event_id)
select :'person_p', id from public.events where id in
  (:'ev_uncertain', :'ev_approx', :'ev_year', :'ev_exact', :'ev_interval', :'ev_ongoing', :'ev_undated');

-- ---- Constraint tests (as table owner; SQLSTATE + native constraint name) ----
select throws_ok(
  $$ insert into public.events (event_kind, title, date_is_unknown, source_type) values ('other', '   ', true, 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_title_not_blank"',
  'blank title rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, start_date, start_precision, source_type) values ('other', 'x', '1990-01-01', 'century', 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_start_precision_valid"',
  'invalid start_precision rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, start_date, source_type) values ('other', 'x', '1990-01-01', 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_start_precision_matches_date"',
  'start_date without precision rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, date_is_unknown, source_type) values ('other', 'x', false, 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_unknown_iff_no_start"',
  'no start and not unknown rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, date_is_unknown, is_approximate, source_type) values ('other', 'x', true, true, 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_unknown_excludes_qualifiers"',
  'undated + approximate rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, start_date, start_precision, end_date, end_precision, source_type) values ('other', 'x', '1990-01-01', 'year', '1985-01-01', 'year', 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_end_after_start"',
  'end before start rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, start_date, start_precision, end_date, end_precision, is_ongoing, source_type) values ('other', 'x', '1990-01-01', 'year', '1992-01-01', 'year', true, 'admin_entered') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_ongoing_requires_open_start"',
  'ongoing with an end rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, date_is_unknown, source_type, verification_status) values ('other', 'x', true, 'admin_entered', 'made_up') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_verification_status_valid"',
  'invalid verification_status rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, date_is_unknown, source_type) values ('other', 'x', true, 'made_up') $$,
  '23514',
  'new row for relation "events" violates check constraint "events_source_type_valid"',
  'invalid source_type rejected'
);
select throws_ok(
  $$ insert into public.events (event_kind, title, date_is_unknown, source_type) values ('no_such_kind', 'x', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "events" violates foreign key constraint "events_event_kind_fkey"',
  'unknown event_kind rejected (FK)'
);
select throws_ok(
  $$ insert into public.person_events (person_id, event_id) values ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "person_events_unique"',
  'duplicate person_event rejected'
);

-- ---- Read-model existence + authorization ----
select has_function('public', 'get_person_timeline', array['uuid'], 'get_person_timeline(uuid) exists');

set local role anon;
select throws_ok(
  $$ select public.get_person_timeline('33333333-3333-3333-3333-333333333333') $$,
  '42501',
  NULL,
  'anon cannot execute get_person_timeline'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select public.get_person_timeline('33333333-3333-3333-3333-333333333333') $$,
  'get_person_timeline: authentication required',
  'get_person_timeline requires auth.uid()'
);
reset role;

-- Deny-by-default: no direct client reads of the timeline tables.
set local role anon;
select throws_ok(
  $$ select 1 from public.events limit 1 $$,
  '42501',
  NULL,
  'anon cannot read events directly'
);
reset role;
set local role authenticated;
select throws_ok(
  $$ select 1 from public.events limit 1 $$,
  '42501',
  NULL,
  'authenticated cannot read events directly'
);
reset role;
set local role anon;
select throws_ok(
  $$ select 1 from public.person_events limit 1 $$,
  '42501',
  NULL,
  'anon cannot read person_events directly'
);
select throws_ok(
  $$ select 1 from public.event_kinds limit 1 $$,
  '42501',
  NULL,
  'anon cannot read event_kinds directly'
);
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

select is(jsonb_array_length(public.get_person_timeline(:'person_p')->'events'), 7, 'timeline returns all seven events');
select is((public.get_person_timeline(:'person_p')->'events'->0->>'title'), 'Uncertain observation', 'earliest event is first (chronological order)');
select is((public.get_person_timeline(:'person_p')->'events'->0->'temporal'->>'date_is_uncertain'), 'true', 'uncertain date flagged');
select is((public.get_person_timeline(:'person_p')->'events'->1->'temporal'->>'is_approximate'), 'true', 'approximate date flagged');
select is((public.get_person_timeline(:'person_p')->'events'->2->'temporal'->>'start_precision'), 'year', 'year precision preserved');
select is((public.get_person_timeline(:'person_p')->'events'->3->'temporal'->>'start_precision'), 'day', 'day precision preserved');
select is((public.get_person_timeline(:'person_p')->'events'->3->'temporal'->>'start_date'), '1987-06-15', 'exact date preserved');
select is((public.get_person_timeline(:'person_p')->'events'->4->'temporal'->>'end_date'), '1991-01-01', 'interval end preserved');
select is((public.get_person_timeline(:'person_p')->'events'->5->'temporal'->>'is_ongoing'), 'true', 'open-ended period flagged');
select is((public.get_person_timeline(:'person_p')->'events'->6->'temporal'->>'date_is_unknown'), 'true', 'undated event sorts last and is flagged');
select is((public.get_person_timeline(:'person_p')->'events'->0->'provenance'->>'source_type'), 'imported_historical', 'event provenance present');
select is((public.get_person_timeline(:'person_p')->'events'->0->'kind'->>'label'), 'Historical observation', 'generic event-kind label resolved from vocabulary');

select is((public.get_person_timeline(:'person_empty')->'events'), '[]'::jsonb, 'a person with no events gets an empty timeline, not null');
select is(public.get_person_timeline(:'person_merged'), null::jsonb, 'merged person returns null');
select is(public.get_person_timeline('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent person returns null');

reset role;

select * from finish();

rollback;
