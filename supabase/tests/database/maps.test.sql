-- pgTAP tests for maps (supabase/migrations/20261029110000_add_maps.sql). Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(12);

\set reviewer 'e4000000-0000-4000-8000-0000000000a1'
\set granter  'e4000000-0000-4000-8000-0000000000a2'
\set member   'e4000000-0000-4000-8000-0000000000a3'
\set p1       'e4000000-0000-4000-8000-000000000010'
\set p2       'e4000000-0000-4000-8000-000000000011'
\set camp     'e4000000-0000-4000-8000-000000000020'
\set lab      'e4000000-0000-4000-8000-000000000021'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'reviewer', 'authenticated', 'authenticated', 'm-reviewer@example.test', 'x', now(), now(), now()),
  (:'granter',  'authenticated', 'authenticated', 'm-granter@example.test',  'x', now(), now(), now()),
  (:'member',   'authenticated', 'authenticated', 'm-member@example.test',   'x', now(), now(), now());
insert into public.reviewers (user_id, status, granted_by_user_id) values (:'reviewer', 'active', :'granter');
insert into public.people (id, given_name, family_name, display_name, source_type)
values (:'p1', 'Ana', 'Map', 'Ana Map', 'imported_historical'), (:'p2', 'Rui', 'Map', 'Rui Map', 'imported_historical');
insert into public.organizations (id, name, organization_type, status, source_type, verification_status)
values (:'camp', 'Map Camp', 'field_station', 'active', 'admin_entered', 'provisional'),
       (:'lab',  'Map Lab',  'laboratory',    'active', 'admin_entered', 'provisional');
insert into public.participations (person_id, organization_id, capacity, start_date, start_precision, end_date, end_precision, source_type)
values (:'p1', :'camp', 'field_assistant', '1990-01-01', 'year', '1995-01-01', 'year', 'imported_historical'),
       (:'p2', :'camp', 'researcher',      '1993-01-01', 'year', '1994-01-01', 'year', 'imported_historical'),
       (:'p1', :'lab',  'researcher',      '1996-01-01', 'year', null, null, 'imported_historical');
update public.participations set is_ongoing = true where person_id = :'p1' and organization_id = :'lab';

set local role authenticated;

-- 1-3: locations: members cannot set; stewards set directly or via proposals.
set local request.jwt.claim.sub to :'member';
select throws_ok(format('select public.steward_set_organization_location(%L, -2.4, -59.9)', :'camp'), '42501', null, 'members cannot place institutions'); -- 1
set local request.jwt.claim.sub to :'reviewer';
select lives_ok(format('select public.steward_set_organization_location(%L, -2.4, -59.9, %L, %L)', :'camp', 'br', 'Manaus'), 'a steward places the camp'); -- 2
create temporary table lp on commit drop as
select public.steward_propose_organization_location(:'lab', '{"latitude":45.5,"longitude":-73.6,"countryCode":"CA","city":"Montreal","source":"ror","matchedName":"Map Lab"}'::jsonb) as id;
grant select on lp to authenticated;
select is((select count(*)::int from jsonb_array_elements(public.steward_organizations_without_location()) o where o ->> 'id' = :'lab'), 0,
  'an institution with an open proposal is not asked again'); -- 3
select is(jsonb_array_length(public.steward_list_location_proposals()), 1, 'the proposal waits for a steward'); -- 4

-- 5: before acceptance the lab is not on the map.
set local request.jwt.claim.sub to :'member';
select is((select count(*)::int from jsonb_array_elements(public.map_places() -> 'places') p where p ->> 'name' like 'Map %'), 1, 'only located institutions are drawn'); -- 5
set local request.jwt.claim.sub to :'reviewer';
select lives_ok(format('select public.steward_decide_location_proposal(%L, true)', (select id from lp)), 'the steward accepts the location'); -- 6

-- 7-10: the map in time and today.
set local request.jwt.claim.sub to :'member';
select is((select (p ->> 'people')::int from jsonb_array_elements(public.map_places(1994) -> 'places') p where p ->> 'name' = 'Map Camp'), 2,
  'in 1994, two people were at the camp'); -- 7
select is((select (p ->> 'people')::int from jsonb_array_elements(public.map_places(1998) -> 'places') p where p ->> 'name' = 'Map Camp'), 0,
  'in 1998, nobody'); -- 8
select is((select (p ->> 'people')::int from jsonb_array_elements(public.map_places() -> 'places') p where p ->> 'name' = 'Map Lab'), 1,
  'now, one person at the lab'); -- 9
select is((select p ->> 'countryCode' from jsonb_array_elements(public.map_places() -> 'places') p where p ->> 'name' = 'Map Camp'), 'BR',
  'country codes are stored in capitals'); -- 10

-- 11-12: movements.
select is((select (m ->> 'people')::int from jsonb_array_elements(public.map_movements()) m
            where m ->> 'fromName' = 'Map Camp' and m ->> 'toName' = 'Map Lab'), 1, 'one person moved from the camp to the lab'); -- 11
reset role;
select is((select count(*)::int from public.audit_logs where subject_type = 'organization_location' and subject_id in (:'camp', :'lab')), 2,
  'location changes are audited'); -- 12

select * from finish();
rollback;
