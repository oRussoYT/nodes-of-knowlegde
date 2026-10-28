-- How knowledge enters the record (ROTEIRO fase 2, etapa D).
--
-- One queue for proposals that would change the record:
--   * 'participation' -- a period of someone's history at an institution
--     (an existing institution, or a new one named in the proposal);
--   * 'relationship'  -- "I worked with João": a documented bond between a
--     person and a colleague, who may already be in the record or be named
--     here for the first time (a new provisional person is created only when
--     a steward accepts).
-- Anyone signed in may propose, for themselves (self_reported) or about
-- others (nominated_by_other) -- the record grows through the memories and
-- evidence of its community. Nothing is a fact until a steward in scope (or
-- a platform reviewer) accepts it; nobody decides their own proposal; a
-- rejection needs a reason; every step is audited. Each proposal must say
-- what documents it, and may carry files (private bucket 'evidence').
-- Imports from ORCID, Lattes and AI extraction land here too (origin), one
-- row per external item (external_key), so re-importing adds nothing twice.

create table public.record_candidates (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  origin text not null default 'form',
  external_key text,
  proposed_by_user_id uuid not null references auth.users (id),
  about_person_id uuid not null references public.people (id) on delete cascade,

  organization_id uuid references public.organizations (id) on delete set null,
  new_organization_name text,
  capacity text references public.participation_capacities (key),

  relationship_kind text,
  colleague_person_id uuid references public.people (id) on delete cascade,
  colleague_given_name text,
  colleague_family_name text,
  colleague_orcid text,

  start_year int,
  end_year int,
  is_ongoing boolean not null default false,
  summary text,
  source_note text not null,
  source_type text not null,
  evidence_paths text[] not null default '{}',

  status text not null default 'pending',
  decided_by_user_id uuid references auth.users (id),
  decided_at timestamptz,
  decision_note text,
  result_id uuid,
  created_at timestamptz not null default now(),

  constraint record_candidates_kind_valid check (kind in ('participation', 'relationship')),
  constraint record_candidates_origin_valid check (origin in ('form', 'orcid', 'lattes', 'ai')),
  constraint record_candidates_status_valid check (status in ('pending', 'accepted', 'rejected')),
  constraint record_candidates_source_type_valid check (source_type in ('self_reported', 'nominated_by_other')),
  constraint record_candidates_source_not_blank check (btrim(source_note) <> '' and char_length(source_note) <= 1000),
  constraint record_candidates_summary_len check (summary is null or char_length(summary) <= 2000),
  constraint record_candidates_years_valid check (
    (start_year is null or start_year between 1500 and 2100)
    and (end_year is null or end_year between 1500 and 2100)
    and (end_year is null or start_year is not null)
    and (end_year is null or end_year >= start_year)
    and not (is_ongoing and end_year is not null)
    and not (is_ongoing and start_year is null)
  ),
  constraint record_candidates_participation_shape check (
    kind <> 'participation' or (
      capacity is not null
      and ((organization_id is not null) <> (nullif(btrim(coalesce(new_organization_name, '')), '') is not null))
    )
  ),
  constraint record_candidates_relationship_shape check (
    kind <> 'relationship' or (
      relationship_kind is not null
      and ((colleague_person_id is not null) <> (
        nullif(btrim(coalesce(colleague_given_name, '')), '') is not null
        and nullif(btrim(coalesce(colleague_family_name, '')), '') is not null))
    )
  ),
  constraint record_candidates_not_self_bond check (colleague_person_id is null or colleague_person_id <> about_person_id),
  constraint record_candidates_orcid_format check (colleague_orcid is null or colleague_orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  constraint record_candidates_evidence_count check (cardinality(evidence_paths) <= 10),
  constraint record_candidates_decision_consistent check ((status = 'pending') = (decided_at is null))
);

comment on table public.record_candidates is
  'Proposals that would change the record (periods at institutions, documented bonds). NOT part of the record until a steward accepts.';

create index record_candidates_pending_idx on public.record_candidates (status, created_at) where status = 'pending';
create index record_candidates_about_idx on public.record_candidates (about_person_id);
create unique index record_candidates_external_once on public.record_candidates (proposed_by_user_id, origin, external_key)
  where external_key is not null;

alter table public.record_candidates enable row level security;
revoke all on public.record_candidates from anon, authenticated;

-- Evidence files: private bucket, the proposer's own folder; stewards read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 15728640,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/xml', 'application/xml'])
on conflict (id) do nothing;

create policy evidence_insert_own_folder on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy evidence_read_own_or_steward on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_any_steward(auth.uid())));

create policy evidence_delete_own_folder on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Options for the forms: capacities and bond kinds (controlled vocabularies).
-- ---------------------------------------------------------------------
create function public.list_record_options()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'capacities', coalesce((select jsonb_agg(jsonb_build_object('key', c.key, 'label', c.label) order by c.sort_order)
                             from public.participation_capacities c where c.is_active), '[]'::jsonb),
    'relationshipKinds', coalesce((select jsonb_agg(jsonb_build_object('key', k.key, 'label', k.label, 'isDirectional', k.is_directional) order by k.sort_order)
                                    from public.relationship_kinds k where k.is_active), '[]'::jsonb)
  );
$$;

revoke all on function public.list_record_options() from public, anon;
grant execute on function public.list_record_options() to authenticated;

-- ---------------------------------------------------------------------
-- propose_record(payload): one proposal. Returns its id (or the existing
-- one when the same external item was already proposed).
-- ---------------------------------------------------------------------
create function public.propose_record(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_about uuid := (p ->> 'aboutPersonId')::uuid;
  v_kind text := p ->> 'kind';
  v_origin text := coalesce(p ->> 'origin', 'form');
  v_own boolean;
  v_id uuid;
  v_paths text[];
  v_rel_kind text := nullif(p ->> 'relationshipKind', '');
  v_org uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_about is null or not exists (select 1 from public.people where id = v_about and verification_status <> 'merged') then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.record_candidates where proposed_by_user_id = v_user and created_at > now() - interval '1 day') >= 200 then
    raise exception 'daily proposal limit reached' using errcode = '54000';
  end if;
  if v_rel_kind is not null and not exists (select 1 from public.relationship_kinds k where k.key = v_rel_kind and k.is_active) then
    raise exception 'unknown kind of bond' using errcode = '22023';
  end if;

  select coalesce(array_agg(x), '{}') into v_paths
    from jsonb_array_elements_text(coalesce(p -> 'evidencePaths', '[]'::jsonb)) x;
  if exists (select 1 from unnest(v_paths) x where split_part(x, '/', 1) <> v_user::text or x like '%..%') then
    raise exception 'evidence files must be your own uploads' using errcode = '42501';
  end if;

  v_own := exists (select 1 from public.user_person_links l where l.user_id = v_user and l.person_id = v_about and l.status = 'active');

  -- A named institution that is already in the record is used as it is.
  if nullif(p ->> 'organizationId', '') is null and nullif(btrim(coalesce(p ->> 'newOrganizationName', '')), '') is not null then
    select o.id into v_org from public.organizations o
     where not o.is_demo
       and (public.fold_text(o.name) = public.fold_text(btrim(p ->> 'newOrganizationName'))
            or public.fold_text(o.short_name) = public.fold_text(btrim(p ->> 'newOrganizationName')))
     order by o.created_at limit 1;
  else
    v_org := nullif(p ->> 'organizationId', '')::uuid;
  end if;

  if nullif(p ->> 'externalKey', '') is not null then
    select id into v_id from public.record_candidates
     where proposed_by_user_id = v_user and origin = v_origin and external_key = p ->> 'externalKey';
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.record_candidates (
    kind, origin, external_key, proposed_by_user_id, about_person_id,
    organization_id, new_organization_name, capacity,
    relationship_kind, colleague_person_id, colleague_given_name, colleague_family_name, colleague_orcid,
    start_year, end_year, is_ongoing, summary, source_note, source_type, evidence_paths)
  values (
    v_kind, v_origin, nullif(p ->> 'externalKey', ''), v_user, v_about,
    v_org, case when v_org is null then nullif(btrim(coalesce(p ->> 'newOrganizationName', '')), '') end, nullif(p ->> 'capacity', ''),
    v_rel_kind, nullif(p ->> 'colleaguePersonId', '')::uuid,
    nullif(btrim(coalesce(p ->> 'colleagueGivenName', '')), ''), nullif(btrim(coalesce(p ->> 'colleagueFamilyName', '')), ''),
    nullif(p ->> 'colleagueOrcid', ''),
    nullif(p ->> 'startYear', '')::int, nullif(p ->> 'endYear', '')::int, coalesce((p ->> 'isOngoing')::boolean, false),
    nullif(btrim(coalesce(p ->> 'summary', '')), ''), btrim(coalesce(p ->> 'sourceNote', '')),
    case when v_own then 'self_reported' else 'nominated_by_other' end, v_paths)
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (v_user, 'create', 'record_candidate', v_id, v_kind,
          jsonb_build_object('aboutPersonId', v_about, 'origin', v_origin));
  return v_id;
end;
$$;

revoke all on function public.propose_record(jsonb) from public, anon;
grant execute on function public.propose_record(jsonb) to authenticated;

-- Shared shape of a candidate for the lists below.
create function public.record_candidate_json(c public.record_candidates, p_viewer uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'origin', c.origin, 'status', c.status,
    'aboutPersonId', c.about_person_id,
    'aboutPersonName', (select display_name from public.people where id = c.about_person_id),
    'organizationId', c.organization_id,
    'organizationName', coalesce((select name from public.organizations where id = c.organization_id), c.new_organization_name),
    'isNewOrganization', c.organization_id is null and c.new_organization_name is not null,
    'capacity', c.capacity,
    'capacityLabel', (select label from public.participation_capacities where key = c.capacity),
    'relationshipKind', c.relationship_kind,
    'relationshipLabel', (select label from public.relationship_kinds where key = c.relationship_kind limit 1),
    'colleaguePersonId', c.colleague_person_id,
    'colleagueName', coalesce((select display_name from public.people where id = c.colleague_person_id),
                              btrim(coalesce(c.colleague_given_name, '') || ' ' || coalesce(c.colleague_family_name, ''))),
    'isNewColleague', c.colleague_person_id is null and c.kind = 'relationship',
    'startYear', c.start_year, 'endYear', c.end_year, 'isOngoing', c.is_ongoing,
    'summary', c.summary, 'sourceNote', c.source_note, 'sourceType', c.source_type,
    'evidencePaths', to_jsonb(c.evidence_paths),
    'decisionNote', c.decision_note, 'resultId', c.result_id,
    'isOwnProposal', c.proposed_by_user_id = p_viewer,
    'createdAt', c.created_at);
$$;

revoke all on function public.record_candidate_json(public.record_candidates, uuid) from public, anon, authenticated;

create function public.my_record_candidates()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(public.record_candidate_json(c, auth.uid()) order by c.created_at desc), '[]'::jsonb)
    from public.record_candidates c
   where c.proposed_by_user_id = auth.uid();
$$;

revoke all on function public.my_record_candidates() from public, anon;
grant execute on function public.my_record_candidates() to authenticated;

-- Pending proposals this steward may decide: about a person they steward,
-- or at one of their institutions. Oldest first (a queue, never a ranking).
create function public.steward_list_record_candidates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_any_steward(auth.uid()) then
    raise exception 'reviewer authorization required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(public.record_candidate_json(c, auth.uid()) order by c.created_at, c.id)
      from public.record_candidates c
     where c.status = 'pending'
       and (public.can_steward_person(auth.uid(), c.about_person_id)
            or exists (select 1 from public.institution_stewards s
                        where s.user_id = auth.uid() and s.status = 'active' and s.organization_id = c.organization_id))
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.steward_list_record_candidates() from public, anon;
grant execute on function public.steward_list_record_candidates() to authenticated;

-- ---------------------------------------------------------------------
-- steward_decide_record_candidate(id, accept, note)
-- ---------------------------------------------------------------------
create function public.steward_decide_record_candidate(p_candidate_id uuid, p_accept boolean, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_c public.record_candidates%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_org uuid;
  v_colleague uuid;
  v_directional boolean;
  v_result uuid;
  v_evidence text;
begin
  select * into v_c from public.record_candidates where id = p_candidate_id for update;
  if v_c.id is null then
    raise exception 'proposal not found' using errcode = 'P0002';
  end if;
  if not (public.can_steward_person(v_user, v_c.about_person_id)
          or exists (select 1 from public.institution_stewards s
                      where s.user_id = v_user and s.status = 'active' and s.organization_id = v_c.organization_id)) then
    raise exception 'reviewer authorization required' using errcode = '42501';
  end if;
  if v_c.status <> 'pending' then
    raise exception 'this proposal was already decided' using errcode = '22023';
  end if;
  if v_c.proposed_by_user_id = v_user then
    raise exception 'someone else must review your own proposal' using errcode = '42501';
  end if;

  if not p_accept then
    if v_note is null then
      raise exception 'say why it is rejected' using errcode = '22023';
    end if;
    update public.record_candidates
       set status = 'rejected', decided_by_user_id = v_user, decided_at = now(), decision_note = v_note
     where id = v_c.id;
    insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
    values (v_user, 'reject', 'record_candidate', v_c.id, v_c.kind, jsonb_build_object('note', v_note));
    return null;
  end if;

  v_evidence := 'Documented by: ' || v_c.source_note
    || case when cardinality(v_c.evidence_paths) > 0 then ' (' || cardinality(v_c.evidence_paths) || ' file(s) attached)' else '' end;

  if v_c.kind = 'participation' then
    v_org := v_c.organization_id;
    if v_org is null then
      insert into public.organizations (name, status, source_type, verification_status)
      values (v_c.new_organization_name, 'status_unknown', v_c.source_type, 'provisional')
      returning id into v_org;
    end if;
    insert into public.participations
      (person_id, organization_id, capacity, summary, start_date, start_precision, end_date, end_precision,
       is_ongoing, date_is_unknown, source_type, verification_status, created_by_user_id)
    values
      (v_c.about_person_id, v_org, v_c.capacity, coalesce(v_c.summary || ' — ', '') || v_evidence,
       case when v_c.start_year is not null then make_date(v_c.start_year, 1, 1) end,
       case when v_c.start_year is not null then 'year' end,
       case when v_c.end_year is not null then make_date(v_c.end_year, 1, 1) end,
       case when v_c.end_year is not null then 'year' end,
       v_c.is_ongoing, v_c.start_year is null, v_c.source_type, 'provisional', v_c.proposed_by_user_id)
    returning id into v_result;
  else
    v_colleague := v_c.colleague_person_id;
    if v_colleague is null then
      insert into public.people (given_name, family_name, display_name, source_type, verification_status, created_by_user_id)
      values (btrim(v_c.colleague_given_name), btrim(v_c.colleague_family_name),
              btrim(v_c.colleague_given_name) || ' ' || btrim(v_c.colleague_family_name),
              'nominated_by_other', 'provisional', v_c.proposed_by_user_id)
      returning id into v_colleague;
      if v_c.colleague_orcid is not null then
        insert into public.person_external_ids (person_id, source, external_id, confirmed_by_user_id)
        values (v_colleague, 'orcid', 'https://orcid.org/' || v_c.colleague_orcid, v_user)
        on conflict do nothing;
      end if;
    end if;
    select k.is_directional into v_directional from public.relationship_kinds k where k.key = v_c.relationship_kind limit 1;
    insert into public.relationships
      (kind, is_directional, source_person_id, target_person_id, narrative,
       start_date, start_precision, end_date, end_precision, is_ongoing, date_is_unknown,
       source_type, verification_status, created_by_user_id)
    values
      (v_c.relationship_kind, coalesce(v_directional, false),
       -- An undirected bond is stored once, the two people in canonical order.
       case when coalesce(v_directional, false) then v_c.about_person_id else least(v_c.about_person_id, v_colleague) end,
       case when coalesce(v_directional, false) then v_colleague else greatest(v_c.about_person_id, v_colleague) end,
       coalesce(v_c.summary || ' — ', '') || v_evidence,
       case when v_c.start_year is not null then make_date(v_c.start_year, 1, 1) end,
       case when v_c.start_year is not null then 'year' end,
       case when v_c.end_year is not null then make_date(v_c.end_year, 1, 1) end,
       case when v_c.end_year is not null then 'year' end,
       v_c.is_ongoing, v_c.start_year is null, v_c.source_type, 'provisional', v_c.proposed_by_user_id)
    returning id into v_result;
  end if;

  update public.record_candidates
     set status = 'accepted', decided_by_user_id = v_user, decided_at = now(), decision_note = v_note, result_id = v_result
   where id = v_c.id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (v_user, 'approve', 'record_candidate', v_c.id, v_c.kind,
          jsonb_build_object('resultId', v_result, 'aboutPersonId', v_c.about_person_id, 'note', v_note));
  return v_result;
end;
$$;

revoke all on function public.steward_decide_record_candidate(uuid, boolean, text) from public, anon;
grant execute on function public.steward_decide_record_candidate(uuid, boolean, text) to authenticated;

-- People search for the forms (an existing colleague or the person a
-- proposal is about): name only, alphabetical, signed-in members.
create function public.find_people_for_proposal(p_query text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'displayName', p.display_name) order by p.display_name), '[]'::jsonb)
    from (select id, display_name from public.people
           where verification_status <> 'merged'
             and auth.uid() is not null
             and char_length(btrim(coalesce(p_query, ''))) >= 2
             and public.fold_text(display_name) like '%' || public.fold_text(btrim(p_query)) || '%'
           order by display_name limit 20) p;
$$;

revoke all on function public.find_people_for_proposal(text) from public, anon;
grant execute on function public.find_people_for_proposal(text) to authenticated;
