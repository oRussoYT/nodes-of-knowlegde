-- pgTAP tests for external (OpenAlex) proposals on imported graduates
-- (supabase/migrations/20261017140000_add_external_matching.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(21);

\set platform 'ea000000-0000-4000-8000-0000000000a1'
\set granter  'ea000000-0000-4000-8000-0000000000a2'
\set st_a     'ea000000-0000-4000-8000-0000000000a3'
\set st_b     'ea000000-0000-4000-8000-0000000000a4'
\set org_a    'ea000000-0000-4000-8000-000000000010'
\set org_b    'ea000000-0000-4000-8000-000000000011'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'ext-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'ext-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'ext-a@example.test',        'x', now(), now(), now()),
  (:'st_b',     'authenticated', 'authenticated', 'ext-b@example.test',        'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Alpha University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Beta University',  'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
values (:'org_a', :'st_a', :'platform'), (:'org_b', :'st_b', :'platform');

set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table bt on commit drop as
select public.steward_create_import_batch('Alpha PhDs', :'org_a',
  '[{"givenName":"Lia","familyName":"Quennel","graduationYear":"2016"},{"givenName":"Teo","familyName":"Varrow"}]'::jsonb) as id;
grant select on bt to authenticated;
create temporary table rw on commit drop as
select r ->> 'id' as id, r ->> 'familyName' as family
  from jsonb_array_elements(public.steward_import_candidates((select id from bt)) -> 'rows') r;
grant select on rw to authenticated;

-- 1-2. Closed tables.
select throws_ok($$ select * from public.import_row_external_matches $$, '42501', NULL, 'proposals table closed to clients');
select throws_ok($$ select * from public.person_destinations $$, '42501', NULL, 'destinations table closed to clients');

-- 3-5. Recording proposals.
select is(public.steward_record_external_matches((select id::uuid from rw where family = 'Quennel'), 'openalex',
  '[{"externalId":"https://openalex.org/A1","displayName":"Lia Quennel","orcid":"https://orcid.org/0000-0001-0000-0001",
     "lastKnownInstitution":"Gamma Institute","lastKnownCountry":"CA",
     "affiliations":[{"institution":"Alpha University","years":[2012,2016]},{"institution":"Gamma Institute","years":[2019,2023]}],
     "worksCount":12,"reasons":["same_name","affiliated_with_importing_institution"]},
    {"externalId":"https://openalex.org/A2","displayName":"L. Quennel","reasons":["alternative_name"]},
    {"displayName":"no id"}]'::jsonb), 2, 'two valid proposals stored; one without an id dropped');
select throws_ok(format($$ select public.steward_record_external_matches(%L, 'scraper', '[]') $$, (select id from rw where family = 'Quennel')),
  'steward_record_external_matches: unknown source', 'only known sources');
set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_record_external_matches(%L, 'openalex', '[]') $$, (select id from rw where family = 'Quennel')),
  'steward_record_external_matches: reviewer authorization required', 'another institution''s steward cannot');

-- 6-7. Re-recording replaces only undecided proposals.
set local request.jwt.claim.sub to :'st_a';
select is(public.steward_record_external_matches((select id::uuid from rw where family = 'Quennel'), 'openalex',
  '[{"externalId":"https://openalex.org/A1","displayName":"Lia Quennel","orcid":"https://orcid.org/0000-0001-0000-0001",
     "lastKnownInstitution":"Gamma Institute","lastKnownCountry":"CA",
     "affiliations":[{"institution":"Alpha University","years":[2012,2016]},{"institution":"Gamma Institute","years":[2019,2023]}],
     "reasons":["same_name","affiliated_with_importing_institution"]},
    {"externalId":"https://openalex.org/A2","displayName":"L. Quennel","reasons":["alternative_name"]}]'::jsonb), 2,
  'a second lookup refreshes the proposals');
create temporary table ex on commit drop as
select m ->> 'id' as id, m ->> 'externalId' as ext
  from jsonb_array_elements(public.steward_import_external((select id from bt)) -> 'rows') r,
       jsonb_array_elements(r -> 'matches') m
 where r ->> 'familyName' = 'Quennel';
grant select on ex to authenticated;
select is((select count(*) from ex), 2::bigint, 'no duplicates after refreshing');

-- 8. Accepting needs a decided row.
select throws_ok(format($$ select public.steward_decide_external_match(%L, true) $$, (select id from ex where ext like '%A1')),
  'steward_decide_external_match: decide who this row is first', 'cannot accept before the row is resolved');

-- 9-15. Resolve the row, then accept.
select isnt(public.steward_resolve_import_row((select id::uuid from rw where family = 'Quennel'), 'create'), null, 'row resolved to a new person');
select is(public.steward_decide_external_match((select id::uuid from ex where ext like '%A1'), true), 'accepted', 'proposal accepted');
reset role;
create temporary table pp on commit drop as
select resolved_person_id as id from public.import_rows where family_name = 'Quennel' and batch_id = (select id from bt);
select ok(exists(select 1 from public.person_external_ids where person_id = (select id from pp) and source = 'openalex'
                 and external_id = 'https://openalex.org/A1'), 'the OpenAlex id is recorded for the person');
select ok(exists(select 1 from public.person_external_ids where person_id = (select id from pp) and source = 'orcid'), 'and the ORCID');
select is((select institution_name from public.person_destinations where person_id = (select id from pp)), 'Gamma Institute',
  'the latest known institution becomes a destination');
select is((select as_of_year from public.person_destinations where person_id = (select id from pp)), 2023,
  'dated by the latest documented year there');
select is((select status from public.import_row_external_matches where external_id = 'https://openalex.org/A2'), 'rejected',
  'the other proposal for that row is set aside');

-- 16-17. Decided proposals stay decided.
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
select throws_ok(format($$ select public.steward_decide_external_match(%L, false) $$, (select id from ex where ext like '%A1')),
  'steward_decide_external_match: already decided', 'a decision is final');
select is(public.steward_record_external_matches((select id::uuid from rw where family = 'Quennel'), 'openalex', '[]'::jsonb), 0,
  'a new lookup leaves decided proposals in place');
reset role;
select is((select count(*) from public.import_row_external_matches where row_id = (select id::uuid from rw where family = 'Quennel')), 2::bigint,
  'both decided proposals are still there');

-- 18-19. Audit and rejection path.
select ok(exists(select 1 from public.audit_logs where subject_type = 'external_match' and action = 'approve'), 'acceptance is audited');
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
select public.steward_record_external_matches((select id::uuid from rw where family = 'Varrow'), 'openalex',
  '[{"externalId":"https://openalex.org/A9","displayName":"Teo Varrow"}]'::jsonb);
select is(public.steward_decide_external_match(
  (select (m ->> 'id')::uuid from jsonb_array_elements(public.steward_import_external((select id from bt)) -> 'rows') r,
          jsonb_array_elements(r -> 'matches') m where r ->> 'familyName' = 'Varrow'), false),
  'rejected', 'a proposal can be rejected without resolving the row');

-- 20. Another institution's steward cannot read the batch.
set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_import_external(%L) $$, (select id from bt)),
  'steward_import_external: reviewer authorization required', 'another institution cannot read the proposals');
reset role;

select * from finish();

rollback;
