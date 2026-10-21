-- Public person pages (docs/ROTEIRO.md etapa 2 "vitrine pública";
-- docs/PRODUTO.md screen 01).
--
-- Reconciles two rules that both stand:
--   * PRODUTO.md: a person's page can exist, and be found, before they sign in.
--   * docs/privacy-model.md: information about an unregistered person NEVER
--     becomes public automatically -- only by the person's own choice after
--     claiming, or by "a deliberate, accountable decision" of an administrator.
-- So: nothing is public by default. A page becomes public only through
--   steward_set_person_public()  -- a reviewer, with a written reason, audited;
--   set_my_person_public()       -- the person themselves, through their active
--                                   account link, audited.
-- What a public page shows is deliberately narrow: name, deceased flag,
-- demonstration flag, whether it is claimed, and the person's documented
-- participations (institution, capacity, dates, provenance) -- excluding
-- disputed ones and excluding free-text summaries. Nothing else is exposed.

alter table public.people
  add column is_public boolean not null default false,
  add column published_at timestamptz,
  add column published_by_user_id uuid references auth.users (id) on delete set null;

alter table public.people
  add constraint people_published_at_matches_public check ((is_public) = (published_at is not null));

comment on column public.people.is_public is
  'True only after an accountable decision (steward_set_person_public or '
  'set_my_person_public). Never true by default -- docs/privacy-model.md.';

create index people_is_public_idx on public.people (is_public) where is_public;


-- ---------------------------------------------------------------------------
create function public.steward_set_person_public(p_person_id uuid, p_public boolean, p_reason text default null)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'steward_set_person_public: authentication required';
  end if;
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_set_person_public: reviewer authorization required';
  end if;
  if p_public is null then
    raise exception 'steward_set_person_public: choose public or not public';
  end if;

  select display_name into v_name
    from public.people where id = p_person_id and verification_status <> 'merged'
    for update;
  if not found then
    raise exception 'steward_set_person_public: person not found';
  end if;

  if p_public and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'steward_set_person_public: a reason is required to publish';
  end if;

  update public.people
     set is_public = p_public,
         published_at = case when p_public then coalesce(published_at, now()) else null end,
         published_by_user_id = case when p_public then auth.uid() else null end
   where id = p_person_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'person', p_person_id, v_name,
          jsonb_build_object('change', case when p_public then 'published' else 'unpublished' end,
                             'by', 'steward', 'reason', nullif(btrim(coalesce(p_reason, '')), '')));

  return p_public;
end;
$$;

comment on function public.steward_set_person_public(uuid, boolean, text) is
  'A reviewer publishes or unpublishes a person page. Publishing needs a '
  'written reason (privacy-model.md: a deliberate, accountable decision). Audited.';

revoke all on function public.steward_set_person_public(uuid, boolean, text) from public;
revoke all on function public.steward_set_person_public(uuid, boolean, text) from anon;
grant execute on function public.steward_set_person_public(uuid, boolean, text) to authenticated;


-- ---------------------------------------------------------------------------
create function public.set_my_person_public(p_public boolean)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_person uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'set_my_person_public: authentication required';
  end if;
  if p_public is null then
    raise exception 'set_my_person_public: choose public or not public';
  end if;

  select l.person_id, p.display_name into v_person, v_name
    from public.user_person_links l
    join public.people p on p.id = l.person_id
   where l.user_id = auth.uid() and l.status = 'active' and p.verification_status <> 'merged'
   limit 1;
  if v_person is null then
    raise exception 'set_my_person_public: no person record is linked to this account';
  end if;

  update public.people
     set is_public = p_public,
         published_at = case when p_public then coalesce(published_at, now()) else null end,
         published_by_user_id = case when p_public then auth.uid() else null end
   where id = v_person;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'person', v_person, v_name,
          jsonb_build_object('change', case when p_public then 'published' else 'unpublished' end, 'by', 'self'));

  return v_person;
end;
$$;

comment on function public.set_my_person_public(boolean) is
  'The person themselves (via their active account link) makes their page '
  'public or private. Audited.';

revoke all on function public.set_my_person_public(boolean) from public;
revoke all on function public.set_my_person_public(boolean) from anon;
grant execute on function public.set_my_person_public(boolean) to authenticated;


-- ---------------------------------------------------------------------------
-- get_public_person(person_id): readable by anyone, signed in or not.
-- Returns null unless the page is public. The participation part has the same
-- shape as get_person_participation() so the app reuses one parser.
-- ---------------------------------------------------------------------------
create function public.get_public_person(p_person_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_participations jsonb;
begin
  select * into v_person
    from public.people
   where id = p_person_id and is_public and verification_status <> 'merged';
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', pa.id,
             'organization', jsonb_build_object('id', org.id, 'name', org.name, 'short_name', org.short_name),
             'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
             'summary', null,
             'temporal', jsonb_build_object(
               'start_date', pa.start_date,
               'start_precision', pa.start_precision,
               'end_date', pa.end_date,
               'end_precision', pa.end_precision,
               'is_approximate', pa.is_approximate,
               'is_ongoing', pa.is_ongoing,
               'date_is_unknown', pa.date_is_unknown,
               'date_is_uncertain', pa.date_is_uncertain),
             'provenance', jsonb_build_object('source_type', pa.source_type, 'verification_status', pa.verification_status))
           order by pa.start_date asc nulls last, pa.created_at asc), '[]'::jsonb)
    into v_participations
    from public.participations pa
    join public.organizations org on org.id = pa.organization_id
    join public.participation_capacities cap on cap.key = pa.capacity
   where pa.person_id = v_person.id
     and pa.verification_status <> 'disputed';

  return jsonb_build_object(
    'person', jsonb_build_object(
      'id', v_person.id,
      'displayName', v_person.display_name,
      'isDeceased', v_person.is_deceased,
      'isDemo', v_person.is_demo,
      'isClaimed', exists (select 1 from public.user_person_links l where l.person_id = v_person.id and l.status = 'active'),
      'publishedAt', v_person.published_at),
    'participation', jsonb_build_object('person_id', v_person.id, 'participations', v_participations)
  );
end;
$$;

comment on function public.get_public_person(uuid) is
  'Public person page: null unless the page was deliberately made public. Name, '
  'flags and non-disputed participations only; no summaries, no other fields. '
  'Granted to anon by design.';

revoke all on function public.get_public_person(uuid) from public;
grant execute on function public.get_public_person(uuid) to anon, authenticated;


-- ---------------------------------------------------------------------------
create function public.list_public_people()
returns table (id uuid, display_name text, is_demo boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.display_name, p.is_demo
    from public.people p
   where p.is_public and p.verification_status <> 'merged'
   order by p.display_name, p.id;
$$;

comment on function public.list_public_people() is
  'Directory of public person pages, alphabetical. Granted to anon by design.';

revoke all on function public.list_public_people() from public;
grant execute on function public.list_public_people() to anon, authenticated;
