-- "Everything has a history" (docs/ROTEIRO.md fase 2, etapa F): projects,
-- stations and sites, expeditions, collections, species, photos, documents,
-- old maps and oral histories -- each with its own page, its years, its
-- place, its source, and the people and institutions linked to it.
--
-- Same rules as the rest of the record:
--   * a member's addition is PROPOSED until a steward accepts it;
--   * accepted items are PROVISIONAL (verification_status) -- never
--     confirmed by arrival;
--   * every item says what documents it (source_note);
--   * visibility is decided per item: 'members' (every signed-in member) or
--     'restricted' (its proposer and stewards only -- sensitive material).
-- Files live in the private 'heritage' bucket, opened with signed links.

create table public.heritage_kinds (
  key text primary key,
  label text not null,
  plural text not null,
  is_media boolean not null default false,
  sort_order integer not null
);

insert into public.heritage_kinds (key, label, plural, is_media, sort_order) values
  ('project',      'Project',      'Projects',       false, 10),
  ('site',         'Station or site', 'Stations and sites', false, 20),
  ('expedition',   'Expedition',   'Expeditions',    false, 30),
  ('collection',   'Collection',   'Collections',    false, 40),
  ('species',      'Species',      'Species',        false, 50),
  ('photo',        'Photo',        'Photos',         true,  60),
  ('document',     'Document',     'Documents',      true,  70),
  ('map',          'Old map',      'Old maps',       true,  80),
  ('oral_history', 'Oral history', 'Oral histories', true,  90);

alter table public.heritage_kinds enable row level security;
create policy heritage_kinds_read on public.heritage_kinds for select to anon, authenticated using (true);

create table public.heritage_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null references public.heritage_kinds (key),
  title text not null,
  summary text,
  scientific_name text,
  start_year integer,
  end_year integer,
  is_ongoing boolean not null default false,
  place text,
  latitude double precision,
  longitude double precision,
  organization_id uuid references public.organizations (id) on delete set null,
  file_path text,
  external_url text,
  source_note text not null,
  visibility text not null default 'members',
  review_status text not null default 'proposed',
  verification_status text not null default 'provisional',
  decision_note text,
  proposed_by_user_id uuid references auth.users (id) on delete set null,
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint heritage_title_len check (char_length(btrim(title)) between 2 and 300),
  constraint heritage_summary_len check (summary is null or char_length(summary) <= 5000),
  constraint heritage_source_present check (char_length(btrim(source_note)) between 1 and 1000),
  constraint heritage_years check (
    (start_year is null or start_year between 1500 and 2100)
    and (end_year is null or end_year between 1500 and 2100)
    and (end_year is null or start_year is null or end_year >= start_year)
    and (not is_ongoing or end_year is null)),
  constraint heritage_coords check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)),
  constraint heritage_url check (external_url is null or external_url ~ '^https?://'),
  constraint heritage_visibility_valid check (visibility in ('members', 'restricted')),
  constraint heritage_review_valid check (review_status in ('proposed', 'accepted', 'rejected')),
  constraint heritage_verification_valid check (verification_status in ('provisional', 'confirmed'))
);

create index heritage_items_kind_idx on public.heritage_items (kind, review_status);

comment on table public.heritage_items is
  'Projects, sites, expeditions, collections, species, photos, documents, old maps and '
  'oral histories. Proposed until a steward accepts; provisional until confirmed. '
  'Read only through the heritage_* functions.';

create table public.heritage_links (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.heritage_items (id) on delete cascade,
  person_id uuid references public.people (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  other_item_id uuid references public.heritage_items (id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  constraint heritage_links_one_target check (num_nonnulls(person_id, organization_id, other_item_id) = 1),
  constraint heritage_links_not_self check (other_item_id is null or other_item_id <> item_id),
  constraint heritage_links_role_len check (role is null or char_length(role) <= 120)
);

create unique index heritage_links_unique on public.heritage_links
  (item_id, coalesce(person_id, organization_id, other_item_id));

alter table public.heritage_items enable row level security;
alter table public.heritage_links enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('heritage', 'heritage', false, 52428800,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
              'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'text/plain'])
on conflict (id) do nothing;

create policy heritage_insert_own_folder on storage.objects
  for insert to authenticated
  with check (bucket_id = 'heritage' and (storage.foldername(name))[1] = auth.uid()::text);

-- Who may see an item: accepted + members-visible to any member; otherwise
-- its proposer and stewards.
create function public.can_see_heritage_item(p_user uuid, i public.heritage_items)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user is not null and (
    (i.review_status = 'accepted' and i.visibility = 'members')
    or i.proposed_by_user_id = p_user
    or public.is_any_steward(p_user));
$$;

revoke all on function public.can_see_heritage_item(uuid, public.heritage_items) from public, anon, authenticated;

-- Files are readable by whoever can see the item that holds them.
create policy heritage_read_visible on storage.objects
  for select to authenticated
  using (bucket_id = 'heritage' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_any_steward(auth.uid())
    or exists (select 1 from public.heritage_items i
                where i.file_path = name and public.can_see_heritage_item(auth.uid(), i))));

create function public.heritage_item_json(i public.heritage_items, p_full boolean)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'kindLabel', k.label, 'isMedia', k.is_media, 'title', i.title, 'summary', i.summary,
    'scientificName', i.scientific_name, 'startYear', i.start_year, 'endYear', i.end_year, 'isOngoing', i.is_ongoing,
    'place', i.place, 'latitude', i.latitude, 'longitude', i.longitude,
    'organizationId', i.organization_id, 'organizationName', o.name,
    'hasFile', i.file_path is not null, 'externalUrl', i.external_url, 'sourceNote', i.source_note,
    'visibility', i.visibility, 'reviewStatus', i.review_status, 'verificationStatus', i.verification_status,
    'decisionNote', case when p_full then i.decision_note end,
    'isMine', i.proposed_by_user_id = auth.uid(), 'createdAt', i.created_at,
    'filePath', case when p_full then i.file_path end,
    'links', case when p_full then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'role', l.role,
               'personId', l.person_id, 'personName', p.display_name,
               'organizationId', l.organization_id, 'organizationName', lo.name,
               'itemId', l.other_item_id, 'itemTitle', oi.title, 'itemKind', oi.kind)
             order by coalesce(p.display_name, lo.name, oi.title))
        from public.heritage_links l
        left join public.people p on p.id = l.person_id
        left join public.organizations lo on lo.id = l.organization_id
        left join public.heritage_items oi on oi.id = l.other_item_id
       where l.item_id = i.id
         and (l.other_item_id is null or public.can_see_heritage_item(auth.uid(), oi))), '[]'::jsonb) end)
  from public.heritage_kinds k
  left join public.organizations o on o.id = i.organization_id
  where k.key = i.kind;
$$;

revoke all on function public.heritage_item_json(public.heritage_items, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- propose_heritage_item(payload): members propose, stewards add directly
-- (accepted, still provisional). Returns the id.
-- ---------------------------------------------------------------------------
create function public.propose_heritage_item(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_steward boolean;
  v_id uuid;
  v_file text := nullif(btrim(coalesce(p ->> 'filePath', '')), '');
  v_link jsonb;
begin
  if v_uid is null then
    raise exception 'propose_heritage_item: sign in first' using errcode = '42501';
  end if;
  v_steward := public.is_any_steward(v_uid);
  if not v_steward and (select count(*) from public.heritage_items
                         where proposed_by_user_id = v_uid and created_at > now() - interval '1 day') >= 50 then
    raise exception 'propose_heritage_item: daily limit reached' using errcode = '54000';
  end if;
  if v_file is not null and split_part(v_file, '/', 1) <> v_uid::text then
    raise exception 'propose_heritage_item: the file must be one of your own uploads' using errcode = '42501';
  end if;

  insert into public.heritage_items
    (kind, title, summary, scientific_name, start_year, end_year, is_ongoing, place, latitude, longitude,
     organization_id, file_path, external_url, source_note, visibility, review_status, proposed_by_user_id,
     decided_by_user_id, decided_at)
  values (
    p ->> 'kind', btrim(coalesce(p ->> 'title', '')), nullif(btrim(coalesce(p ->> 'summary', '')), ''),
    nullif(btrim(coalesce(p ->> 'scientificName', '')), ''),
    (p ->> 'startYear')::integer, (p ->> 'endYear')::integer, coalesce((p ->> 'isOngoing')::boolean, false),
    nullif(btrim(coalesce(p ->> 'place', '')), ''),
    (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
    nullif(p ->> 'organizationId', '')::uuid, v_file, nullif(btrim(coalesce(p ->> 'externalUrl', '')), ''),
    btrim(coalesce(p ->> 'sourceNote', '')), coalesce(nullif(p ->> 'visibility', ''), 'members'),
    case when v_steward then 'accepted' else 'proposed' end, v_uid,
    case when v_steward then v_uid end, case when v_steward then now() end)
  returning id into v_id;

  if jsonb_typeof(p -> 'links') = 'array' then
    if jsonb_array_length(p -> 'links') > 50 then
      raise exception 'propose_heritage_item: at most 50 links' using errcode = '23514';
    end if;
    for v_link in select value from jsonb_array_elements(p -> 'links') loop
      insert into public.heritage_links (item_id, person_id, organization_id, other_item_id, role)
      values (v_id, nullif(v_link ->> 'personId', '')::uuid, nullif(v_link ->> 'organizationId', '')::uuid,
              nullif(v_link ->> 'itemId', '')::uuid, nullif(btrim(coalesce(v_link ->> 'role', '')), ''))
      on conflict do nothing;
    end loop;
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (v_uid, 'create', 'heritage_item', v_id, left(btrim(p ->> 'title'), 200),
          jsonb_build_object('kind', p ->> 'kind', 'bySteward', v_steward));
  return v_id;
end;
$$;

revoke all on function public.propose_heritage_item(jsonb) from public, anon;
grant execute on function public.propose_heritage_item(jsonb) to authenticated;

-- Link an existing item to a person / institution / item (proposer or steward).
create function public.link_heritage_item(p_item_id uuid, p jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_i public.heritage_items%rowtype;
begin
  select * into v_i from public.heritage_items where id = p_item_id;
  if not found or auth.uid() is null
     or not (v_i.proposed_by_user_id = auth.uid() or public.is_any_steward(auth.uid())) then
    raise exception 'link_heritage_item: not allowed' using errcode = '42501';
  end if;
  insert into public.heritage_links (item_id, person_id, organization_id, other_item_id, role)
  values (p_item_id, nullif(p ->> 'personId', '')::uuid, nullif(p ->> 'organizationId', '')::uuid,
          nullif(p ->> 'itemId', '')::uuid, nullif(btrim(coalesce(p ->> 'role', '')), ''))
  on conflict do nothing;
end;
$$;

revoke all on function public.link_heritage_item(uuid, jsonb) from public, anon;
grant execute on function public.link_heritage_item(uuid, jsonb) to authenticated;

-- Lists. Alphabetical within a kind, never ranked.
create function public.list_heritage_items(p_kind text default null, p_query text default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(public.heritage_item_json(i, false) order by i.title), '[]'::jsonb)
    from public.heritage_items i
   where public.can_see_heritage_item(auth.uid(), i)
     and i.review_status <> 'rejected'
     and (p_kind is null or i.kind = p_kind)
     and (p_query is null or btrim(p_query) = ''
          or public.fold_text(i.title || ' ' || coalesce(i.scientific_name, '') || ' ' || coalesce(i.place, ''))
             like '%' || public.fold_text(btrim(p_query)) || '%');
$$;

revoke all on function public.list_heritage_items(text, text) from public, anon;
grant execute on function public.list_heritage_items(text, text) to authenticated;

create function public.heritage_counts()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', k.key, 'label', k.label, 'plural', k.plural, 'isMedia', k.is_media,
           'count', (select count(*) from public.heritage_items i
                      where i.kind = k.key and i.review_status <> 'rejected' and public.can_see_heritage_item(auth.uid(), i)))
           order by k.sort_order), '[]'::jsonb)
    from public.heritage_kinds k;
$$;

revoke all on function public.heritage_counts() from public, anon;
grant execute on function public.heritage_counts() to authenticated;

create function public.get_heritage_item(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.heritage_item_json(i, true) from public.heritage_items i
   where i.id = p_id and public.can_see_heritage_item(auth.uid(), i);
$$;

revoke all on function public.get_heritage_item(uuid) from public, anon;
grant execute on function public.get_heritage_item(uuid) to authenticated;

-- What the archive holds about one person or institution.
create function public.heritage_for(p_person_id uuid default null, p_organization_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.j || jsonb_build_object('role', x.role) order by x.j ->> 'kind', x.j ->> 'title'), '[]'::jsonb)
    from (select distinct on (i.id) public.heritage_item_json(i, false) as j, l.role
            from public.heritage_items i
            left join public.heritage_links l on l.item_id = i.id
           where i.review_status = 'accepted'
             and public.can_see_heritage_item(auth.uid(), i)
             and ((p_person_id is not null and l.person_id = p_person_id)
                  or (p_organization_id is not null and (l.organization_id = p_organization_id or i.organization_id = p_organization_id)))
           order by i.id) x;
$$;

revoke all on function public.heritage_for(uuid, uuid) from public, anon;
grant execute on function public.heritage_for(uuid, uuid) to authenticated;

-- Review: accept (stays provisional), reject (with a reason), confirm.
create function public.steward_decide_heritage_item(p_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_i public.heritage_items%rowtype;
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'steward_decide_heritage_item: steward required' using errcode = '42501';
  end if;
  select * into v_i from public.heritage_items where id = p_id for update;
  if not found then
    raise exception 'steward_decide_heritage_item: not found' using errcode = 'P0002';
  end if;
  if p_decision not in ('accept', 'reject', 'confirm') then
    raise exception 'steward_decide_heritage_item: unknown decision' using errcode = '22023';
  end if;
  if p_decision in ('accept', 'reject') and v_i.proposed_by_user_id = auth.uid() then
    raise exception 'steward_decide_heritage_item: someone else reviews your own proposal' using errcode = '42501';
  end if;
  if p_decision = 'reject' and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'steward_decide_heritage_item: a rejection needs a reason' using errcode = '22023';
  end if;
  if p_decision = 'confirm' and v_i.review_status <> 'accepted' then
    raise exception 'steward_decide_heritage_item: accept before confirming' using errcode = '22023';
  end if;

  update public.heritage_items
     set review_status = case p_decision when 'reject' then 'rejected' else 'accepted' end,
         verification_status = case when p_decision = 'confirm' then 'confirmed' else verification_status end,
         decision_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), decision_note),
         decided_by_user_id = auth.uid(), decided_at = now()
   where id = p_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case p_decision when 'reject' then 'reject' when 'confirm' then 'update' else 'approve' end,
          'heritage_item', p_id, left(v_i.title, 200), jsonb_build_object('decision', p_decision));
end;
$$;

revoke all on function public.steward_decide_heritage_item(uuid, text, text) from public, anon;
grant execute on function public.steward_decide_heritage_item(uuid, text, text) to authenticated;

create function public.steward_list_heritage_proposals()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'steward_list_heritage_proposals: steward required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(public.heritage_item_json(i, true) order by i.created_at), '[]'::jsonb)
            from public.heritage_items i where i.review_status = 'proposed');
end;
$$;

revoke all on function public.steward_list_heritage_proposals() from public, anon;
grant execute on function public.steward_list_heritage_proposals() to authenticated;

create function public.list_heritage_kinds()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'label', label, 'plural', plural, 'isMedia', is_media) order by sort_order), '[]'::jsonb)
    from public.heritage_kinds;
$$;

grant execute on function public.list_heritage_kinds() to authenticated;
