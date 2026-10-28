-- pgTAP tests for Knowledge Nodes
-- (supabase/migrations/20261028100000_add_knowledge_nodes.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(14);

\set reviewer 'b0000000-0000-4000-8000-0000000000a1'
\set granter  'b0000000-0000-4000-8000-0000000000a2'
\set member   'b0000000-0000-4000-8000-0000000000a3'
\set person   'b0000000-0000-4000-8000-000000000010'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'node-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'node-granter@example.test',  'x', now(), now(), now()),
  (:'member',   'authenticated', 'authenticated', 'node-member@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'person', 'Rita', 'Plot', 'Rita Plot', 'imported_historical');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, source_type)
select :'person', no.organization_id, 'field_assistant', '1984-01-01', 'year', 'imported_historical'
  from public.node_organizations no join public.nodes n on n.id = no.node_id
 where n.slug = 'pdbff' and no.role = 'core';

select is((select plan from public.nodes where slug = 'pdbff'), 'pro_bono', 'the first Node is PDBFF, pro bono'); -- 1
select is((select count(*)::int from public.node_organizations no join public.nodes n on n.id = no.node_id where n.slug = 'pdbff'), 3,
  'PDBFF gathers the project, its host and a partner'); -- 2

set local role anon;
select is(public.get_node('PDBFF') ->> 'shortName', 'PDBFF', 'anyone can read a Node, slug case ignored'); -- 3
select is((public.get_node('pdbff') -> 'counts' ->> 'people')::int, 1, 'the Node counts people documented at its institutions'); -- 4
select is((public.get_node('pdbff') -> 'counts' ->> 'firstYear')::int, 1984, 'and the first documented year'); -- 5
select ok(public.get_node('nope') is null, 'an unknown Node returns nothing'); -- 6
select ok(jsonb_array_length(public.list_nodes()) >= 1, 'active Nodes are listed'); -- 7
select throws_ok($$select public.join_node('pdbff')$$, '42501', null, 'signed-out visitors cannot join'); -- 8
select ok(not (public.get_node('pdbff')::text like '%Rita%'), 'a Node page carries no names'); -- 9

reset role;
set local role authenticated;
set local request.jwt.claim.sub to :'member';
select lives_ok($$select public.join_node('pdbff')$$, 'a member joins PDBFF'); -- 10
select ok((public.get_node('pdbff') ->> 'isMember')::boolean and jsonb_array_length(public.my_nodes()) = 1,
  'the member sees they are in the Node'); -- 11
select throws_ok($$select public.steward_set_node_plan('pdbff', 'paid', 'test')$$, '42501', null,
  'only platform reviewers change a plan'); -- 12

set local request.jwt.claim.sub to :'reviewer';
select throws_ok($$select public.steward_set_node_plan('pdbff', 'paid', ' ')$$, '22023', null, 'a reason is required'); -- 13
select public.steward_set_node_plan('pdbff', 'paid', 'testing the paid plan');
reset role;
select is((select count(*)::int from public.audit_logs where subject_type = 'node' and metadata ->> 'reason' = 'testing the paid plan'), 1,
  'a plan change is audited'); -- 14

select * from finish();
rollback;
