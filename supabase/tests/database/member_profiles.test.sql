-- pgTAP tests for member profiles and the avatars bucket
-- (supabase/migrations/20261023090000_add_member_profiles.sql).
-- Self-contained; rolls back.

create extension if not exists pgtap;

begin;

select plan(14);

\set alice 'ad000000-0000-4000-8000-0000000000a1'
\set bob   'ad000000-0000-4000-8000-0000000000a2'

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  (:'alice', 'authenticated', 'authenticated', 'profile-alice@example.test', 'x', now(), now(), now()),
  (:'bob',   'authenticated', 'authenticated', 'profile-bob@example.test',   'x', now(), now(), now());

select ok((select not public from storage.buckets where id = 'avatars'), 'the avatars bucket exists and is private'); -- 1

set local role authenticated;
set local request.jwt.claim.sub to :'alice';

select lives_ok(
  format($$insert into public.member_profiles (user_id, display_name, headline, location, website, orcid, photo_path)
           values (%L, 'Alice Field', 'Doctoral student', 'Manaus', 'https://example.org', '0000-0002-1825-0097', %L)$$,
         :'alice', :'alice' || '/photo.jpg'),
  'a member creates their own profile'); -- 2

select throws_ok(
  format($$insert into public.member_profiles (user_id, display_name) values (%L, 'Not me')$$, :'bob'),
  '42501', null, 'a member cannot create someone else''s profile'); -- 3

select throws_ok(
  format($$update public.member_profiles set website = 'javascript:alert(1)' where user_id = %L$$, :'alice'),
  '23514', null, 'a website must be an http(s) address'); -- 4

select throws_ok(
  format($$update public.member_profiles set orcid = '1234' where user_id = %L$$, :'alice'),
  '23514', null, 'an ORCID must have the ORCID shape'); -- 5

select throws_ok(
  format($$update public.member_profiles set photo_path = %L where user_id = %L$$, :'bob' || '/x.jpg', :'alice'),
  '23514', null, 'a profile photo must sit in the owner''s own folder'); -- 6

select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('avatars', %L)$$, :'alice' || '/photo.jpg'),
  'a member uploads into their own photo folder'); -- 7

select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('avatars', %L)$$, :'bob' || '/photo.jpg'),
  '42501', null, 'a member cannot upload into someone else''s folder'); -- 8

-- Bob, another signed-in member, reads Alice's card while it is for members.
set local request.jwt.claim.sub to :'bob';
select is((select display_name from public.member_profiles where user_id = :'alice'), 'Alice Field',
  'other members can read a members-visible profile'); -- 9

update public.member_profiles set display_name = 'Hijacked' where user_id = :'alice';
set local request.jwt.claim.sub to :'alice';
select is((select display_name from public.member_profiles where user_id = :'alice'), 'Alice Field',
  'another member cannot change the profile'); -- 10

update public.member_profiles set visibility = 'private' where user_id = :'alice';
set local request.jwt.claim.sub to :'bob';
select is((select count(*)::int from public.member_profiles where user_id = :'alice'), 0,
  'a private profile is hidden from other members'); -- 11

set local request.jwt.claim.sub to :'alice';
select is((select count(*)::int from public.member_profiles where user_id = :'alice'), 1,
  'the owner still sees their private profile'); -- 12

select throws_ok(
  format($$update public.member_profiles set visibility = 'public' where user_id = %L$$, :'alice'),
  '23514', null, 'visibility is members or private only'); -- 13

reset role;
set local role anon;
select throws_ok('select count(*) from public.member_profiles', '42501', null,
  'signed-out visitors cannot read profiles'); -- 14

select * from finish();
rollback;
