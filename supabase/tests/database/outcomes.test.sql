-- pgTAP tests for the outcomes panel
-- (supabase/migrations/20261017150000_add_outcomes.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(22);

\set platform 'eb000000-0000-4000-8000-0000000000a1'
\set granter  'eb000000-0000-4000-8000-0000000000a2'
\set st_a     'eb000000-0000-4000-8000-0000000000a3'
\set st_b     'eb000000-0000-4000-8000-0000000000a4'
\set org_a    'eb000000-0000-4000-8000-000000000010'
\set org_b    'eb000000-0000-4000-8000-000000000011'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'out-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'out-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'out-a@example.test',        'x', now(), now(), now()),
  (:'st_b',     'authenticated', 'authenticated', 'out-b@example.test',        'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Outcome University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Other University',   'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
values (:'org_a', :'st_a', :'platform'), (:'org_b', :'st_b', :'platform');

-- Four graduates: one found (accepted destination), one probable (pending
-- proposal), one with nothing yet, one skipped (not a graduate on record).
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table bt on commit drop as
select public.steward_create_import_batch('PhDs', :'org_a',
  '[{"givenName":"Ada","familyName":"Found","degree":"PhD","programme":"Ecology","graduationYear":"2015"},
    {"givenName":"Ben","familyName":"Probable","degree":"PhD","programme":"Ecology","graduationYear":"2018"},
    {"givenName":"Cy","familyName":"Nothing","degree":"MSc","programme":"Botany","graduationYear":"2020"},
    {"givenName":"Di","familyName":"Skipped","graduationYear":"2020"}]'::jsonb) as id;
grant select on bt to authenticated;
create temporary table rw on commit drop as
select r ->> 'id' as id, r ->> 'familyName' as family
  from jsonb_array_elements(public.steward_import_candidates((select id from bt)) -> 'rows') r;
grant select on rw to authenticated;

select public.steward_resolve_import_row((select id::uuid from rw where family = 'Found'), 'create');
select public.steward_resolve_import_row((select id::uuid from rw where family = 'Probable'), 'create');
select public.steward_resolve_import_row((select id::uuid from rw where family = 'Nothing'), 'create');
select public.steward_resolve_import_row((select id::uuid from rw where family = 'Skipped'), 'skip');

select public.steward_record_external_matches((select id::uuid from rw where family = 'Found'), 'openalex',
  '[{"externalId":"https://openalex.org/AF","displayName":"Ada Found","orcid":"https://orcid.org/0000-0002-0000-0001",
     "lastKnownInstitution":"Delta Labs","lastKnownCountry":"CA","lastKnownType":"company",
     "affiliations":[{"institution":"Delta Labs","years":[2019,2024]}],"reasons":["same_name"]}]'::jsonb);
select public.steward_record_external_matches((select id::uuid from rw where family = 'Probable'), 'openalex',
  '[{"externalId":"https://openalex.org/AP","displayName":"Ben Probable","reasons":["same_name"]}]'::jsonb);
select public.steward_decide_external_match(
  (select (m ->> 'id')::uuid from jsonb_array_elements(public.steward_import_external((select id from bt)) -> 'rows') r,
          jsonb_array_elements(r -> 'matches') m where r ->> 'familyName' = 'Found'), true);

-- 1-6. Totals.
select is((public.steward_outcomes(:'org_a') -> 'totals' ->> 'graduates')::int, 3, 'skipped rows are not graduates on record');
select is((public.steward_outcomes(:'org_a') -> 'totals' ->> 'found')::int, 1, 'one found');
select is((public.steward_outcomes(:'org_a') -> 'totals' ->> 'probable')::int, 1, 'one probable');
select is((public.steward_outcomes(:'org_a') -> 'totals' ->> 'needsPerson')::int, 1, 'one needs a person');
select is((public.steward_outcomes(:'org_a') -> 'timeSaved' ->> 'minutes')::int, 10, 'time saved uses the stated benchmark');
select ok((public.steward_outcomes(:'org_a') -> 'timeSaved' ->> 'basis') like '%estimate%', 'and says it is an estimate');

-- 7-11. Cuts.
select is((public.steward_outcomes(:'org_a') -> 'bySector' -> 0 ->> 'sector'), 'company', 'destination sector is kept');
select is((public.steward_outcomes(:'org_a') -> 'byCountry' -> 0 ->> 'country'), 'CA', 'destination country is kept');
select is((public.steward_outcomes(:'org_a') -> 'destinations' -> 0 ->> 'institution'), 'Delta Labs', 'destinations are listed');
select is(jsonb_array_length(public.steward_outcomes(:'org_a') -> 'programmes'), 2, 'programmes available as filters');
select is((public.steward_outcomes(:'org_a') -> 'byYear' -> 0 ->> 'year')::int, 2015, 'years come back chronologically');

-- 12-14. Filters.
select is((public.steward_outcomes(:'org_a', 'Ecology') -> 'totals' ->> 'graduates')::int, 2, 'filter by programme');
select is((public.steward_outcomes(:'org_a', null, 2016, 2020) -> 'totals' ->> 'graduates')::int, 2, 'filter by year range');
select is((public.steward_outcomes(:'org_a', 'Botany', 2016) -> 'totals' ->> 'found')::int, 0, 'filters combine');

-- 15-18. Export.
select is((select count(*) from public.steward_outcomes_export(:'org_a')), 3::bigint, 'export has one line per graduate');
select is((select destination_institution from public.steward_outcomes_export(:'org_a') where display_name = 'Ada Found'), 'Delta Labs',
  'export carries the destination');
select is((select destination_source from public.steward_outcomes_export(:'org_a') where display_name = 'Ada Found'), 'openalex',
  'and where it came from');
select is((select orcid from public.steward_outcomes_export(:'org_a') where display_name = 'Ada Found'), 'https://orcid.org/0000-0002-0000-0001',
  'and the confirmed ORCID');
reset role;

-- 19. Exports are audited.
select ok(exists(select 1 from public.audit_logs where subject_type = 'outcomes_export' and subject_id = :'org_a'), 'each export is audited');

-- 20-22. Scope.
set local role authenticated;
set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_outcomes(%L) $$, :'org_a'), 'steward_outcomes: reviewer authorization required',
  'another institution cannot read these outcomes');
select throws_ok(format($$ select * from public.steward_outcomes_export(%L) $$, :'org_a'), 'steward_outcomes_export: reviewer authorization required',
  'nor export them');
set local request.jwt.claim.sub to :'platform';
select is((public.steward_outcomes(:'org_a') -> 'totals' ->> 'graduates')::int, 3, 'platform reviewers can read any institution');
reset role;

select * from finish();

rollback;
