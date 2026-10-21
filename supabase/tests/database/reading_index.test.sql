-- pgTAP tests for the reading-index list read models
-- (supabase/migrations/20260809090000_add_reading_index_read_models.sql):
-- list_people / list_organizations / list_contributions.
--
-- Run locally via: npm run supabase:test  (supabase test db)
-- Requires: `supabase start` running (Docker). Self-contained: inserts its
-- own fixtures as the table owner and rolls back, so it neither depends on
-- nor mutates seed data or other test files. Error assertions match on
-- SQLSTATE, not message wording. Verified against a real PostgreSQL 16
-- instance during development.

create extension if not exists pgtap;

begin;

select plan(14);

\set person_ok   'f0000000-0000-4000-8000-000000000001'
\set person_merged 'f0000000-0000-4000-8000-000000000002'
\set org         'f0000000-0000-4000-8000-000000000003'
\set contrib     'f0000000-0000-4000-8000-000000000004'
\set reader      'f0000000-0000-4000-8000-0000000000aa'

-- Fixtures (as the table owner; bypasses RLS like the privileged seed path).
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'person_ok', 'Reading', 'Fixture', 'Reading Fixture Person', 'provisional', 'imported_historical'),
  (:'person_merged', 'Merged', 'Fixture', 'Merged Fixture Person', 'merged', 'admin_entered');

insert into public.organizations (id, name, short_name, organization_type, status, source_type, verification_status)
values
  (:'org', 'Reading Fixture Institute', 'RFI', 'archive', 'closed', 'imported_historical', 'provisional');

insert into public.contributions (id, title, contribution_kind, start_date, start_precision, source_type, verification_status)
values
  (:'contrib', 'Reading Fixture Contribution', 'oral_history_preservation', '2000-01-01', 'year', 'imported_historical', 'provisional');

-- 1-3. Functions exist.
select has_function('public', 'list_people', ARRAY[]::text[], 'list_people() exists');
select has_function('public', 'list_organizations', ARRAY[]::text[], 'list_organizations() exists');
select has_function('public', 'list_contributions', ARRAY[]::text[], 'list_contributions() exists');

-- 4-6. anon has no EXECUTE -> permission denied (42501).
set local role anon;
select throws_ok($$ select public.list_people() $$, '42501', NULL, 'anon cannot execute list_people');
select throws_ok($$ select public.list_organizations() $$, '42501', NULL, 'anon cannot execute list_organizations');
select throws_ok($$ select public.list_contributions() $$, '42501', NULL, 'anon cannot execute list_contributions');
reset role;

-- 7. authenticated but no jwt sub -> function raises 'authentication required'.
set local role authenticated;
select throws_ok(
  $$ select public.list_people() $$,
  'list_people: authentication required',
  'list_people requires auth.uid()'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'reader';

-- 8-9. People index includes a non-merged record and excludes merged.
select ok(
  exists(select 1 from public.list_people() where id = :'person_ok'),
  'list_people includes a non-merged person'
);
select ok(
  not exists(select 1 from public.list_people() where id = :'person_merged'),
  'list_people excludes merged people (would 404 in detail)'
);

-- 10-12. Institutions index includes the record with a resolved type label and status.
select ok(
  exists(select 1 from public.list_organizations() where id = :'org'),
  'list_organizations includes the institution'
);
select is(
  (select organization_type_label from public.list_organizations() where id = :'org'),
  'Archive',
  'list_organizations resolves the type label'
);
select is(
  (select status from public.list_organizations() where id = :'org'),
  'closed',
  'list_organizations returns lifecycle status (incl. closed)'
);

-- 13-14. Contributions index includes the record with a resolved kind label.
select ok(
  exists(select 1 from public.list_contributions() where id = :'contrib'),
  'list_contributions includes the contribution'
);
select is(
  (select contribution_kind_label from public.list_contributions() where id = :'contrib'),
  'Oral-history preservation',
  'list_contributions resolves the kind label'
);

reset role;

select * from finish();

rollback;
