-- pgTAP tests for contribution curation: candidate -> review -> record
-- (supabase/migrations/20261021100000_add_contribution_candidates.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(24);

\set platform 'ee000000-0000-4000-8000-0000000000a1'
\set granter  'ee000000-0000-4000-8000-0000000000a2'
\set st_a     'ee000000-0000-4000-8000-0000000000a3'
\set st_b     'ee000000-0000-4000-8000-0000000000a4'
\set me_user  'ee000000-0000-4000-8000-0000000000a5'
\set other_u  'ee000000-0000-4000-8000-0000000000a6'
\set org_a    'ee000000-0000-4000-8000-000000000010'
\set org_b    'ee000000-0000-4000-8000-000000000011'
\set me       'ee000000-0000-4000-8000-000000000001'
\set stranger 'ee000000-0000-4000-8000-000000000002'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'platform', 'authenticated', 'authenticated', 'cc-platform@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'cc-granter@example.test',  'x', now(), now(), now()),
  (:'st_a',     'authenticated', 'authenticated', 'cc-a@example.test',        'x', now(), now(), now()),
  (:'st_b',     'authenticated', 'authenticated', 'cc-b@example.test',        'x', now(), now(), now()),
  (:'me_user',  'authenticated', 'authenticated', 'cc-me@example.test',       'x', now(), now(), now()),
  (:'other_u',  'authenticated', 'authenticated', 'cc-other@example.test',    'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'platform', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org_a', 'Candidate University', 'university', 'active', 'imported_historical', 'provisional'),
       (:'org_b', 'Elsewhere Institute',  'university', 'active', 'imported_historical', 'provisional');
insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
values (:'org_a', :'st_a', :'platform'), (:'org_b', :'st_b', :'platform');
insert into public.people (id, given_name, family_name, display_name, verification_status, source_type)
values (:'me', 'Mae', 'Field', 'Mae Field', 'verified_self', 'self_reported'),
       (:'stranger', 'Sid', 'Else', 'Sid Else', 'provisional', 'imported_historical');
insert into public.user_person_links (user_id, person_id, status) values (:'me_user', :'me', 'active');
insert into public.participations (person_id, organization_id, capacity, date_is_unknown, source_type)
values (:'me', :'org_a', 'student', true, 'self_reported');

-- ---------------------------------------------------------------- propose
set local role anon;
select throws_ok(format($$ select public.propose_contribution(%L, 'T', 'training', 'training', 'S') $$, :'me'),
  '42501', NULL, 'signed-out visitors cannot propose');                                                           -- 1
reset role;

set local role authenticated;
set local request.jwt.claim.sub to :'me_user';
select ok(jsonb_array_length(public.list_contribution_options() -> 'kinds') > 10, 'the form gets the kinds');      -- 2
create temporary table cand on commit drop as
select public.propose_contribution(:'me', ' Bird census protocol ', 'method_or_protocol', 'protocol_development',
  'MSc thesis, 1998, chapter 2', 'A point-count protocol for fragments.', 1996, 1998) as id;
grant select on cand to authenticated;
select isnt((select id from cand), null, 'a person proposes a contribution for their own record');                -- 3
select throws_ok(format($$ select public.propose_contribution(%L, 'T', 'training', 'training', 'S') $$, :'stranger'),
  'propose_contribution: you can only propose for your own record', 'but not for someone else''s');              -- 4
select throws_ok(format($$ select public.propose_contribution(%L, 'T', 'training', 'training', '  ') $$, :'me'),
  'propose_contribution: say what documents it', 'a source is required');                                         -- 5
select throws_ok(format($$ select public.propose_contribution(%L, 'T', 'genius', 'training', 'S') $$, :'me'),
  'propose_contribution: unknown kind of contribution', 'only known kinds');                                       -- 6
select throws_ok(format($$ select public.propose_contribution(%L, 'T', 'training', 'training', 'S', null, null, 2000) $$, :'me'),
  'propose_contribution: the end year needs a start year before it', 'periods make sense');                        -- 7
select is((select status from public.my_contribution_candidates() where id = (select id from cand)), 'pending',
  'the proposer sees it waiting');                                                                                  -- 8
reset role;

select is((select count(*)::int from public.contributions where title = 'Bird census protocol'), 0,
  'a proposal is not in the record');                                                                               -- 9
select is((select source_type from public.contribution_candidates where id = (select id from cand)), 'self_reported',
  'marked as told by the person');                                                                                  -- 10

-- ---------------------------------------------------------------- review
set local role authenticated;
set local request.jwt.claim.sub to :'me_user';
select throws_ok($$ select * from public.steward_list_contribution_candidates() $$,
  'steward_list_contribution_candidates: reviewer authorization required', 'a member has no review queue');        -- 11
set local request.jwt.claim.sub to :'st_b';
select is((select count(*)::int from public.steward_list_contribution_candidates()), 0,
  'another institution''s steward does not see it');                                                                -- 12
select throws_ok(format($$ select public.steward_decide_contribution_candidate(%L, 'accept') $$, (select id from cand)),
  'steward_decide_contribution_candidate: reviewer authorization required', 'and cannot decide it');              -- 13
set local request.jwt.claim.sub to :'st_a';
select is((select count(*)::int from public.steward_list_contribution_candidates()), 1,
  'the steward of the person''s institution sees it');                                                              -- 14
select is((select kind_label from public.steward_list_contribution_candidates()), 'Method or protocol', 'with labels'); -- 15
select throws_ok(format($$ select public.steward_decide_contribution_candidate(%L, 'reject') $$, (select id from cand)),
  'steward_decide_contribution_candidate: say why it is rejected', 'a rejection needs a reason');                 -- 16
create temporary table made on commit drop as
select public.steward_decide_contribution_candidate((select id from cand), 'accept', 'Thesis checked.') as id;
grant select on made to authenticated;
select isnt((select id from made), null, 'accepting writes a contribution');                                       -- 17
select throws_ok(format($$ select public.steward_decide_contribution_candidate(%L, 'reject', 'x') $$, (select id from cand)),
  'steward_decide_contribution_candidate: this proposal was already decided', 'a proposal is decided once');      -- 18
reset role;

select is((select verification_status from public.contributions where id = (select id from made)), 'provisional',
  'the new record is provisional, not verified');                                                                   -- 19
select is((select start_precision from public.contributions where id = (select id from made)), 'year', 'dated to the year'); -- 20
select is((select count(*)::int from public.person_contributions where contribution_id = (select id from made) and person_id = :'me'), 1,
  'attributed to the person in the proposed capacity');                                                             -- 21
select ok((select attribution_note from public.person_contributions where contribution_id = (select id from made)) like '%MSc thesis%',
  'and keeps what documents it');                                                                                   -- 22
select ok(exists(select 1 from public.audit_logs where subject_type = 'contribution_candidate' and action = 'approve'),
  'the decision is audited');                                                                                       -- 23

-- A steward cannot approve their own proposal.
set local role authenticated;
set local request.jwt.claim.sub to :'st_a';
create temporary table own on commit drop as
select public.propose_contribution(:'me', 'Trail map', 'field_infrastructure', 'technical_construction', 'Station archive box 3') as id;
grant select on own to authenticated;
select throws_ok(format($$ select public.steward_decide_contribution_candidate(%L, 'accept') $$, (select id from own)),
  'steward_decide_contribution_candidate: someone else must review your own proposal', 'nobody reviews their own proposal'); -- 24
reset role;

select * from finish();

rollback;
