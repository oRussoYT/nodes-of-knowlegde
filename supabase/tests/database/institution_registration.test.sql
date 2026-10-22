-- pgTAP tests for registering an institution from the site
-- (supabase/migrations/20261022090000_add_institution_registration.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(9);

\set platform 'ef000000-0000-4000-8000-0000000000a1'
\set granter  'ef000000-0000-4000-8000-0000000000a2'
\set member   'ef000000-0000-4000-8000-0000000000a3'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'ir-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'ir-granter@example.test',  'x', now(), now(), now()),
  (:'member',   'authenticated', 'authenticated', 'ir-member@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');

set local role anon;
select throws_ok($$ select public.steward_create_organization('X University') $$, '42501', NULL, 'signed-out visitors cannot add institutions'); -- 1
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'member';
select throws_ok($$ select public.steward_create_organization('X University') $$,
  'steward_create_organization: reviewer authorization required', 'members cannot add institutions');               -- 2

set local request.jwt.claim.sub to :'platform';
create temporary table org on commit drop as
select public.steward_create_organization('  Registry   Test University ', 'university', 'RTU', 'Montreal, QC', 'https://rtu.example') as id;
grant select on org to authenticated;
select isnt((select id from org), null, 'a platform reviewer adds an institution');                                  -- 3
select throws_ok($$ select public.steward_create_organization('registry test university') $$,
  'steward_create_organization: an institution with this name already exists', 'no duplicate names');              -- 4
select throws_ok($$ select public.steward_create_organization('Y', 'castle') $$,
  'steward_create_organization: unknown kind of institution', 'only known kinds');                                 -- 5
select throws_ok($$ select public.steward_create_organization('Z', 'university', null, null, 'javascript:alert(1)') $$,
  'steward_create_organization: the website must start with http:// or https://', 'only web addresses');           -- 6
reset role;

select is((select name from public.organizations where id = (select id from org)), 'Registry Test University', 'name tidied'); -- 7
select is((select is_demo from public.organizations where id = (select id from org)), false, 'a real institution, not demo'); -- 8
select ok(exists(select 1 from public.audit_logs where subject_type = 'organization' and subject_id = (select id from org)),
  'the creation is audited');                                                                                         -- 9

select * from finish();

rollback;
