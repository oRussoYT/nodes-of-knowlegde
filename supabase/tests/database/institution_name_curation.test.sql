-- pgTAP tests for steward curation of institution names
-- (supabase/migrations/20261021090000_add_institution_name_curation.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(16);

\set platform 'ed000000-0000-4000-8000-0000000000a1'
\set granter  'ed000000-0000-4000-8000-0000000000a2'
\set st_a     'ed000000-0000-4000-8000-0000000000a3'
\set st_b     'ed000000-0000-4000-8000-0000000000a4'
\set org_a    'ed000000-0000-4000-8000-000000000010'
\set org_b    'ed000000-0000-4000-8000-000000000011'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'inc-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'inc-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'inc-a@example.test',        'x', now(), now(), now()),
  (:'st_b',     'authenticated', 'authenticated', 'inc-b@example.test',        'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Named University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Other College',    'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
values (:'org_a', :'st_a', :'platform'), (:'org_b', :'st_b', :'platform');

select has_function('public', 'steward_add_organization_name', ARRAY['uuid', 'text', 'text', 'text', 'integer', 'integer'], 'add exists'); -- 1

set local role anon;
select throws_ok(format($$ select public.steward_add_organization_name(%L, 'X', 'former') $$, :'org_a'),
  '42501', NULL, 'signed-out visitors cannot add names');                                                          -- 2
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table nm on commit drop as
select public.steward_add_organization_name(:'org_a', '  Old Named College ', 'former', 'en', 1950, 1987) as id;
grant select on nm to authenticated;
select isnt((select id from nm), null, 'a steward adds a former name to their institution');                     -- 3
reset role;
select is((select name from public.organization_names where id = (select id from nm)), 'Old Named College', 'trimmed'); -- 4
select is((select start_precision from public.organization_names where id = (select id from nm)), 'year', 'dated to the year'); -- 5
select is((select source_type || '/' || verification_status from public.organization_names where id = (select id from nm)),
  'admin_entered/provisional', 'marked as entered by a steward, not verified');                                   -- 6
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
select throws_ok(format($$ select public.steward_add_organization_name(%L, 'old named college', 'former') $$, :'org_a'),
  'steward_add_organization_name: this name is already recorded', 'no duplicates');                               -- 7
select throws_ok(format($$ select public.steward_add_organization_name(%L, 'NU', 'nickname') $$, :'org_a'),
  'steward_add_organization_name: unknown kind of name', 'only known kinds');                                     -- 8
select throws_ok(format($$ select public.steward_add_organization_name(%L, 'NU', 'acronym', null, 2000, 1990) $$, :'org_a'),
  'steward_add_organization_name: the end year is before the start year', 'periods make sense');                  -- 9
select throws_ok(format($$ select public.steward_add_organization_name(%L, '   ', 'acronym') $$, :'org_a'),
  'steward_add_organization_name: a name is required', 'a name is required');                                     -- 10
select is((select count(*)::int from public.steward_list_organization_names(:'org_a')), 1, 'the steward lists the names'); -- 11
select is((select start_year from public.steward_list_organization_names(:'org_a')), 1950, 'with their years');  -- 12

set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_add_organization_name(%L, 'Hijack', 'former') $$, :'org_a'),
  'steward_add_organization_name: reviewer authorization required', 'another institution cannot add names');    -- 13
select throws_ok(format($$ select public.steward_remove_organization_name(%L) $$, (select id from nm)),
  'steward_remove_organization_name: reviewer authorization required', 'or remove them');                        -- 14

set local request.jwt.claim.sub to :'st_a';
select is(public.steward_remove_organization_name((select id from nm)), true, 'the steward removes a name');      -- 15
reset role;

select is((select count(*)::int from public.audit_logs where subject_type = 'organization_name'), 2,
  'adding and removing are both audited');                                                                        -- 16

select * from finish();

rollback;
