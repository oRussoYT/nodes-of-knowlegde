-- Contribution curation: candidate -> human review -> record.
-- (ROTEIRO etapa 0: one of the Mac pieces, rebuilt.)
--
-- Until now a contribution could only enter the record by hand in the
-- database. This adds the honest path: anyone signed in proposes a
-- contribution for their OWN linked person (a steward may propose for people
-- documented at their institution); it waits as a CANDIDATE -- visibly
-- distinct from the record and never read as fact; a steward in scope (or a
-- platform reviewer) accepts or rejects it with a note. Only acceptance
-- writes to contributions / person_contributions, as provisional, with the
-- candidate's source note kept. Every decision is audited. The proposer can
-- never accept their own proposal.

create table public.contribution_candidates (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  proposed_by_user_id uuid not null references auth.users (id),

  title text not null,
  contribution_kind text not null references public.contribution_kinds (key),
  capacity text not null references public.contribution_capacities (key),
  description text,
  start_year int,
  end_year int,
  -- What documents it (a thesis, a report, a field book). Required: the
  -- record is documented, not declared.
  source_note text not null,
  source_type text not null,

  status text not null default 'pending',
  decided_by_user_id uuid references auth.users (id),
  decided_at timestamptz,
  decision_note text,
  contribution_id uuid references public.contributions (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint contribution_candidates_title_not_blank check (btrim(title) <> ''),
  constraint contribution_candidates_source_not_blank check (btrim(source_note) <> ''),
  constraint contribution_candidates_status_valid check (status in ('pending', 'accepted', 'rejected')),
  constraint contribution_candidates_source_type_valid check (source_type in ('self_reported', 'nominated_by_other')),
  constraint contribution_candidates_years_valid check (
    (start_year is null or start_year between 1500 and 2100)
    and (end_year is null or end_year between 1500 and 2100)
    and (end_year is null or start_year is not null)
    and (end_year is null or end_year >= start_year)
  ),
  constraint contribution_candidates_decision_consistent check (
    (status = 'pending') = (decided_at is null)
  )
);

comment on table public.contribution_candidates is
  'Proposed contributions waiting for a human. NOT part of the record: nothing '
  'here is read as fact until a steward accepts it, which writes a provisional '
  'contribution. Deny-by-default; reached only through the functions below.';

create index contribution_candidates_person_idx on public.contribution_candidates (person_id);
create index contribution_candidates_pending_idx on public.contribution_candidates (status) where status = 'pending';

alter table public.contribution_candidates enable row level security;
grant select, insert, update, delete on public.contribution_candidates to service_role;

-- ---------------------------------------------------------------------
-- Internal: may this user steward this person? Platform reviewers always;
-- an institution steward when the person is documented at their institution.
-- ---------------------------------------------------------------------
create function public.can_steward_person(p_user_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null and p_person_id is not null and (
    public.is_active_reviewer(p_user_id)
    or exists (
      select 1
        from public.participations pa
        join public.institution_stewards s
          on s.organization_id = pa.organization_id and s.user_id = p_user_id and s.status = 'active'
       where pa.person_id = p_person_id)
  );
$$;

revoke all on function public.can_steward_person(uuid, uuid) from public;
revoke all on function public.can_steward_person(uuid, uuid) from anon, authenticated;

-- ---------------------------------------------------------------------
-- list_contribution_options(): the controlled vocabularies for the form.
-- ---------------------------------------------------------------------
create function public.list_contribution_options()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'kinds', coalesce((select jsonb_agg(jsonb_build_object('key', k.key, 'label', k.label) order by k.sort_order, k.label)
                         from public.contribution_kinds k where k.is_active), '[]'::jsonb),
    'capacities', coalesce((select jsonb_agg(jsonb_build_object('key', c.key, 'label', c.label) order by c.sort_order, c.label)
                              from public.contribution_capacities c where c.is_active), '[]'::jsonb));
$$;

revoke all on function public.list_contribution_options() from public;
grant execute on function public.list_contribution_options() to authenticated;

-- ---------------------------------------------------------------------
-- propose_contribution(...)
-- ---------------------------------------------------------------------
create function public.propose_contribution(
  p_person_id uuid,
  p_title text,
  p_contribution_kind text,
  p_capacity text,
  p_source_note text,
  p_description text default null,
  p_start_year int default null,
  p_end_year int default null,
  p_organization_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_own boolean;
  v_title text := btrim(coalesce(p_title, ''));
  v_source text := btrim(coalesce(p_source_note, ''));
begin
  if auth.uid() is null then
    raise exception 'propose_contribution: authentication required' using errcode = '42501';
  end if;
  select exists (
    select 1 from public.user_person_links l
     where l.user_id = auth.uid() and l.person_id = p_person_id and l.status = 'active')
    into v_own;
  if not v_own and not public.can_steward_person(auth.uid(), p_person_id) then
    raise exception 'propose_contribution: you can only propose for your own record' using errcode = '42501';
  end if;
  if v_title = '' then
    raise exception 'propose_contribution: a title is required';
  end if;
  if v_source = '' then
    raise exception 'propose_contribution: say what documents it';
  end if;
  if not exists (select 1 from public.contribution_kinds k where k.key = p_contribution_kind and k.is_active) then
    raise exception 'propose_contribution: unknown kind of contribution';
  end if;
  if not exists (select 1 from public.contribution_capacities c where c.key = p_capacity and c.is_active) then
    raise exception 'propose_contribution: unknown capacity';
  end if;
  if (p_start_year is not null and (p_start_year < 1500 or p_start_year > 2100))
     or (p_end_year is not null and (p_end_year < 1500 or p_end_year > 2100)) then
    raise exception 'propose_contribution: years must be between 1500 and 2100';
  end if;
  if p_end_year is not null and (p_start_year is null or p_end_year < p_start_year) then
    raise exception 'propose_contribution: the end year needs a start year before it';
  end if;

  insert into public.contribution_candidates (
    person_id, organization_id, proposed_by_user_id, title, contribution_kind, capacity,
    description, start_year, end_year, source_note, source_type)
  values (
    p_person_id, p_organization_id, auth.uid(), v_title, p_contribution_kind, p_capacity,
    nullif(btrim(coalesce(p_description, '')), ''), p_start_year, p_end_year, v_source,
    case when v_own then 'self_reported' else 'nominated_by_other' end)
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'contribution_candidate', v_id, v_title,
          jsonb_build_object('personId', p_person_id, 'kind', p_contribution_kind, 'capacity', p_capacity));
  return v_id;
end;
$$;

revoke all on function public.propose_contribution(uuid, text, text, text, text, text, int, int, uuid) from public;
grant execute on function public.propose_contribution(uuid, text, text, text, text, text, int, int, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- my_contribution_candidates(): what I proposed, and what happened to it.
-- ---------------------------------------------------------------------
create function public.my_contribution_candidates()
returns table (
  id uuid, person_id uuid, display_name text, title text, contribution_kind text,
  status text, decision_note text, contribution_id uuid, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'my_contribution_candidates: authentication required' using errcode = '42501';
  end if;
  return query
  select c.id, c.person_id, p.display_name, c.title, c.contribution_kind,
         c.status, c.decision_note, c.contribution_id, c.created_at
    from public.contribution_candidates c
    join public.people p on p.id = c.person_id
   where c.proposed_by_user_id = auth.uid()
   order by c.created_at desc;
end;
$$;

revoke all on function public.my_contribution_candidates() from public;
grant execute on function public.my_contribution_candidates() to authenticated;

-- ---------------------------------------------------------------------
-- steward_list_contribution_candidates(): pending ones this steward may decide.
-- Oldest first (a queue, not a ranking).
-- ---------------------------------------------------------------------
create function public.steward_list_contribution_candidates()
returns table (
  id uuid, person_id uuid, display_name text, title text,
  contribution_kind text, kind_label text, capacity text, capacity_label text,
  description text, start_year int, end_year int, source_note text, source_type text,
  is_own_proposal boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_list_contribution_candidates: authentication required' using errcode = '42501';
  end if;
  if not public.is_any_steward(auth.uid()) then
    raise exception 'steward_list_contribution_candidates: reviewer authorization required' using errcode = '42501';
  end if;
  return query
  select c.id, c.person_id, p.display_name, c.title,
         c.contribution_kind, k.label, c.capacity, cap.label,
         c.description, c.start_year, c.end_year, c.source_note, c.source_type,
         c.proposed_by_user_id = auth.uid(), c.created_at
    from public.contribution_candidates c
    join public.people p on p.id = c.person_id
    join public.contribution_kinds k on k.key = c.contribution_kind
    join public.contribution_capacities cap on cap.key = c.capacity
   where c.status = 'pending'
     and public.can_steward_person(auth.uid(), c.person_id)
   order by c.created_at, c.id;
end;
$$;

revoke all on function public.steward_list_contribution_candidates() from public;
grant execute on function public.steward_list_contribution_candidates() to authenticated;

-- ---------------------------------------------------------------------
-- steward_decide_contribution_candidate(id, 'accept'|'reject', note)
-- ---------------------------------------------------------------------
create function public.steward_decide_contribution_candidate(
  p_candidate_id uuid,
  p_decision text,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_c public.contribution_candidates%rowtype;
  v_contribution uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then
    raise exception 'steward_decide_contribution_candidate: authentication required' using errcode = '42501';
  end if;
  select * into v_c from public.contribution_candidates c where c.id = p_candidate_id for update;
  if v_c.id is null then
    raise exception 'steward_decide_contribution_candidate: proposal not found';
  end if;
  if not public.can_steward_person(auth.uid(), v_c.person_id) then
    raise exception 'steward_decide_contribution_candidate: reviewer authorization required' using errcode = '42501';
  end if;
  if v_c.status <> 'pending' then
    raise exception 'steward_decide_contribution_candidate: this proposal was already decided';
  end if;
  if v_c.proposed_by_user_id = auth.uid() then
    raise exception 'steward_decide_contribution_candidate: someone else must review your own proposal';
  end if;
  if p_decision not in ('accept', 'reject') then
    raise exception 'steward_decide_contribution_candidate: decide accept or reject';
  end if;
  if p_decision = 'reject' and v_note is null then
    raise exception 'steward_decide_contribution_candidate: say why it is rejected';
  end if;

  if p_decision = 'accept' then
    insert into public.contributions (
      title, contribution_kind, description,
      start_date, start_precision, end_date, end_precision, date_is_unknown,
      source_type, verification_status, created_by_user_id)
    values (
      v_c.title, v_c.contribution_kind, v_c.description,
      case when v_c.start_year is null then null else make_date(v_c.start_year, 1, 1) end,
      case when v_c.start_year is null then null else 'year' end,
      case when v_c.end_year is null then null else make_date(v_c.end_year, 1, 1) end,
      case when v_c.end_year is null then null else 'year' end,
      v_c.start_year is null,
      v_c.source_type, 'provisional', v_c.proposed_by_user_id)
    returning id into v_contribution;

    insert into public.person_contributions (contribution_id, person_id, capacity, attribution_note, source_type, verification_status)
    values (v_contribution, v_c.person_id, v_c.capacity, 'Documented by: ' || v_c.source_note, v_c.source_type, 'provisional');

    update public.contribution_candidates
       set status = 'accepted', decided_by_user_id = auth.uid(), decided_at = now(),
           decision_note = v_note, contribution_id = v_contribution
     where id = p_candidate_id;

    insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
    values (auth.uid(), 'approve', 'contribution_candidate', p_candidate_id, v_c.title,
            jsonb_build_object('contributionId', v_contribution, 'personId', v_c.person_id, 'note', v_note));
    return v_contribution;
  end if;

  update public.contribution_candidates
     set status = 'rejected', decided_by_user_id = auth.uid(), decided_at = now(), decision_note = v_note
   where id = p_candidate_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'reject', 'contribution_candidate', p_candidate_id, v_c.title,
          jsonb_build_object('personId', v_c.person_id, 'note', v_note));
  return null;
end;
$$;

revoke all on function public.steward_decide_contribution_candidate(uuid, text, text) from public;
grant execute on function public.steward_decide_contribution_candidate(uuid, text, text) to authenticated;
