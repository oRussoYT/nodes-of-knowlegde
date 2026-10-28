-- The private research space (docs/ROTEIRO.md fase 2, etapa L): notes,
-- PDFs, interviews and hypotheses that belong to one member only. Nothing
-- here is part of the record, and no steward can read it. When a piece is
-- ready, the member sends it for review -- it becomes a PROPOSAL like any
-- other (an item of the history), and the private note keeps a link to it.

create table public.research_notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'note',
  title text not null,
  body text,
  file_path text,
  person_ids uuid[] not null default '{}',
  organization_ids uuid[] not null default '{}',
  submitted_item_id uuid references public.heritage_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_notes_kind check (kind in ('note', 'hypothesis', 'interview', 'reading')),
  constraint research_notes_title_len check (char_length(btrim(title)) between 1 and 300),
  constraint research_notes_body_len check (body is null or char_length(body) <= 100000),
  constraint research_notes_file_own check (file_path is null or split_part(file_path, '/', 1) = owner_user_id::text),
  constraint research_notes_links check (cardinality(person_ids) <= 50 and cardinality(organization_ids) <= 50)
);

create index research_notes_owner_idx on public.research_notes (owner_user_id, updated_at desc);

alter table public.research_notes enable row level security;
-- Owner only. Deliberately no steward/reviewer policy.
create policy research_notes_owner on public.research_notes for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace', 'workspace', false, 52428800,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'text/plain'])
on conflict (id) do nothing;

create policy workspace_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace' and (storage.foldername(name))[1] = auth.uid()::text);
create policy workspace_own_read on storage.objects for select to authenticated
  using (bucket_id = 'workspace' and (storage.foldername(name))[1] = auth.uid()::text);
create policy workspace_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'workspace' and (storage.foldername(name))[1] = auth.uid()::text);

create function public.research_note_json(n public.research_notes)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'filePath', n.file_path,
    'people', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'displayName', p.display_name) order by p.display_name)
                          from public.people p where p.id = any (n.person_ids)), '[]'::jsonb),
    'organizations', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name)
                          from public.organizations o where o.id = any (n.organization_ids)), '[]'::jsonb),
    'submittedItemId', n.submitted_item_id,
    'submittedStatus', (select i.review_status from public.heritage_items i where i.id = n.submitted_item_id),
    'createdAt', n.created_at, 'updatedAt', n.updated_at);
$$;

revoke all on function public.research_note_json(public.research_notes) from public, anon, authenticated;

create function public.my_research_notes(p_query text default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(public.research_note_json(n) order by n.updated_at desc), '[]'::jsonb)
    from public.research_notes n
   where n.owner_user_id = auth.uid()
     and (p_query is null or btrim(p_query) = ''
          or public.fold_text(n.title || ' ' || coalesce(n.body, '')) like '%' || public.fold_text(btrim(p_query)) || '%');
$$;

revoke all on function public.my_research_notes(text) from public, anon;
grant execute on function public.my_research_notes(text) to authenticated;

create function public.get_my_research_note(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.research_note_json(n) from public.research_notes n where n.id = p_id and n.owner_user_id = auth.uid();
$$;

revoke all on function public.get_my_research_note(uuid) from public, anon;
grant execute on function public.get_my_research_note(uuid) to authenticated;

create function public.save_research_note(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_people uuid[] := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(p -> 'personIds', '[]')) x), '{}');
  v_orgs uuid[] := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(p -> 'organizationIds', '[]')) x), '{}');
begin
  if auth.uid() is null then
    raise exception 'save_research_note: sign in first' using errcode = '42501';
  end if;
  if v_id is null then
    if (select count(*) from public.research_notes where owner_user_id = auth.uid()) >= 2000 then
      raise exception 'save_research_note: limit reached' using errcode = '54000';
    end if;
    insert into public.research_notes (owner_user_id, kind, title, body, file_path, person_ids, organization_ids)
    values (auth.uid(), coalesce(nullif(p ->> 'kind', ''), 'note'), btrim(coalesce(p ->> 'title', '')),
            nullif(p ->> 'body', ''), nullif(p ->> 'filePath', ''), v_people, v_orgs)
    returning id into v_id;
  else
    update public.research_notes
       set kind = coalesce(nullif(p ->> 'kind', ''), kind), title = btrim(coalesce(p ->> 'title', title)),
           body = nullif(p ->> 'body', ''), file_path = coalesce(nullif(p ->> 'filePath', ''), file_path),
           person_ids = v_people, organization_ids = v_orgs, updated_at = now()
     where id = v_id and owner_user_id = auth.uid();
    if not found then
      raise exception 'save_research_note: not found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_research_note(jsonb) from public, anon;
grant execute on function public.save_research_note(jsonb) to authenticated;

create function public.delete_research_note(p_id uuid)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  delete from public.research_notes where id = p_id and owner_user_id = auth.uid();
$$;

revoke all on function public.delete_research_note(uuid) from public, anon;
grant execute on function public.delete_research_note(uuid) to authenticated;

create function public.mark_research_note_submitted(p_id uuid, p_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.heritage_items i where i.id = p_item_id and i.proposed_by_user_id = auth.uid()) then
    raise exception 'mark_research_note_submitted: not your proposal' using errcode = '42501';
  end if;
  update public.research_notes set submitted_item_id = p_item_id, updated_at = now()
   where id = p_id and owner_user_id = auth.uid();
end;
$$;

revoke all on function public.mark_research_note_submitted(uuid, uuid) from public, anon;
grant execute on function public.mark_research_note_submitted(uuid, uuid) to authenticated;
