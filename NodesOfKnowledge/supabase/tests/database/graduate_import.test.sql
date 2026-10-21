-- pgTAP tests for the graduate-list import with human matching
-- (supabase/migrations/20261017110000_add_graduate_import.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(30);

\set reviewer 'e7000000-0000-4000-8000-0000000000a1'
\set granter  'e7000000-0000-4000-8000-0000000000a2'
\set ordinary 'e7000000-0000-4000-8000-0000000000a3'
\set org      'e7000000-0000-4000-8000-000000000010'
\set p_exact  'e7000000-0000-4000-8000-000000000001'
\set p_init   'e7000000-0000-4000-8000-000000000002'
\set p_merged 'e7000000-0000-4000-8000-000000000003'
\set p_atorg  'e7000000-0000-4000-8000-000000000004'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'imp-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'imp-granter@example.test',  'x', now(), now(), now()),
  (:'ordinary', 'authenticated', 'authenticated', 'imp-ordinary@example.test', 'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');

insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Importing University', 'university', 'active', 'imported_historical', 'provisional');

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values
  (:'p_exact',  'Zelia', 'Quorvan', 'Zelia Quorvan',   'provisional', 'imported_historical'),
  (:'p_init',   'Zara',  'Quorvan', 'Zara Quorvan',    'provisional', 'imported_historical'),
  (:'p_merged', 'Zelia', 'Quorvan', 'Zelia Quorvan',   'merged',      'imported_historical'),
  (:'p_atorg',  'Ilan',  'Brexton', 'Ilan Brexton',    'provisional', 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'p_atorg', :'org', 'researcher', true, 'imported_historical');

-- 1-2. Staging tables are closed to clients.
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';
select throws_ok($$ select * from public.import_rows $$, '42501', NULL, 'clients cannot read import_rows directly');
select throws_ok($$ select * from public.import_batches $$, '42501', NULL, 'clients cannot read import_batches directly');
reset role;

-- 3-4. anon / non-reviewer refused.
set local role anon;
select throws_ok($$ select public.steward_create_import_batch('x', null, '[{"givenName":"a","familyName":"b"}]') $$,
  '42501', NULL, 'anon cannot upload');
reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'ordinary';
select throws_ok($$ select public.steward_create_import_batch('x', null, '[{"givenName":"a","familyName":"b"}]') $$,
  'steward_create_import_batch: reviewer authorization required', 'non-reviewer cannot upload');
reset role;

-- 5-8. Validation is all-or-nothing, with the row number.
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';
select throws_ok($$ select public.steward_create_import_batch('Bad', null, '[{"givenName":"Ana","familyName":"Lima"},{"givenName":"","familyName":"X"}]') $$,
  'steward_create_import_batch: row 2 needs a given name and a family name', 'a row without a name rejects the upload');
select throws_ok($$ select public.steward_create_import_batch('Bad', null, '[{"givenName":"Ana","familyName":"Lima","graduationYear":"19x9"}]') $$,
  'steward_create_import_batch: row 1 has an unreadable graduation year', 'an unreadable year rejects the upload');
select throws_ok($$ select public.steward_create_import_batch('Bad', null, '[]') $$,
  'steward_create_import_batch: rows must be a non-empty list', 'an empty list is refused');
select throws_ok($$ select public.steward_create_import_batch('Bad', 'e7000000-0000-4000-8000-0000000000ff', '[{"givenName":"A","familyName":"B"}]') $$,
  'steward_create_import_batch: institution not found', 'an unknown institution is refused');

-- 9. A good upload.
create temporary table b on commit drop as
select public.steward_create_import_batch(
  'PhD graduates 2015-2020',
  :'org',
  '[{"givenName":"Zelia","familyName":"Quorvan","degree":"PhD","programme":"Ecology","graduationYear":2017},
    {"givenName":"Ilan","familyName":"Brexton","graduationYear":"2019"},
    {"givenName":"Nova","familyName":"Unheardof"},
    {"givenName":"Skip","familyName":"Me"}]'::jsonb
) as id;
grant select on b to authenticated;
select isnt((select id from b), null, 'the upload returns a batch id');

-- 10-11. Listing shows counts.
select is((select total from public.steward_list_import_batches() where id = (select id from b)), 4::bigint, 'batch lists 4 rows');
select is((select pending from public.steward_list_import_batches() where id = (select id from b)), 4::bigint, 'all 4 pending');

-- 12-17. Candidates: reasons, merged excluded, evidence flag.
create temporary table c on commit drop as
select r as row_doc from jsonb_array_elements(public.steward_import_candidates((select id from b)) -> 'rows') r;
grant select on c to authenticated;

select is((select count(*) from c), 4::bigint, 'four pending rows come back');
select is(
  (select cand ->> 'reason' from c, jsonb_array_elements(row_doc -> 'candidates') cand
    where row_doc ->> 'familyName' = 'Quorvan' and cand ->> 'personId' = :'p_exact'),
  'same_name', 'exact name is proposed as same_name');
select is(
  (select cand ->> 'reason' from c, jsonb_array_elements(row_doc -> 'candidates') cand
    where row_doc ->> 'familyName' = 'Quorvan' and cand ->> 'personId' = :'p_init'),
  'same_family_initial', 'same family + initial is proposed with its own reason');
select is(
  (select (row_doc -> 'candidates' -> 0 ->> 'personId') from c where row_doc ->> 'familyName' = 'Quorvan'),
  :'p_exact', 'same_name candidates come before weaker ones');
select ok(
  not exists (select 1 from c, jsonb_array_elements(row_doc -> 'candidates') cand where cand ->> 'personId' = :'p_merged'),
  'merged records are never proposed');
select is(
  (select (cand ->> 'documentedAtInstitution')::boolean from c, jsonb_array_elements(row_doc -> 'candidates') cand
    where row_doc ->> 'familyName' = 'Brexton'),
  true, 'a candidate already documented at the institution says so');

-- 18. Proposals change nothing.
reset role;
select is((select count(*) from public.participations where person_id = :'p_exact'), 0::bigint,
  'listing candidates writes nothing');
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';

-- 19-22. Match.
select is(
  public.steward_resolve_import_row(
    (select (row_doc ->> 'id')::uuid from c where row_doc ->> 'familyName' = 'Quorvan'), 'match', :'p_exact', 'Same thesis'),
  :'p_exact'::uuid, 'match returns the chosen person');
reset role;
select is((select status from public.import_rows where batch_id = (select id from b) and family_name = 'Quorvan'), 'matched', 'row is matched');
select is(
  (select summary from public.participations where person_id = :'p_exact' and organization_id = :'org'),
  'Graduated 2017 · PhD · Ecology · from the list "PhD graduates 2015-2020"',
  'match adds a documented student participation with year and degree in the summary');
select ok(
  (select date_is_unknown and capacity = 'student' and source_type = 'imported_historical'
     from public.participations where person_id = :'p_exact' and organization_id = :'org'),
  'the participation does not invent a date');
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';

-- 23. Cannot resolve twice.
select throws_ok(
  format($$ select public.steward_resolve_import_row(%L, 'skip') $$,
         (select (row_doc ->> 'id') from c where row_doc ->> 'familyName' = 'Quorvan')),
  'steward_resolve_import_row: row already resolved', 'a resolved row cannot be resolved again');

-- 24-26. Create.
create temporary table newp on commit drop as
select public.steward_resolve_import_row(
  (select (row_doc ->> 'id')::uuid from c where row_doc ->> 'familyName' = 'Unheardof'), 'create') as id;
reset role;
select ok(exists(select 1 from public.people where id = (select id from newp) and display_name = 'Nova Unheardof'
                 and source_type = 'imported_historical' and verification_status = 'provisional'),
  'create adds a provisional imported person');
select ok(exists(select 1 from public.participations where person_id = (select id from newp) and organization_id = :'org'),
  'the new person is documented at the institution');
select ok(exists(select 1 from public.audit_logs where subject_type = 'person' and subject_id = (select id from newp)),
  'the created person is audited');
set local role authenticated;
set local request.jwt.claim.sub to :'reviewer';

-- 27-28. Skip and argument checks.
select is(
  public.steward_resolve_import_row((select (row_doc ->> 'id')::uuid from c where row_doc ->> 'familyName' = 'Me'), 'skip', null, 'Not ours'),
  null::uuid, 'skip returns no person');
select throws_ok(
  format($$ select public.steward_resolve_import_row(%L, 'match') $$,
         (select (row_doc ->> 'id') from c where row_doc ->> 'familyName' = 'Brexton')),
  'steward_resolve_import_row: match needs a person', 'match without a person is refused');

-- 29-30. Final counts; pending rows no longer include resolved ones.
select is((select pending from public.steward_list_import_batches() where id = (select id from b)), 1::bigint, 'one row left pending');
select is(jsonb_array_length(public.steward_import_candidates((select id from b)) -> 'rows'), 1, 'candidates only list pending rows');
reset role;

select * from finish();

rollback;
