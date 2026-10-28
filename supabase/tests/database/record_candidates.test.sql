-- pgTAP tests for proposals that would change the record
-- (supabase/migrations/20261028120000_add_record_candidates.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(17);

\set reviewer 'd1000000-0000-4000-8000-0000000000a1'
\set granter  'd1000000-0000-4000-8000-0000000000a2'
\set ana      'd1000000-0000-4000-8000-0000000000a3'
\set bob      'd1000000-0000-4000-8000-0000000000a4'
\set p_ana    'd1000000-0000-4000-8000-000000000010'
\set p_rui    'd1000000-0000-4000-8000-000000000011'
\set org      'd1000000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'rc-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'rc-granter@example.test',  'x', now(), now(), now()),
  (:'ana',      'authenticated', 'authenticated', 'rc-ana@example.test',      'x', now(), now(), now()),
  (:'bob',      'authenticated', 'authenticated', 'rc-bob@example.test',      'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p_ana', 'Ana', 'Field', 'Ana Field', 'imported_historical'),
       (:'p_rui', 'Rui', 'Boat', 'Rui Boat', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Camp Station', 'field_station', 'active', 'admin_entered', 'provisional');
alter table public.user_person_links disable trigger user;
insert into public.user_person_links (user_id, person_id) values (:'ana', :'p_ana');
alter table public.user_person_links enable trigger user;

set local role authenticated;
set local request.jwt.claim.sub to :'ana';

-- 1-2: a period in her own history (self reported).
create temporary table c1 on commit drop as
select public.propose_record(jsonb_build_object(
  'kind', 'participation', 'aboutPersonId', :'p_ana', 'organizationId', :'org', 'capacity', 'field_assistant',
  'startYear', 1991, 'endYear', 1994, 'sourceNote', 'Field roster 1991, page 3')) as id;
grant select on c1 to authenticated;
select ok((select id from c1) is not null, 'a member proposes a period of her own history'); -- 1
select is(public.my_record_candidates() -> 0 ->> 'sourceType', 'self_reported', 'her own history is self reported'); -- 2

-- 3: "I worked with Joao", who is not in the record yet.
create temporary table c2 on commit drop as
select public.propose_record(jsonb_build_object(
  'kind', 'relationship', 'aboutPersonId', :'p_ana', 'relationshipKind', 'field_partnership',
  'colleagueGivenName', 'João', 'colleagueFamilyName', 'Mateiro', 'colleagueOrcid', '0000-0002-1825-0097',
  'startYear', 1992, 'sourceNote', 'We share the 1992 field book')) as id;
grant select on c2 to authenticated;
select ok((select id from c2) is not null, 'a member proposes a colleague not yet in the record'); -- 3

-- 4-6: shape and evidence rules.
select throws_ok(format($$select public.propose_record('{"kind":"participation","aboutPersonId":"%s","organizationId":"%s","capacity":"researcher","sourceNote":"  "}'::jsonb)$$, :'p_ana', :'org'),
  '23514', null, 'every proposal must say what documents it'); -- 4
select throws_ok(format($$select public.propose_record('{"kind":"participation","aboutPersonId":"%s","organizationId":"%s","capacity":"researcher","sourceNote":"x","evidencePaths":["%s/doc.pdf"]}'::jsonb)$$, :'p_ana', :'org', :'bob'),
  '42501', null, 'evidence must be the proposer''s own uploads'); -- 5
select throws_ok(format($$select public.propose_record('{"kind":"relationship","aboutPersonId":"%s","relationshipKind":"collaboration","colleaguePersonId":"%s","sourceNote":"x"}'::jsonb)$$, :'p_ana', :'p_ana'),
  '23514', null, 'no bond with oneself'); -- 6

-- 7: an import of the same external item is recorded once.
select is(
  public.propose_record(jsonb_build_object('kind', 'participation', 'aboutPersonId', :'p_ana', 'newOrganizationName', 'Old Lab',
    'capacity', 'researcher', 'sourceNote', 'ORCID', 'origin', 'orcid', 'externalKey', 'emp-1')),
  public.propose_record(jsonb_build_object('kind', 'participation', 'aboutPersonId', :'p_ana', 'newOrganizationName', 'Old Lab',
    'capacity', 'researcher', 'sourceNote', 'ORCID', 'origin', 'orcid', 'externalKey', 'emp-1')),
  'the same imported item is proposed only once'); -- 7

-- 8: Bob proposes about Rui (nominated by other).
set local request.jwt.claim.sub to :'bob';
select public.propose_record(jsonb_build_object('kind', 'participation', 'aboutPersonId', :'p_rui',
  'organizationId', :'org', 'capacity', 'other', 'startYear', 1985, 'sourceNote', 'Boat log 1985'));
select is(public.my_record_candidates() -> 0 ->> 'sourceType', 'nominated_by_other',
  'a proposal about someone else is marked as such'); -- 8
select throws_ok('select public.steward_list_record_candidates()', '42501', null, 'members cannot see the review queue'); -- 9
select throws_ok(format('select public.steward_decide_record_candidate(%L, true)', (select id from c1)), '42501', null,
  'members cannot decide'); -- 10

-- Nothing is in the record yet.
reset role;
select is((select count(*)::int from public.participations where person_id = :'p_ana'), 0, 'proposals are not the record'); -- 11
set local role authenticated;

set local request.jwt.claim.sub to :'reviewer';
select ok(jsonb_array_length(public.steward_list_record_candidates()) >= 4, 'the reviewer sees the queue'); -- 12
select throws_ok(format('select public.steward_decide_record_candidate(%L, false, %L)', (select id from c1), ''), '22023', null,
  'a rejection needs a reason'); -- 13
select lives_ok(format('select public.steward_decide_record_candidate(%L, true)', (select id from c1)), 'the reviewer accepts the period'); -- 14
select lives_ok(format('select public.steward_decide_record_candidate(%L, true)', (select id from c2)), 'and the colleague'); -- 15

reset role;
select is((select concat(capacity, ' ', extract(year from start_date), '-', extract(year from end_date), ' ', verification_status)
             from public.participations where person_id = :'p_ana'),
  'field_assistant 1991-1994 provisional', 'the accepted period is in the record, provisional'); -- 16
select is((select p.display_name || ' ' || p.verification_status || ' ' || r.kind
             from public.relationships r
             join public.people p on p.id = case when r.source_person_id = :'p_ana' then r.target_person_id else r.source_person_id end
            where :'p_ana' in (r.source_person_id, r.target_person_id)),
  'João Mateiro provisional field_partnership', 'the new colleague and the bond are created, provisional'); -- 17

select * from finish();
rollback;
