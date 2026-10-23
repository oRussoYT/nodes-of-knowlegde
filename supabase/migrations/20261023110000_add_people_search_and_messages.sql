-- Finding people and getting in touch.
--
-- 1. search_people(query): signed-in readers search by a person's name or an
--    institution's name and see, per person, where they were last documented,
--    how many institutions and works the record holds, and whether they can be
--    messaged here. Alphabetical -- never ranked (REGRAS: nunca ranquear pessoas).
-- 2. Messages between members, without ever exposing an email address:
--    a person can be messaged only when they have an account linked to their
--    record AND chose "accept messages" in their profile (off by default).
--    Replies to a received message are always allowed. At most 20 new
--    messages per sender per day.
-- 3. person_contact_options(person): what contact paths a record offers --
--    message here, or public ones (ORCID, OpenAlex) for people without an
--    account.

alter table public.member_profiles
  add column accepts_messages boolean not null default false;

comment on column public.member_profiles.accepts_messages is
  'Whether other signed-in members may send this member a message through the site. Off by default.';

create or replace function public.fold_text(p text)
returns text
language sql
immutable
as $$
  select lower(translate(coalesce(p, ''),
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝ',
    'aaaaaaeeeeiiiiooooouuuucnyyAAAAAAEEEEIIIIOOOOOUUUUCNY'));
$$;

-- ---------------------------------------------------------------------
-- search_people(query)
-- ---------------------------------------------------------------------
create function public.search_people(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_q text := nullif(btrim(public.fold_text(p_query)), '');
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_q is not null and char_length(v_q) > 100 then
    v_q := left(v_q, 100);
  end if;

  return coalesce((
    select jsonb_agg(row_data order by row_data ->> 'displayName')
      from (
        select jsonb_build_object(
          'id', p.id,
          'displayName', p.display_name,
          'verificationStatus', p.verification_status,
          'isDeceased', p.is_deceased,
          'lastInstitution', (
            select jsonb_build_object(
                     'organizationId', o.id,
                     'name', o.name,
                     'status', o.status,
                     'fromYear', extract(year from pa.start_date)::int,
                     'toYear', extract(year from coalesce(pa.end_date, pa.start_date))::int,
                     'ongoing', pa.is_ongoing)
              from public.participations pa
              join public.organizations o on o.id = pa.organization_id
             where pa.person_id = p.id and pa.verification_status <> 'disputed'
             order by pa.is_ongoing desc, coalesce(pa.end_date, pa.start_date) desc nulls last
             limit 1),
          'institutionsCount', (select count(distinct pa.organization_id) from public.participations pa where pa.person_id = p.id),
          'worksCount', (select count(*) from public.person_contributions pc where pc.person_id = p.id),
          'hasAccount', exists (select 1 from public.user_person_links l where l.person_id = p.id and l.status = 'active'),
          'acceptsMessages', exists (
            select 1 from public.user_person_links l
              join public.member_profiles m on m.user_id = l.user_id
             where l.person_id = p.id and l.status = 'active' and m.accepts_messages)
        ) as row_data
          from public.people p
         where p.verification_status <> 'merged'
           and (
             v_q is null
             or public.fold_text(p.display_name) like '%' || v_q || '%'
             or exists (
               select 1 from public.participations pa
                 join public.organizations o on o.id = pa.organization_id
                where pa.person_id = p.id
                  and (public.fold_text(o.name) like '%' || v_q || '%'
                       or public.fold_text(o.short_name) like '%' || v_q || '%'
                       or exists (select 1 from public.organization_names n
                                   where n.organization_id = o.id and public.fold_text(n.name) like '%' || v_q || '%')))
           )
         limit 300
      ) found
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.search_people(text) from public, anon;
grant execute on function public.search_people(text) to authenticated;

-- ---------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------
create table public.member_messages (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  about_person_id uuid references public.people (id) on delete set null,
  reply_to_id uuid references public.member_messages (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint member_messages_body_len check (char_length(btrim(body)) between 1 and 2000),
  constraint member_messages_not_self check (sender_user_id <> recipient_user_id)
);

create index member_messages_recipient_idx on public.member_messages (recipient_user_id, created_at desc);
create index member_messages_sender_idx on public.member_messages (sender_user_id, created_at desc);

alter table public.member_messages enable row level security;

-- Read your own conversations; all writes go through the functions below.
create policy member_messages_select_own on public.member_messages
  for select to authenticated
  using (sender_user_id = auth.uid() or recipient_user_id = auth.uid());

grant select on public.member_messages to authenticated;
revoke all on public.member_messages from anon;

create function public.member_label(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select m.display_name from public.member_profiles m where m.user_id = p_user_id and m.display_name is not null),
    (select pe.display_name from public.user_person_links l join public.people pe on pe.id = l.person_id
      where l.user_id = p_user_id and l.status = 'active' limit 1),
    'A member');
$$;

revoke all on function public.member_label(uuid) from public, anon, authenticated;

create function public.check_message_quota(p_sender uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.member_messages
       where sender_user_id = p_sender and created_at > now() - interval '1 day') >= 20 then
    raise exception 'daily message limit reached' using errcode = '54000';
  end if;
end;
$$;

revoke all on function public.check_message_quota(uuid) from public, anon, authenticated;

create function public.send_message_to_person(p_person_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_id uuid;
begin
  if v_sender is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select l.user_id into v_recipient
    from public.user_person_links l
    join public.member_profiles m on m.user_id = l.user_id and m.accepts_messages
   where l.person_id = p_person_id and l.status = 'active'
   limit 1;

  if v_recipient is null then
    raise exception 'this person does not accept messages here' using errcode = '42501';
  end if;
  if v_recipient = v_sender then
    raise exception 'you cannot message yourself' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'message must be 1 to 2000 characters' using errcode = '22023';
  end if;
  perform public.check_message_quota(v_sender);

  insert into public.member_messages (sender_user_id, recipient_user_id, about_person_id, body)
  values (v_sender, v_recipient, p_person_id, btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.send_message_to_person(uuid, text) from public, anon;
grant execute on function public.send_message_to_person(uuid, text) to authenticated;

create function public.reply_to_message(p_message_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_original public.member_messages%rowtype;
  v_id uuid;
begin
  select * into v_original from public.member_messages where id = p_message_id;
  if v_original.id is null or v_original.recipient_user_id is distinct from v_me then
    raise exception 'you can only reply to a message you received' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'message must be 1 to 2000 characters' using errcode = '22023';
  end if;
  perform public.check_message_quota(v_me);

  insert into public.member_messages (sender_user_id, recipient_user_id, about_person_id, reply_to_id, body)
  values (v_me, v_original.sender_user_id, null, v_original.id, btrim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.reply_to_message(uuid, text) from public, anon;
grant execute on function public.reply_to_message(uuid, text) to authenticated;

create function public.my_messages()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', mm.id,
             'direction', case when mm.recipient_user_id = v_me then 'received' else 'sent' end,
             'otherLabel', public.member_label(case when mm.recipient_user_id = v_me then mm.sender_user_id else mm.recipient_user_id end),
             'otherPersonId', (select l.person_id from public.user_person_links l
                                where l.user_id = case when mm.recipient_user_id = v_me then mm.sender_user_id else mm.recipient_user_id end
                                  and l.status = 'active' limit 1),
             'body', mm.body,
             'createdAt', mm.created_at,
             'read', mm.read_at is not null,
             'replyToId', mm.reply_to_id)
           order by mm.created_at desc)
      from (select * from public.member_messages
             where recipient_user_id = v_me or sender_user_id = v_me
             order by created_at desc limit 200) mm
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.my_messages() from public, anon;
grant execute on function public.my_messages() to authenticated;

create function public.mark_messages_read()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.member_messages set read_at = now()
   where recipient_user_id = auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_messages_read() from public, anon;
grant execute on function public.mark_messages_read() to authenticated;

create function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int from public.member_messages where recipient_user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.unread_message_count() from public, anon;
grant execute on function public.unread_message_count() to authenticated;

-- ---------------------------------------------------------------------
-- person_contact_options(person)
-- ---------------------------------------------------------------------
create function public.person_contact_options(p_person_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_user uuid;
  v_accepts boolean := false;
  v_orcid text;
begin
  if v_me is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select l.user_id, coalesce(m.accepts_messages, false)
    into v_user, v_accepts
    from public.user_person_links l
    left join public.member_profiles m on m.user_id = l.user_id
   where l.person_id = p_person_id and l.status = 'active'
   limit 1;

  v_orcid := coalesce(
    (select e.external_id from public.person_external_ids e where e.person_id = p_person_id and e.source = 'orcid' limit 1),
    (select 'https://orcid.org/' || m.orcid from public.member_profiles m
      where m.user_id = v_user and m.orcid is not null and m.visibility = 'members'));

  return jsonb_build_object(
    'hasAccount', v_user is not null,
    'isSelf', v_user is not null and v_user = v_me,
    'canMessage', v_user is not null and v_accepts and v_user <> v_me,
    'orcidUrl', v_orcid,
    'openalexUrl', (select e.external_id from public.person_external_ids e where e.person_id = p_person_id and e.source = 'openalex' limit 1));
end;
$$;

revoke all on function public.person_contact_options(uuid) from public, anon;
grant execute on function public.person_contact_options(uuid) to authenticated;
