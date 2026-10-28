-- Advanced privacy and the network (docs/ROTEIRO.md fase 2, etapa M):
--   1. revelations limited by consent: a person can ask that their page not
--      show what the record reveals about them, and that they stay out of
--      connections, the librarian and suggestions;
--   2. sensitive material and Indigenous data sovereignty (CARE principles):
--      'community' material is seen and decided only by that community's own
--      stewards -- not by platform reviewers -- with Local Contexts-style
--      labels (TK/BC) shown on the item;
--   3. a forum per Node, for its members;
--   4. connections between Nodes (people in common, counted, never named).

-- 1. Consent -------------------------------------------------------------
create table public.person_privacy (
  person_id uuid primary key references public.people (id) on delete cascade,
  limit_revelations boolean not null default false,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.person_privacy enable row level security;

create function public.set_my_privacy(p_limit_revelations boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := public.my_linked_person();
begin
  if v_me is null then
    raise exception 'set_my_privacy: link your account to your record first' using errcode = '42501';
  end if;
  insert into public.person_privacy (person_id, limit_revelations, updated_by_user_id)
  values (v_me, p_limit_revelations, auth.uid())
  on conflict (person_id) do update set limit_revelations = excluded.limit_revelations,
    updated_by_user_id = excluded.updated_by_user_id, updated_at = now();
  -- limiting revelations also leaves everyone else's suggestions
  if p_limit_revelations then
    insert into public.suggestion_opt_outs (person_id) values (v_me) on conflict do nothing;
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'person_privacy', v_me, 'privacy', jsonb_build_object('limitRevelations', p_limit_revelations));
end;
$$;
revoke all on function public.set_my_privacy(boolean) from public, anon;
grant execute on function public.set_my_privacy(boolean) to authenticated;

create function public.person_privacy_view(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'limitRevelations', coalesce((select limit_revelations from public.person_privacy where person_id = p_person_id), false),
    'isSelf', p_person_id is not distinct from public.my_linked_person(),
    'viewerIsSteward', public.is_any_steward(auth.uid()))
   where auth.uid() is not null;
$$;
revoke all on function public.person_privacy_view(uuid) from public, anon;
grant execute on function public.person_privacy_view(uuid) to authenticated;

create function public.limits_revelations(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select limit_revelations from public.person_privacy where person_id = p_person_id), false);
$$;
revoke all on function public.limits_revelations(uuid) from public, anon, authenticated;

-- 2. Community material ---------------------------------------------------
create table public.care_labels (
  key text primary key,
  label text not null,
  description text not null,
  sort_order integer not null
);
insert into public.care_labels (key, label, description, sort_order) values
  ('tk_attribution', 'TK Attribution', 'Traditional knowledge: name the community whenever this is used.', 10),
  ('tk_non_commercial', 'TK Non-Commercial', 'Not to be used for commercial purposes.', 20),
  ('tk_community_use_only', 'TK Community Use Only', 'For the community''s own use; outside use needs its permission.', 30),
  ('tk_secret_sacred', 'TK Secret / Sacred', 'Secret or sacred material: not to be shown outside the community.', 40),
  ('tk_seasonal', 'TK Seasonal', 'Some knowledge belongs to certain times of the year.', 50),
  ('bc_provenance', 'BC Provenance', 'Biocultural: the community is the source of this material or specimen.', 60),
  ('bc_consent_verified', 'BC Consent Verified', 'The community gave consent for this use.', 70);
alter table public.care_labels enable row level security;
create policy care_labels_read on public.care_labels for select to authenticated using (true);

alter table public.heritage_items
  add column community_organization_id uuid references public.organizations (id) on delete restrict,
  add column care_labels text[] not null default '{}';
alter table public.heritage_items drop constraint heritage_visibility_valid;
alter table public.heritage_items add constraint heritage_visibility_valid check (visibility in ('members', 'restricted', 'community'));
alter table public.heritage_items add constraint heritage_community_needed check (visibility <> 'community' or community_organization_id is not null);

create function public.is_community_steward(p_user uuid, p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Only the community's own stewards -- platform reviewers do not count here.
  select p_user is not null and p_org is not null and exists (
    select 1 from public.institution_stewards s where s.user_id = p_user and s.organization_id = p_org and s.status = 'active');
$$;
revoke all on function public.is_community_steward(uuid, uuid) from public, anon, authenticated;

create or replace function public.can_see_heritage_item(p_user uuid, i public.heritage_items)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user is not null and (
    (i.review_status = 'accepted' and i.visibility = 'members')
    or i.proposed_by_user_id = p_user
    or (i.visibility in ('members', 'restricted') and public.is_any_steward(p_user))
    or (i.visibility = 'community' and public.is_community_steward(p_user, i.community_organization_id)));
$$;

create or replace function public.propose_heritage_item(p jsonb)
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
  v_community uuid := nullif(p ->> 'communityOrganizationId', '')::uuid;
  v_labels text[] := coalesce((select array_agg(distinct x) from jsonb_array_elements_text(coalesce(p -> 'careLabels', '[]')) x), '{}');
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
  if coalesce(p ->> 'visibility', '') = 'community' and (v_community is null or not exists (
       select 1 from public.organizations o where o.id = v_community
          and o.organization_type in ('indigenous_organization', 'community_organization'))) then
    raise exception 'propose_heritage_item: community material needs its community' using errcode = '23514';
  end if;
  -- community material is never accepted at once, except by that community's own stewards
  if coalesce(p ->> 'visibility', '') = 'community' then
    v_steward := public.is_community_steward(v_uid, v_community);
  end if;

  insert into public.heritage_items
    (kind, title, summary, scientific_name, start_year, end_year, is_ongoing, place, latitude, longitude,
     organization_id, file_path, external_url, source_note, visibility, review_status, proposed_by_user_id,
     decided_by_user_id, decided_at, community_organization_id, care_labels)
  values (
    p ->> 'kind', btrim(coalesce(p ->> 'title', '')), nullif(btrim(coalesce(p ->> 'summary', '')), ''),
    nullif(btrim(coalesce(p ->> 'scientificName', '')), ''),
    (p ->> 'startYear')::integer, (p ->> 'endYear')::integer, coalesce((p ->> 'isOngoing')::boolean, false),
    nullif(btrim(coalesce(p ->> 'place', '')), ''),
    (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
    nullif(p ->> 'organizationId', '')::uuid, v_file, nullif(btrim(coalesce(p ->> 'externalUrl', '')), ''),
    btrim(coalesce(p ->> 'sourceNote', '')), coalesce(nullif(p ->> 'visibility', ''), 'members'),
    case when v_steward then 'accepted' else 'proposed' end, v_uid,
    case when v_steward then v_uid end, case when v_steward then now() end, v_community, v_labels)
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

create or replace function public.steward_decide_heritage_item(p_id uuid, p_decision text, p_note text default null)
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
  if v_i.visibility = 'community' and not public.is_community_steward(auth.uid(), v_i.community_organization_id) then
    raise exception 'steward_decide_heritage_item: only the community decides about its material' using errcode = '42501';
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
  if p_decision = 'confirm' and (v_i.proposed_by_user_id = auth.uid() or v_i.decided_by_user_id = auth.uid()) then
    raise exception 'steward_decide_heritage_item: a second person confirms' using errcode = '42501';
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

create or replace function public.steward_list_heritage_proposals()
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
            from public.heritage_items i where i.review_status = 'proposed' and public.can_see_heritage_item(auth.uid(), i));
end;
$$;

create function public.heritage_care(p_item_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'community', (select jsonb_build_object('id', o.id, 'name', o.name) from public.organizations o where o.id = i.community_organization_id),
    'labels', coalesce((select jsonb_agg(jsonb_build_object('key', c.key, 'label', c.label, 'description', c.description) order by c.sort_order)
                          from public.care_labels c where c.key = any (i.care_labels)), '[]'::jsonb))
    from public.heritage_items i where i.id = p_item_id and public.can_see_heritage_item(auth.uid(), i);
$$;
revoke all on function public.heritage_care(uuid) from public, anon;
grant execute on function public.heritage_care(uuid) to authenticated;

create function public.list_care_options()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'labels', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'label', label, 'description', description) order by sort_order) from public.care_labels), '[]'::jsonb),
    'communities', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name)
                               from public.organizations o where o.organization_type in ('indigenous_organization', 'community_organization')), '[]'::jsonb))
   where auth.uid() is not null;
$$;
revoke all on function public.list_care_options() from public, anon;
grant execute on function public.list_care_options() to authenticated;

-- 3. Forum per Node -------------------------------------------------------
create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.nodes (id) on delete cascade,
  title text not null,
  author_user_id uuid references auth.users (id) on delete set null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  constraint forum_threads_title_len check (char_length(btrim(title)) between 3 and 200)
);
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint forum_posts_body_len check (char_length(btrim(body)) between 1 and 10000)
);
create index forum_posts_thread_idx on public.forum_posts (thread_id, created_at);
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;

create function public.is_node_member(p_node_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.node_members m where m.node_id = p_node_id and m.user_id = auth.uid())
    or public.is_any_steward(auth.uid()));
$$;
revoke all on function public.is_node_member(uuid) from public, anon, authenticated;

create function public.author_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select nullif(btrim(display_name), '') from public.member_profiles where user_id = p_user),
    (select p.display_name from public.user_person_links l join public.people p on p.id = l.person_id where l.user_id = p_user and l.status = 'active' limit 1),
    'A member');
$$;
revoke all on function public.author_name(uuid) from public, anon, authenticated;

create function public.forum_threads_for(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when public.is_node_member(n.id) then coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'author', public.author_name(t.author_user_id),
             'posts', (select count(*) from public.forum_posts p where p.thread_id = t.id and not p.is_hidden),
             'lastPostAt', t.last_post_at, 'createdAt', t.created_at) order by t.last_post_at desc)
      from public.forum_threads t where t.node_id = n.id and not t.is_hidden), '[]'::jsonb) end
    from public.nodes n where n.slug = p_slug;
$$;
revoke all on function public.forum_threads_for(text) from public, anon;
grant execute on function public.forum_threads_for(text) to authenticated;

create function public.forum_thread(p_thread_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when public.is_node_member(t.node_id) and not t.is_hidden then jsonb_build_object(
    'id', t.id, 'title', t.title, 'nodeSlug', (select slug from public.nodes where id = t.node_id),
    'canModerate', public.is_any_steward(auth.uid()),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'author', public.author_name(p.author_user_id),
               'body', p.body, 'createdAt', p.created_at, 'isMine', p.author_user_id = auth.uid()) order by p.created_at)
               from public.forum_posts p where p.thread_id = t.id and not p.is_hidden), '[]'::jsonb)) end
    from public.forum_threads t where t.id = p_thread_id;
$$;
revoke all on function public.forum_thread(uuid) from public, anon;
grant execute on function public.forum_thread(uuid) to authenticated;

create function public.forum_start_thread(p_slug text, p_title text, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_node uuid;
  v_id uuid;
begin
  select id into v_node from public.nodes where slug = p_slug;
  if v_node is null or not public.is_node_member(v_node) then
    raise exception 'forum_start_thread: join the Node first' using errcode = '42501';
  end if;
  if (select count(*) from public.forum_posts where author_user_id = auth.uid() and created_at > now() - interval '1 day') >= 100 then
    raise exception 'forum_start_thread: daily limit reached' using errcode = '54000';
  end if;
  insert into public.forum_threads (node_id, title, author_user_id) values (v_node, btrim(p_title), auth.uid()) returning id into v_id;
  insert into public.forum_posts (thread_id, author_user_id, body) values (v_id, auth.uid(), btrim(p_body));
  return v_id;
end;
$$;
revoke all on function public.forum_start_thread(text, text, text) from public, anon;
grant execute on function public.forum_start_thread(text, text, text) to authenticated;

create function public.forum_reply(p_thread_id uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_t public.forum_threads%rowtype;
  v_id uuid;
begin
  select * into v_t from public.forum_threads where id = p_thread_id;
  if not found or v_t.is_hidden or not public.is_node_member(v_t.node_id) then
    raise exception 'forum_reply: not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.forum_posts where author_user_id = auth.uid() and created_at > now() - interval '1 day') >= 100 then
    raise exception 'forum_reply: daily limit reached' using errcode = '54000';
  end if;
  insert into public.forum_posts (thread_id, author_user_id, body) values (p_thread_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update public.forum_threads set last_post_at = now() where id = p_thread_id;
  return v_id;
end;
$$;
revoke all on function public.forum_reply(uuid, text) from public, anon;
grant execute on function public.forum_reply(uuid, text) to authenticated;

-- Authors remove their own posts; stewards hide posts or threads (audited).
create function public.forum_hide_post(p_post_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_p public.forum_posts%rowtype;
begin
  select * into v_p from public.forum_posts where id = p_post_id;
  if not found or not (v_p.author_user_id = auth.uid() or public.is_active_reviewer(auth.uid())
       or exists (select 1 from public.forum_threads t join public.node_organizations no on no.node_id = t.node_id
                   where t.id = v_p.thread_id and public.is_community_steward(auth.uid(), no.organization_id))) then
    raise exception 'forum_hide_post: not allowed' using errcode = '42501';
  end if;
  update public.forum_posts set is_hidden = true where id = p_post_id;
  if v_p.author_user_id is distinct from auth.uid() then
    insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
    values (auth.uid(), 'update', 'forum_post', p_post_id, 'hidden by a steward', '{}'::jsonb);
  end if;
end;
$$;
revoke all on function public.forum_hide_post(uuid) from public, anon;
grant execute on function public.forum_hide_post(uuid) to authenticated;

-- 4. Connections between Nodes -------------------------------------------
create function public.node_links(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select id from public.nodes where slug = p_slug and status = 'active'),
  my_people as (
    select distinct pa.person_id from public.participations pa
     where pa.organization_id in (select organization_id from public.node_organizations where node_id = (select id from me))
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug', n.slug, 'name', n.name, 'shortName', n.short_name, 'peopleInCommon', x.c)
                             order by n.name), '[]'::jsonb)
    from (select no.node_id, count(distinct pa.person_id) as c
            from public.node_organizations no
            join public.participations pa on pa.organization_id = no.organization_id
           where no.node_id <> (select id from me) and pa.person_id in (select person_id from my_people)
           group by no.node_id) x
    join public.nodes n on n.id = x.node_id and n.status = 'active';
$$;
revoke all on function public.node_links(text) from public;
grant execute on function public.node_links(text) to anon, authenticated;

-- Files of community material: only the community's stewards (and the
-- proposer, whose folder it is) can open them -- not platform reviewers.
create function public.heritage_file_visible(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (select 1 from public.heritage_items i where i.file_path = p_name and public.can_see_heritage_item(auth.uid(), i)));
$$;
revoke all on function public.heritage_file_visible(text) from public, anon;
grant execute on function public.heritage_file_visible(text) to authenticated;

-- Policies run as the caller, so they use a granted helper that only looks
-- at the caller's own rights. Community files: only that community.
drop policy heritage_read_visible on storage.objects;
create policy heritage_read_visible on storage.objects
  for select to authenticated
  using (bucket_id = 'heritage' and public.heritage_file_visible(name));
