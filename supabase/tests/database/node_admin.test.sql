-- pgTAP tests for creating Nodes (supabase/migrations/20261029180000_add_node_admin.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(7);

\set reviewer 'eb200000-0000-4000-8000-0000000000a1'
\set granter  'eb200000-0000-4000-8000-0000000000a2'
\set member   'eb200000-0000-4000-8000-0000000000a3'
\set org      'eb200000-0000-4000-8000-000000000020'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'reviewer', 'authenticated', 'authenticated', 'na-rev@example.test', 'x', now(), now(), now()),
       (:'granter',  'authenticated', 'authenticated', 'na-gr@example.test',  'x', now(), now(), now()),
       (:'member',   'authenticated', 'authenticated', 'na-m@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'org', 'Second Station', 'field_station', 'active', 'admin_entered', 'provisional');

set local role authenticated;
set local request.jwt.claim.sub to :'member';
select throws_ok($$select public.steward_create_node('{"slug":"second","name":"Second Node"}'::jsonb)$$, '42501', null, 'members cannot create Nodes'); -- 1

set local request.jwt.claim.sub to :'reviewer';
select lives_ok($$select public.steward_create_node('{"slug":"second-node","name":"Second Node","shortName":"SN","plan":"paid"}'::jsonb)$$, 'a reviewer creates a Node'); -- 2
select throws_ok($$select public.steward_create_node('{"slug":"Bad Slug","name":"x"}'::jsonb)$$, '23514', null, 'slugs are simple'); -- 3
select lives_ok(format('select public.steward_set_node_organization(%L, %L, %L, true)', 'second-node', :'org', 'core'), 'and gives it an institution'); -- 4
select is((public.get_node('second-node') ->> 'name'), 'Second Node', 'the Node has its public page'); -- 5
select lives_ok($$select public.steward_update_node('second-node', '{"tagline":"A second history"}'::jsonb)$$, 'and can be edited'); -- 6
reset role;
select is((select count(*)::int from public.audit_logs where subject_type in ('node', 'node_organization') and subject_label in ('Second Node', 'second-node')), 3, 'all audited'); -- 7

select * from finish();
rollback;
