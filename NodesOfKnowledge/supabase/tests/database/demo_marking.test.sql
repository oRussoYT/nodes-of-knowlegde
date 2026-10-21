-- pgTAP tests for demonstration-data marking and wipe
-- (supabase/migrations/20261017100000_add_demo_marking.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(17);

\set reviewer 'e6000000-0000-4000-8000-0000000000a1'
\set granter  'e6000000-0000-4000-8000-0000000000a2'
\set claimant 'e6000000-0000-4000-8000-0000000000a3'
\set demo_p   'e6000000-0000-4000-8000-000000000001'
\set real_p   'e6000000-0000-4000-8000-000000000002'
\set demo_o   'e6000000-0000-4000-8000-000000000010'
\set real_o   'e6000000-0000-4000-8000-000000000011'
\set real_part 'e6000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'demo-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'demo-granter@example.test',  'x', now(), now(), now()),
  (:'claimant', 'authenticated', 'authenticated', 'demo-claimant@example.test', 'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type, is_demo)
values
  (:'demo_p', 'Demo', 'Person', 'Demo Person', 'provisional', 'admin_entered', true),
  (:'real_p', 'Real', 'Person', 'Real Person', 'provisional', 'imported_historical', false);
insert into public.organizations (id, name, organization_type, status, source_type, verification_status, is_demo)
values
  (:'demo_o', 'Demo Institute', 'university', 'active', 'admin_entered', 'provisional', true),
  (:'real_o', 'Real Institute', 'university', 'active', 'imported_historical', 'provisional', false);

-- Demo person at a real institution, real person at a demo institution, real at real.
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'demo_p', :'real_o', 'researcher', true, 'admin_entered'),
       (:'real_p', :'demo_o', 'researcher', true, 'admin_entered');
insert into public.participations (id, person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'real_part', :'real_p', :'real_o', 'researcher', true, 'imported_historical');

-- A pending claim on the demo person (no cascade from people -> must be wiped explicitly).
insert into public.profile_claims (claimant_user_id, claimed_person_id, status, supporting_evidence)
values (:'claimant', :'demo_p', 'submitted', 'Demo claim.');

-- 1-3. Column defaults and the public flag.
select col_default_is('public', 'people', 'is_demo', 'false', 'people.is_demo defaults to false');
select col_not_null('public', 'organizations', 'is_demo', 'organizations.is_demo is NOT NULL');

set local role anon;
select ok(public.has_demo_data(), 'anon can ask whether demonstration data exists');
reset role;

-- 4-6. wipe_demo_data is service_role only.
set local role anon;
select throws_ok($$ select public.wipe_demo_data() $$, '42501', NULL, 'anon cannot wipe');
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';
select throws_ok($$ select public.wipe_demo_data() $$, '42501', NULL, 'even a reviewer cannot wipe from the app');

-- 6-7. Summary is reviewer-gated and counts demo vs real.
select is((public.steward_demo_summary() -> 'people' ->> 'demo')::bigint >= 1, true, 'summary counts demo people');
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'claimant';
select throws_ok($$ select public.steward_demo_summary() $$, 'steward_demo_summary: reviewer authorization required',
  'non-reviewer cannot read the demo summary');
reset role;

-- 8-17. Wipe as service_role.
set local role service_role;
select lives_ok($$ select public.wipe_demo_data() $$, 'service_role can wipe');
reset role;

select is((select count(*) from public.people where is_demo), 0::bigint, 'no demo people remain');
select is((select count(*) from public.organizations where is_demo), 0::bigint, 'no demo institutions remain');
select ok(exists(select 1 from public.people where id = :'real_p'), 'real person kept');
select ok(exists(select 1 from public.organizations where id = :'real_o'), 'real institution kept');
select ok(exists(select 1 from public.participations where id = :'real_part'), 'real participation at a real institution kept');
select is((select count(*) from public.participations where person_id = :'demo_p' or organization_id = :'demo_o'), 0::bigint,
  'participations touching demo records are gone (cascade)');
select is((select count(*) from public.profile_claims where claimed_person_id = :'demo_p'), 0::bigint,
  'claims on demo people are gone');
select ok(exists(select 1 from public.audit_logs where subject_type = 'demo_data' and action = 'delete'),
  'the wipe is recorded in the audit log');

set local role anon;
select is(public.has_demo_data(), false, 'after the wipe, nothing is labelled demonstration');
reset role;

select * from finish();

rollback;
