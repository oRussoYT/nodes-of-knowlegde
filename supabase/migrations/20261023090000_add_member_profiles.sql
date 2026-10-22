-- Member profiles: the signed-in account's own card (photo, name, headline,
-- place, short biography, links), edited only by its owner.
--
-- Pessoa != conta (CLAUDE.md): this is the ACCOUNT's self-description, not
-- the person record. It never changes people.* or anything a steward
-- confirmed; it is what the member says about themselves, shown as such.
--
-- Visibility (CLAUDE.md "todo dado pessoal novo precisa de nível de
-- visibilidade decidido"): 'members' (default) -- any signed-in member may
-- read it; 'private' -- only the owner. Never readable signed out.
--
-- Photos live in the private storage bucket 'avatars', one folder per
-- account (<user id>/...). Owners write their own folder; signed-in members
-- may read photos (the app serves them through short-lived signed links).

create table public.member_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  headline text,
  location text,
  biography text,
  website text,
  orcid text,
  photo_path text,
  visibility text not null default 'members',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_profiles_visibility check (visibility in ('members', 'private')),
  constraint member_profiles_display_name_len check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  constraint member_profiles_headline_len check (headline is null or char_length(headline) <= 160),
  constraint member_profiles_location_len check (location is null or char_length(location) <= 120),
  constraint member_profiles_biography_len check (biography is null or char_length(biography) <= 2000),
  constraint member_profiles_website_format check (website is null or (website ~* '^https?://[^\s]+$' and char_length(website) <= 300)),
  constraint member_profiles_orcid_format check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  constraint member_profiles_photo_path_own_folder check (photo_path is null or split_part(photo_path, '/', 1) = user_id::text)
);

comment on table public.member_profiles is
  'A member''s own account card (photo, name, headline, place, bio, links). Self-edited; not the person record.';

create trigger member_profiles_set_updated_at
  before update on public.member_profiles
  for each row
  execute function public.set_updated_at();

alter table public.member_profiles enable row level security;

create policy member_profiles_select_own_or_members on public.member_profiles
  for select to authenticated
  using (user_id = auth.uid() or visibility = 'members');

create policy member_profiles_insert_own on public.member_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy member_profiles_update_own on public.member_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy member_profiles_delete_own on public.member_profiles
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.member_profiles to authenticated;
revoke all on public.member_profiles from anon;

-- Photos: private bucket, 5 MB, common image types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_read_members on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy avatars_insert_own_folder on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own_folder on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own_folder on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
