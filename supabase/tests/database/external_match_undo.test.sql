-- pgTAP tests for undoing an accepted external match
-- (supabase/migrations/20261022100000_add_external_match_undo.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(11);

\set platform 'eb000000-0000-4000-8000-0000000000a1'
\set granter  'eb000000-0000-4000-8000-0000000000a2'
\set st_a     'eb000000-0000-4000-8000-0000000000a3'
\set st_b     'eb000000-0000-4000-8000-0000000000a4'
\set org_a    'eb000000-0000-4000-8000-000000000010'
\set org_b    'eb000000-0000-4000-8000-000000000011'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'undo-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'undo-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'undo-a@example.test',        'x', now(), now(), now()),
  (:'st_b',     'authenticated', 'authenticated', 'undo-b@example.test',        'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Undo University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Other University', 'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
values (:'org_a', :'st_a', :'platform'), (:'org_b', :'st_b', :'platform');

set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table bt on commit drop as
select public.steward_create_import_batch('Undo PhDs', :'org_a', '[{"givenName":"Jem","familyName":"Peng","graduationYear":"2018"}]'::jsonb) as id;
grant select on bt to authenticated;
create temporary table rw on commit drop as
select r ->> 'id' as id from jsonb_array_elements(public.steward_import_candidates((select id from bt)) -> 'rows') r;
grant select on rw to authenticated;
select public.steward_resolve_import_row((select id::uuid from rw), 'create');
select public.steward_record_external_matches((select id::uuid from rw), 'openalex',
  '[{"externalId":"https://openalex.org/W1","displayName":"Jem C. Peng","orcid":"https://orcid.org/0000-0001-0000-0009",
     "lastKnownInstitution":"Far University","lastKnownCountry":"SG","affiliations":[{"institution":"Far University","years":[2010,2024]}],
     "reasons":["alternative_name"]},
    {"externalId":"https://openalex.org/R1","displayName":"Jem Peng","lastKnownInstitution":"Near Institute","lastKnownCountry":"CA",
     "affiliations":[{"institution":"Undo University","years":[2012,2018]},{"institution":"Near Institute","years":[2019,2022]}],
     "reasons":["same_name","affiliated_with_importing_institution"]}]'::jsonb);
create temporary table ex on commit drop as
select m ->> 'id' as id, m ->> 'externalId' as ext
  from jsonb_array_elements(public.steward_import_external((select id from bt)) -> 'rows') r,
       jsonb_array_elements(r -> 'matches') m;
grant select on ex to authenticated;

-- The wrong homonym is accepted by mistake.
select public.steward_decide_external_match((select id::uuid from ex where ext like '%W1'), true);
reset role;
create temporary table pid on commit drop as select resolved_person_id as id from public.import_rows where id = (select id::uuid from rw);
grant select on pid to authenticated;
select is((select count(*)::int from public.person_destinations where person_id = (select id from pid)), 1, 'the mistake wrote a destination'); -- 1
set local role authenticated;

select throws_ok(format($$ select public.steward_undo_external_match(%L, ' ') $$, (select id from ex where ext like '%W1')),
  'steward_undo_external_match: say why it was wrong', 'an undo needs a reason');                                     -- 2
set local request.jwt.claim.sub to :'st_b';
select throws_ok(format($$ select public.steward_undo_external_match(%L, 'x') $$, (select id from ex where ext like '%W1')),
  'steward_undo_external_match: reviewer authorization required', 'another institution cannot undo');                -- 3
set local request.jwt.claim.sub to :'st_a';
select throws_ok(format($$ select public.steward_undo_external_match(%L, 'x') $$, (select id from ex where ext like '%R1')),
  'steward_undo_external_match: only an accepted match can be undone', 'only accepted matches');                     -- 4
select is(public.steward_undo_external_match((select id::uuid from ex where ext like '%W1'), 'A homonym in Singapore'), 1,
  'undo brings back the alternative that was set aside');                                                             -- 5
reset role;

select is((select count(*)::int from public.person_destinations where person_id = (select id from pid)), 0, 'the wrong destination is gone'); -- 6
select is((select count(*)::int from public.person_external_ids where person_id = (select id from pid)), 0, 'and its identifiers');            -- 7
select is((select status from public.import_row_external_matches where id = (select id::uuid from ex where ext like '%W1')), 'rejected',
  'the wrong match is now set aside');                                                                                 -- 8
select is((select status from public.import_row_external_matches where id = (select id::uuid from ex where ext like '%R1')), 'proposed',
  'the right one can be chosen again');                                                                                -- 9
select ok(exists(select 1 from public.audit_logs where subject_type = 'external_match' and metadata ->> 'undo' = 'true'
                   and metadata ->> 'reason' = 'A homonym in Singapore'), 'the undo is audited with its reason');      -- 10

set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
select is(public.steward_decide_external_match((select id::uuid from ex where ext like '%R1'), true), 'accepted', 'the right match is accepted'); -- 11
reset role;

select * from finish();

rollback;
