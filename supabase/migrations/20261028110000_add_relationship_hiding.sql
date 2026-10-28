-- "Hide this link from my page" (PRODUTO screen 04; ROTEIRO fase 2, etapa C).
--
-- The person a relationship is about may hide it from THEIR OWN page. The
-- relationship stays in the record (nothing is deleted, sources are kept) and
-- still shows on the other person's page; only this person's page stops
-- listing it. Only the account linked to that person can hide or bring it
-- back, and the person themselves still sees it, marked as hidden.

create table public.relationship_hides (
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  hidden_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (relationship_id, person_id)
);

alter table public.relationship_hides enable row level security;
-- No direct access; only the functions below and the reads use it.
revoke all on public.relationship_hides from anon, authenticated;

create function public.set_relationship_hidden(p_relationship_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select l.person_id into v_person
    from public.relationships r
    join public.user_person_links l
      on l.person_id in (r.source_person_id, r.target_person_id) and l.user_id = auth.uid() and l.status = 'active'
   where r.id = p_relationship_id
   limit 1;
  if v_person is null then
    raise exception 'only the person this link is about can hide it from their page' using errcode = '42501';
  end if;
  if p_hidden then
    insert into public.relationship_hides (relationship_id, person_id, hidden_by_user_id)
    values (p_relationship_id, v_person, auth.uid())
    on conflict do nothing;
  else
    delete from public.relationship_hides where relationship_id = p_relationship_id and person_id = v_person;
  end if;
end;
$$;

revoke all on function public.set_relationship_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_relationship_hidden(uuid, boolean) to authenticated;

create or replace function public.get_person_relationships(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_relationships jsonb;
  v_is_self boolean;
begin
  if auth.uid() is null then
    raise exception 'get_person_relationships: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;

  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  -- The person whose page this is (their linked account) sees every link,
  -- including the ones they hid, so they can bring them back.
  v_is_self := exists (select 1 from public.user_person_links l
                        where l.person_id = v_person.id and l.user_id = auth.uid() and l.status = 'active');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'is_directional', r.is_directional),
        'counterpart', jsonb_build_object('id', cp.id, 'display_name', cp.display_name),
        'perspective', jsonb_build_object(
          'person_role_label',
            case when r.source_person_id = v_person.id then k.source_role_label else k.target_role_label end,
          'counterpart_role_label',
            case when r.source_person_id = v_person.id then k.target_role_label else k.source_role_label end,
          'counterpart_role_label_plural',
            case when r.source_person_id = v_person.id then k.target_role_label_plural else k.source_role_label_plural end,
          'direction',
            case when not r.is_directional then 'symmetric'
                 when r.source_person_id = v_person.id then 'outgoing'
                 else 'incoming' end
        ),
        'narrative', r.narrative,
        'temporal', jsonb_build_object(
          'start_date', r.start_date,
          'start_precision', r.start_precision,
          'end_date', r.end_date,
          'end_precision', r.end_precision,
          'is_approximate', r.is_approximate,
          'is_ongoing', r.is_ongoing,
          'date_is_unknown', r.date_is_unknown,
          'date_is_uncertain', r.date_is_uncertain
        ),
        'provenance', jsonb_build_object(
          'source_type', r.source_type,
          'verification_status', r.verification_status
        ),
        'hidden', exists (select 1 from public.relationship_hides h where h.relationship_id = r.id and h.person_id = v_person.id),
        'canHide', v_is_self
      )
      order by r.start_date asc nulls last, r.created_at asc
    ),
    '[]'::jsonb
  )
  into v_relationships
  from public.relationships r
  join public.relationship_kinds k
    on k.key = r.kind and k.is_directional = r.is_directional
  join public.people cp
    on cp.id = (case when r.source_person_id = v_person.id then r.target_person_id else r.source_person_id end)
  where (r.source_person_id = v_person.id or r.target_person_id = v_person.id)
    and cp.verification_status <> 'merged'
    and (v_is_self or not exists (
      select 1 from public.relationship_hides h where h.relationship_id = r.id and h.person_id = v_person.id));

  return jsonb_build_object('person_id', v_person.id, 'relationships', v_relationships);
end;
$$;
