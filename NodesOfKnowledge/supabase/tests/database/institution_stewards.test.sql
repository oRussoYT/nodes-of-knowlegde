-- pgTAP tests for institution stewards (several institutions, one record)
-- (supabase/migrations/20261017130000_add_institution_stewards.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(33);

\set platform 'e9000000-0000-4000-8000-0000000000a1'
\set granter  'e9000000-0000-4000-8000-0000000000a2'
\set steward_a 'e9000000-0000-4000-8000-0000000000a3'
\set steward_b 'e9000000-0000-4000-8000-0000000000a4'
\set nobody   'e9000000-0000-4000-8000-0000000000a5'
\set org_a    'e9000000-0000-4000-8000-000000000010'
\set org_b    'e9000000-0000-4000-8000-000000000011'
\set p_a      'e9000000-0000-4000-8000-000000000001'
\set p_b      'e9000000-0000-4000-8000-000000000002'
\set p_dup    'e9000000-0000-4000-8000-000000000003'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform',  'authenticated', 'authenticated', 'platform@example.test',  'x', now(), now(), now()),
  (:'granter',   'authenticated', 'authenticated', 'granter@example.test',   'x', now(), now(), now()),
  (:'steward_a', 'authenticated', 'authenticated', 'Steward.A@Example.test', 'x', now(), now(), now()),
  (:'steward_b', 'authenticated', 'authenticated', 'steward.b@example.test', 'x', now(), now(), now()),
  (:'nobody',    'authenticated', 'authenticated', 'nobody@example.test',    'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');

insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Alpha University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Beta University',  'university', 'active', 'imported_historical', 'provisional');
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values (:'p_a',   'Ana',  'Alpha', 'Ana Alpha',  'provisional', 'imported_historical'),
       (:'p_b',   'Bea',  'Beta',  'Bea Beta',   'provisional', 'imported_historical'),
       (:'p_dup', 'Ana',  'Alpha', 'ana  alpha', 'provisional', 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'p_a', :'org_a', 'student', true, 'imported_historical'),
       (:'p_dup', :'org_a', 'student', true, 'imported_historical'),
       (:'p_b', :'org_b', 'student', true, 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type)
values (:'p_a', :'org_a', 'researcher', '1911-01-01', 'year', 'imported_historical'),
       (:'p_b', :'org_b', 'researcher', '1912-01-01', 'year', 'imported_historical');

-- 1-2. The table is closed to clients; helpers are not callable.
set local role authenticated;
set local request.jwt.claim.sub to :'platform';
select throws_ok($$ select * from public.institution_stewards $$, '42501', NULL, 'clients cannot read institution_stewards');
select throws_ok(format($$ select public.can_steward_org(%L, %L) $$, :'platform', :'org_a'), '42501', NULL,
  'clients cannot call the internal helper');

-- 3-7. Appointing: platform reviewers only, by email, audited.
select throws_ok(format($$ select public.steward_grant_institution_steward(%L, 'missing@example.test') $$, :'org_a'),
  'steward_grant_institution_steward: no account with that email', 'unknown email is refused');
select isnt(public.steward_grant_institution_steward(:'org_a', 'steward.a@example.test'), null,
  'a platform reviewer appoints a steward by email, case-insensitively');
select isnt(public.steward_grant_institution_steward(:'org_b', 'steward.b@example.test'), null, 'a second institution gets its own steward');
select is(public.steward_grant_institution_steward(:'org_a', 'steward.a@example.test'),
          (select s.id from public.steward_list_institution_stewards() s where s.organization_id = :'org_a'),
  'appointing twice is idempotent');
set local request.jwt.claim.sub to :'steward_a';
select throws_ok(format($$ select public.steward_grant_institution_steward(%L, 'nobody@example.test') $$, :'org_a'),
  'steward_grant_institution_steward: reviewer authorization required', 'institution stewards cannot appoint others');
reset role;
select ok(exists(select 1 from public.audit_logs where subject_type = 'institution_steward' and action = 'create'), 'appointment is audited');

-- 8-11. Who am I.
set local role authenticated;
set local request.jwt.claim.sub to :'steward_a';
select is(public.am_i_a_steward(), true, 'an institution steward is a steward');
select is((public.my_steward_scope() ->> 'platform')::boolean, false, 'but not platform-wide');
select is(public.my_steward_scope() -> 'organizations' -> 0 ->> 'name', 'Alpha University', 'and their scope names their institution');
set local request.jwt.claim.sub to :'nobody';
select is(public.am_i_a_steward(), false, 'an ordinary account is not a steward');

-- 12-19. Console scope.
set local request.jwt.claim.sub to :'steward_a';
select throws_ok($$ select public.steward_overview() $$, 'steward_overview: reviewer authorization required',
  'an institution steward cannot read the whole record');
select throws_ok(format($$ select public.steward_overview(%L) $$, :'org_b'), 'steward_overview: reviewer authorization required',
  'nor another institution');
select is((public.steward_overview(:'org_a') -> 'people' ->> 'total')::int, 2, 'their own institution counts only its people');
select is((public.steward_overview(:'org_a') -> 'organizations' ->> 'total')::int, 1, 'and only their institution');
select is((public.steward_overview(:'org_a') ->> 'scope'), 'institution', 'the overview says it is scoped');
select is((public.steward_attention(:'org_a') -> 'possibleDuplicates' ->> 'total')::int, 1, 'duplicates are found inside the scope');
select is((public.steward_attention(:'org_a') -> 'peopleWithoutParticipation' ->> 'total')::int, 0,
  'inside an institution nobody is unattached');
select is((select participations_starting from public.steward_corpus_timeline(:'org_a') where decade = 1910), 1::bigint,
  'the corpus timeline counts only their institution');

-- 20-21. The platform view is unchanged.
set local request.jwt.claim.sub to :'platform';
select ok((public.steward_overview() -> 'people' ->> 'total')::int >= 3, 'platform reviewers still see the whole record');
select is((select participations_starting from public.steward_corpus_timeline() where decade = 1910), 2::bigint,
  'and the whole corpus timeline');

-- 22-26. Imports for their own institution only.
set local request.jwt.claim.sub to :'steward_a';
select throws_ok($$ select public.steward_create_import_batch('No org', null, '[{"givenName":"X","familyName":"Y"}]') $$,
  'steward_create_import_batch: reviewer authorization required', 'an institution steward must import into an institution');
select throws_ok(format($$ select public.steward_create_import_batch('Other', %L, '[{"givenName":"X","familyName":"Y"}]') $$, :'org_b'),
  'steward_create_import_batch: reviewer authorization required', 'and only into their own');
create temporary table ba on commit drop as
select public.steward_create_import_batch('Alpha grads', :'org_a', '[{"givenName":"Ana","familyName":"Alpha"}]'::jsonb) as id;
grant select on ba to authenticated;
select isnt((select id from ba), null, 'an institution steward imports into their institution');
set local request.jwt.claim.sub to :'steward_b';
select ok(not exists(select 1 from public.steward_list_import_batches() where id = (select id from ba)),
  'another institution''s steward does not see that list');
select throws_ok(format($$ select public.steward_import_candidates(%L) $$, (select id from ba)),
  'steward_import_candidates: reviewer authorization required', 'nor its candidates');

-- 27-29. Publishing pages of their own people only.
select throws_ok(format($$ select public.steward_set_person_public(%L, true, 'reason') $$, :'p_a'),
  'steward_set_person_public: reviewer authorization required', 'a steward cannot publish another institution''s person');
select is(public.steward_set_person_public(:'p_b', true, 'Alumni page agreed with the department.'), true,
  'a steward can publish a person documented at their institution');
set local request.jwt.claim.sub to :'nobody';
select throws_ok(format($$ select public.steward_set_person_public(%L, false) $$, :'p_b'),
  'steward_set_person_public: reviewer authorization required', 'an ordinary account cannot');

-- 30-32. Removing a steward ends their reach at once.
set local request.jwt.claim.sub to :'platform';
select is(public.steward_revoke_institution_steward((select s.id from public.steward_list_institution_stewards() s where s.organization_id = :'org_a')),
  true, 'a platform reviewer removes a steward');
set local request.jwt.claim.sub to :'steward_a';
select is(public.am_i_a_steward(), false, 'the removed steward is no longer a steward');
select throws_ok(format($$ select public.steward_overview(%L) $$, :'org_a'), 'steward_overview: reviewer authorization required',
  'and loses access immediately');
reset role;

select * from finish();

rollback;
