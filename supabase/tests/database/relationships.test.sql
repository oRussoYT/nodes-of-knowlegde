-- pgTAP tests for Milestone M6.4: Relationship Engine.
--
-- Run locally via: npm run supabase:test  (supabase test db). Requires
-- `supabase start` (Docker). NOT executed in the authoring environment.
--
-- Scope: relationship_kinds / relationships (kind + directionality FK,
-- self-relationship policy, canonical reciprocal storage, duplicate
-- prevention, blank-narrative rejection, temporal + provenance invariants,
-- deny-by-default access) and get_person_relationships (authorization, BOTH-
-- SIDE projection with inverse labels, directional vs symmetric, merged
-- counterpart omission, chronological ordering, empty/merged/nonexistent).
-- Error assertions match on SQLSTATE; constraint/FK assertions additionally
-- match PostgreSQL's native message naming the specific constraint that fired.
-- Permission-denial assertions pass NULL for the message.

create extension if not exists pgtap;

begin;

select plan(45);

\set user_a '11111111-1111-1111-1111-111111111111'
\set person_c '22222222-2222-2222-2222-222222222222'
\set person_a '33333333-3333-3333-3333-333333333333'
\set person_b '44444444-4444-4444-4444-444444444444'
\set person_merged '55555555-5555-5555-5555-555555555555'
\set person_empty '66666666-6666-6666-6666-666666666666'

-- Independence: clear the NO ACTION people-child tables before people so this
-- suite does not abort on committed rows the e2e claim-workflow may leave on
-- the seeded people (profile_claims/user_person_links reference people ON
-- DELETE NO ACTION; both are empty in every other suite). No constraint is
-- weakened and FK enforcement stays on.
delete from public.user_person_links;
delete from public.profile_claims;
delete from public.people;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (:'user_a', 'authenticated', 'authenticated', 'user-a@example.test', 'x', now(), now(), now());

insert into public.people (id, given_name, family_name, display_name, verification_status, source_type) values
  (:'person_a', 'Alice', 'Aardvark', 'Alice Aardvark', 'provisional', 'imported_historical'),
  (:'person_b', 'Bob',   'Booker',   'Bob Booker',     'provisional', 'imported_historical'),
  (:'person_c', 'Carol', 'Carver',   'Carol Carver',   'provisional', 'imported_historical'),
  (:'person_merged', 'Mel', 'Merged', 'Mel Merged',    'merged',      'admin_entered'),
  (:'person_empty',  'Eve', 'Empty',  'Eve Empty',     'provisional', 'imported_historical');

-- Canonical records:
--   R1 mentorship (directional): Alice (mentor, source) -> Bob (student, target), 1987, with narrative.
--   R2 collaboration (symmetric): stored canonically Carol(22) -> Alice(33), 1990.
--   R3 mentorship: Alice -> Mel (merged), 1995 -- must be OMITTED on Alice's page.
insert into public.relationships
  (kind, is_directional, source_person_id, target_person_id, narrative, start_date, start_precision, source_type) values
  ('mentorship',    true,  :'person_a', :'person_b', 'Alice mentored Bob in the field.', '1987-01-01', 'year', 'imported_historical'),
  ('collaboration', false, :'person_c', :'person_a', null,                               '1990-01-01', 'year', 'imported_historical'),
  ('mentorship',    true,  :'person_a', :'person_merged', null,                          '1995-01-01', 'year', 'imported_historical');

-- ---- Constraint / integrity tests (SQLSTATE + native constraint name) ----
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('no_such_kind', true, '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "relationships" violates foreign key constraint "relationships_kind_fkey"',
  'unknown relationship kind rejected (FK)'
);
-- The row claims is_directional=true, but 'collaboration' is symmetric
-- (is_directional=false), so the composite FK (kind, is_directional) has no
-- matching relationship_kinds row and rejects it. The (kind, source, target)
-- triple ('collaboration', person_a, person_b) is used because it collides with
-- NO existing row -- otherwise relationships_unique (which does not include
-- is_directional) would fire first and mask this invariant.
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('collaboration', true, '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "relationships" violates foreign key constraint "relationships_kind_fkey"',
  'is_directional not matching the kind rejected (composite FK)'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', true, 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_no_self"',
  'self-relationship rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('collaboration', false, '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', true, 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_symmetric_canonical"',
  'symmetric relationship not in canonical order rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', true, 'admin_entered') $$,
  '23505',
  'duplicate key value violates unique constraint "relationships_unique"',
  'duplicate relationship rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, narrative, date_is_unknown, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '   ', true, 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_narrative_not_blank"',
  'blank narrative rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '1990-01-01', 'century', 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_start_precision_valid"',
  'invalid start_precision rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '1990-01-01', 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_start_precision_matches_date"',
  'start_date without precision rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', false, 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_unknown_iff_no_start"',
  'no start and not unknown rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, is_approximate, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', true, true, 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_unknown_excludes_qualifiers"',
  'undated + approximate rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, end_date, end_precision, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '1990-01-01', 'year', '1985-01-01', 'year', 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_end_after_start"',
  'end before start rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, start_date, start_precision, end_date, end_precision, is_ongoing, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '1990-01-01', 'year', '1992-01-01', 'year', true, 'admin_entered') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_ongoing_requires_open_start"',
  'ongoing with an end rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type, verification_status) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', true, 'admin_entered', 'made_up') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_verification_status_valid"',
  'invalid verification_status rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('mentorship', true, '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', true, 'made_up') $$,
  '23514',
  'new row for relation "relationships" violates check constraint "relationships_source_type_valid"',
  'invalid source_type rejected'
);
select throws_ok(
  $$ insert into public.relationships (kind, is_directional, source_person_id, target_person_id, date_is_unknown, source_type) values ('mentorship', true, 'a0000000-0000-0000-0000-0000000000ff', '33333333-3333-3333-3333-333333333333', true, 'admin_entered') $$,
  '23503',
  'insert or update on table "relationships" violates foreign key constraint "relationships_source_person_id_fkey"',
  'unknown source person rejected (FK)'
);
select throws_ok(
  $$ insert into public.relationship_kinds (key, label, is_directional, source_role_label, source_role_label_plural, target_role_label, target_role_label_plural) values ('bad_sym', 'Bad', false, 'RoleA', 'RoleAs', 'RoleB', 'RoleBs') $$,
  '23514',
  'new row for relation "relationship_kinds" violates check constraint "relationship_kinds_symmetric_roles_match"',
  'symmetric kind with mismatched roles rejected'
);

-- ---- Read-model existence + authorization ----
select has_function('public', 'get_person_relationships', array['uuid'], 'get_person_relationships(uuid) exists');

set local role anon;
select throws_ok(
  $$ select public.get_person_relationships('33333333-3333-3333-3333-333333333333') $$,
  '42501',
  NULL,
  'anon cannot execute get_person_relationships'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select public.get_person_relationships('33333333-3333-3333-3333-333333333333') $$,
  'get_person_relationships: authentication required',
  'get_person_relationships requires auth.uid()'
);
reset role;

set local role anon;
select throws_ok(
  $$ select 1 from public.relationships limit 1 $$,
  '42501',
  NULL,
  'anon cannot read relationships directly'
);
reset role;
set local role authenticated;
select throws_ok(
  $$ select 1 from public.relationships limit 1 $$,
  '42501',
  NULL,
  'authenticated cannot read relationships directly'
);
reset role;
set local role anon;
select throws_ok(
  $$ select 1 from public.relationship_kinds limit 1 $$,
  '42501',
  NULL,
  'anon cannot read relationship_kinds directly'
);
reset role;

-- ---- Read content, as an authenticated caller ----
set local role authenticated;
set local request.jwt.claim.sub to :'user_a';

-- Alice's page: two relationships (R1 mentorship 1987, R2 collaboration 1990);
-- the mentorship to the MERGED person (R3) is omitted.
select is(jsonb_array_length(public.get_person_relationships(:'person_a')->'relationships'), 2, 'Alice has two relationships (merged counterpart omitted)');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'counterpart'->>'display_name'), 'Bob Booker', 'earliest relationship counterpart is Bob');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'perspective'->>'counterpart_role_label'), 'Student', 'from the mentor''s page, the counterpart is the Student');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'perspective'->>'counterpart_role_label_plural'), 'Students', 'plural role label for grouping is Students');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'perspective'->>'direction'), 'outgoing', 'mentorship is outgoing from the mentor');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'perspective'->>'person_role_label'), 'Mentor', 'the viewed person''s role is Mentor');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'kind'->>'key'), 'mentorship', 'kind key resolved');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'kind'->>'is_directional'), 'true', 'kind directionality present');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->>'narrative'), 'Alice mentored Bob in the field.', 'curated narrative preserved');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'temporal'->>'start_date'), '1987-01-01', 'relationship start date preserved');
select is((public.get_person_relationships(:'person_a')->'relationships'->0->'provenance'->>'source_type'), 'imported_historical', 'relationship provenance present');
select is((public.get_person_relationships(:'person_a')->'relationships'->1->'counterpart'->>'display_name'), 'Carol Carver', 'second relationship counterpart is Carol');
select is((public.get_person_relationships(:'person_a')->'relationships'->1->'perspective'->>'counterpart_role_label'), 'Collaborator', 'symmetric counterpart role is Collaborator');
select is((public.get_person_relationships(:'person_a')->'relationships'->1->'perspective'->>'direction'), 'symmetric', 'collaboration is symmetric');

-- Bob's page: the SAME canonical mentorship record, projected with INVERSE
-- labels -- no duplicate row exists.
select is(jsonb_array_length(public.get_person_relationships(:'person_b')->'relationships'), 1, 'Bob has one relationship (the same canonical record)');
select is((public.get_person_relationships(:'person_b')->'relationships'->0->'counterpart'->>'display_name'), 'Alice Aardvark', 'from the student''s page, the counterpart is Alice');
select is((public.get_person_relationships(:'person_b')->'relationships'->0->'perspective'->>'counterpart_role_label'), 'Mentor', 'INVERSE label: from the student''s page, the counterpart is the Mentor');
select is((public.get_person_relationships(:'person_b')->'relationships'->0->'perspective'->>'counterpart_role_label_plural'), 'Mentors', 'inverse plural role label is Mentors');
select is((public.get_person_relationships(:'person_b')->'relationships'->0->'perspective'->>'direction'), 'incoming', 'mentorship is incoming to the student');
select is((public.get_person_relationships(:'person_b')->'relationships'->0->'perspective'->>'person_role_label'), 'Student', 'the viewed person''s role is Student');

-- Empty / merged / nonexistent.
select is((public.get_person_relationships(:'person_empty')->'relationships'), '[]'::jsonb, 'a person with no relationships gets an empty array, not null');
select is(public.get_person_relationships(:'person_merged'), null::jsonb, 'merged person returns null');
select is(public.get_person_relationships('99999999-9999-9999-9999-999999999999'), null::jsonb, 'nonexistent person returns null');

reset role;

select * from finish();

rollback;
