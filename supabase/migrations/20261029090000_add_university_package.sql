-- The university package (docs/ROTEIRO.md fase 2, etapa E): graduate
-- outcomes by level (undergraduate, master's, doctorate, postdoc), the CAPES
-- "destino de egressos" export, ranking-style indicators of an institution,
-- and plan requests (how an institution asks for a paid or pro bono plan).
--
-- Descriptive only, never a league table of people: the indicators describe
-- one institution's graduates as a whole and state their method. A level is
-- read from the degree written on the imported list; "other" when unclear.

-- ---------------------------------------------------------------------------
-- Degree levels (controlled vocabulary, in the database).
-- ---------------------------------------------------------------------------
create table public.degree_levels (
  key text primary key,
  label text not null,
  label_pt text not null,
  is_postgraduate boolean not null default false,
  sort_order integer not null
);

insert into public.degree_levels (key, label, label_pt, is_postgraduate, sort_order) values
  ('undergraduate',       'Undergraduate',          'Graduação',             false, 10),
  ('specialization',      'Specialization',         'Especialização',        false, 20),
  ('master',              'Master''s',              'Mestrado acadêmico',    true,  30),
  ('professional_master', 'Professional master''s', 'Mestrado profissional', true,  40),
  ('doctorate',           'Doctorate',              'Doutorado',             true,  50),
  ('postdoc',             'Postdoctoral',           'Pós-doutorado',         false, 60),
  ('other',               'Other or not stated',    'Outro ou não informado', false, 90);

alter table public.degree_levels enable row level security;
create policy degree_levels_read on public.degree_levels for select to anon, authenticated using (true);

-- The level of a degree as written on a list ("MSc Ecology", "Doutorado",
-- "Bacharelado em Biologia"...). Order matters: post-doc before doctorate,
-- professional before academic master's.
create function public.degree_level_of(p_degree text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_degree is null or btrim(p_degree) = '' then 'other'
    when f ~ '(pos[- ]?doc|post[- ]?doc|pos[- ]?doutor)' then 'postdoc'
    when f ~ '(doutor|ph\.? ?d|d\.? ?sc\y|doctor|dphil)' then 'doctorate'
    when f ~ '(mestrado profissional|professional master|\ymp\y|mprof)' then 'professional_master'
    when f ~ '(mestr|master|\ym\.? ?sc\y|\ymsc|\ym\.?a\.?\y|\ymphil)' then 'master'
    when f ~ '(especializ|lato sensu|specializ|\ymba\y)' then 'specialization'
    when f ~ '(gradua|bachar|licenc|\yb\.? ?sc\y|\ybsc|\yb\.?a\.?\y|bachelor|undergrad|tecnolog)' then 'undergraduate'
    else 'other'
  end
  from (select public.fold_text(p_degree) as f) x;
$$;

-- CAPES-style destination category from the destination's sector.
create function public.capes_destination_category(p_type text, p_found boolean)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when not p_found then 'Não localizado'
    when p_type = 'education' then 'Docente ou pesquisador em instituição de ensino'
    when p_type = 'facility' then 'Pesquisador em instituto de pesquisa'
    when p_type = 'company' then 'Setor empresarial'
    when p_type = 'government' then 'Setor público'
    when p_type = 'nonprofit' then 'Terceiro setor (ONG, fundação)'
    when p_type = 'healthcare' then 'Saúde'
    when p_type = 'archive' then 'Museu, arquivo ou acervo'
    else 'Outro ou não informado'
  end;
$$;

-- ---------------------------------------------------------------------------
-- steward_university_report(org, programme?, from?, to?, home country)
-- Per level: graduates, located, sectors, abroad, years to the destination.
-- Plus institution-wide indicators with their method stated.
-- ---------------------------------------------------------------------------
create function public.steward_university_report(
  p_organization_id uuid,
  p_programme text default null,
  p_from_year integer default null,
  p_to_year integer default null,
  p_home_country text default 'BR'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_home text := upper(coalesce(nullif(btrim(p_home_country), ''), 'BR'));
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'steward_university_report: authentication required';
  end if;
  if p_organization_id is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_university_report: reviewer authorization required';
  end if;

  with g as (
    select o.*, public.degree_level_of(o.degree) as level,
           case when o.destination_year is not null and o.graduation_year is not null
                     and o.destination_year >= o.graduation_year
                then o.destination_year - o.graduation_year end as years_after
      from public.outcome_graduates(p_organization_id) o
     where (p_programme is null or o.programme = p_programme)
       and (p_from_year is null or o.graduation_year >= p_from_year)
       and (p_to_year is null or o.graduation_year <= p_to_year)
  ),
  per_level as (
    select l.key, l.label, l.label_pt, l.is_postgraduate, l.sort_order,
           count(g.person_id) as graduates,
           count(*) filter (where g.status = 'found') as n_found,
           count(*) filter (where g.status = 'found' and g.destination_type in ('education', 'facility')) as academia,
           count(*) filter (where g.status = 'found' and g.destination_type = 'company') as business,
           count(*) filter (where g.status = 'found' and g.destination_type = 'government') as government,
           count(*) filter (where g.status = 'found' and g.destination_type = 'nonprofit') as nonprofit,
           count(*) filter (where g.status = 'found' and g.destination_country is not null and upper(g.destination_country) <> v_home) as abroad,
           percentile_disc(0.5) within group (order by g.years_after) filter (where g.years_after is not null) as median_years
      from public.degree_levels l
      left join g on g.level = l.key
     group by l.key, l.label, l.label_pt, l.is_postgraduate, l.sort_order
  ),
  totals as (
    select count(*) as graduates,
           count(*) filter (where status = 'found') as n_found,
           count(*) filter (where status = 'found' and destination_type in ('education', 'facility')) as academia,
           count(*) filter (where status = 'found' and destination_type in ('company', 'government', 'nonprofit', 'healthcare')) as beyond,
           count(*) filter (where status = 'found' and destination_country is not null and upper(destination_country) <> v_home) as abroad,
           count(distinct destination_country) filter (where status = 'found' and destination_country is not null) as countries,
           count(distinct destination_institution) filter (where status = 'found') as institutions,
           count(*) filter (where is_demo) as demo
      from g
  )
  select jsonb_build_object(
    'organizationId', p_organization_id,
    'homeCountry', v_home,
    'filters', jsonb_build_object('programme', p_programme, 'fromYear', p_from_year, 'toYear', p_to_year),
    'levels', coalesce((select jsonb_agg(jsonb_build_object(
        'key', key, 'label', label, 'labelPt', label_pt, 'isPostgraduate', is_postgraduate,
        'graduates', graduates, 'found', n_found, 'academia', academia, 'business', business,
        'government', government, 'nonprofit', nonprofit, 'abroad', abroad, 'medianYearsToDestination', median_years)
        order by sort_order) from per_level where graduates > 0), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'graduates', graduates, 'found', n_found, 'academia', academia, 'beyondAcademia', beyond,
        'abroad', abroad, 'countries', countries, 'institutions', institutions, 'demo', demo) from totals),
    'method', jsonb_build_array(
      'Counts only graduates on lists the institution imported and resolved to a person.',
      'A destination counts only when a steward confirmed it from a dated, sourced record.',
      'Shares are of located graduates, not of all graduates; the located share is shown beside them.',
      'Level is read from the degree written on the list; unclear degrees count as "Other".',
      'Abroad means the destination country differs from the home country chosen here.',
      'Descriptive of the institution only: no person is ranked or scored.')
  ) into result;

  return result;
end;
$$;

revoke all on function public.steward_university_report(uuid, text, integer, integer, text) from public, anon;
grant execute on function public.steward_university_report(uuid, text, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- steward_capes_export(org, programme?, from?, to?): one line per master's or
-- doctoral graduate, in the shape of the CAPES "egressos" section. Audited.
-- ---------------------------------------------------------------------------
create function public.steward_capes_export(
  p_organization_id uuid,
  p_programme text default null,
  p_from_year integer default null,
  p_to_year integer default null
)
returns table (
  person_id uuid,
  display_name text,
  orcid text,
  level_pt text,
  programme text,
  graduation_year integer,
  destination_category text,
  destination_institution text,
  destination_country text,
  destination_year integer,
  years_after integer,
  destination_source text,
  confirmed_at timestamptz,
  is_demo boolean
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_capes_export: authentication required';
  end if;
  if p_organization_id is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_capes_export: reviewer authorization required';
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'capes_export', p_organization_id, 'CAPES graduates export',
          jsonb_build_object('programme', p_programme, 'fromYear', p_from_year, 'toYear', p_to_year));

  return query
    select o.person_id, o.display_name, o.orcid, l.label_pt, o.programme, o.graduation_year,
           public.capes_destination_category(o.destination_type, o.status = 'found'),
           o.destination_institution, o.destination_country, o.destination_year,
           case when o.destination_year >= o.graduation_year then o.destination_year - o.graduation_year end,
           o.destination_source, o.confirmed_at, o.is_demo
      from public.outcome_graduates(p_organization_id) o
      join public.degree_levels l on l.key = public.degree_level_of(o.degree)
     where l.is_postgraduate
       and (p_programme is null or o.programme = p_programme)
       and (p_from_year is null or o.graduation_year >= p_from_year)
       and (p_to_year is null or o.graduation_year <= p_to_year)
     order by l.sort_order, o.graduation_year nulls last, o.display_name, o.person_id;
end;
$$;

revoke all on function public.steward_capes_export(uuid, text, integer, integer) from public, anon;
grant execute on function public.steward_capes_export(uuid, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Plan requests: an institution asks for a plan (pro bono for conservation
-- research institutions; paid for universities, research centres, museums).
-- A platform reviewer answers. Nothing is charged here.
-- ---------------------------------------------------------------------------
create table public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by_user_id uuid not null references auth.users (id) on delete cascade,
  institution_name text not null,
  institution_kind text not null,
  plan text not null,
  contact_name text not null,
  contact_role text,
  country text,
  people_estimate integer,
  message text,
  status text not null default 'new',
  answer_note text,
  answered_by_user_id uuid references auth.users (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint plan_requests_kind_valid check (institution_kind in ('conservation_research', 'university', 'research_centre', 'museum', 'other')),
  constraint plan_requests_plan_valid check (plan in ('pro_bono', 'university', 'institution')),
  constraint plan_requests_status_valid check (status in ('new', 'in_conversation', 'approved', 'declined')),
  constraint plan_requests_name_len check (char_length(btrim(institution_name)) between 2 and 300),
  constraint plan_requests_contact_len check (char_length(btrim(contact_name)) between 2 and 200),
  constraint plan_requests_message_len check (message is null or char_length(message) <= 3000),
  constraint plan_requests_people check (people_estimate is null or people_estimate between 1 and 10000000)
);

comment on table public.plan_requests is
  'An institution asking for a plan. Read by its requester and platform reviewers; '
  'answered (status + note) by a platform reviewer, audited.';

alter table public.plan_requests enable row level security;
create policy plan_requests_read_own on public.plan_requests for select to authenticated
  using (requested_by_user_id = auth.uid());

create function public.request_plan(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_kind text := coalesce(p ->> 'institutionKind', '');
  v_plan text;
  v_people integer;
begin
  if auth.uid() is null then
    raise exception 'request_plan: sign in first' using errcode = '42501';
  end if;
  if (select count(*) from public.plan_requests
       where requested_by_user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'request_plan: daily limit reached' using errcode = '54000';
  end if;
  v_plan := case v_kind when 'conservation_research' then 'pro_bono'
                        when 'university' then 'university'
                        else 'institution' end;
  if (p ->> 'peopleEstimate') ~ '^\d{1,8}$' then v_people := (p ->> 'peopleEstimate')::integer; end if;

  insert into public.plan_requests
    (requested_by_user_id, institution_name, institution_kind, plan, contact_name, contact_role, country, people_estimate, message)
  values (auth.uid(), btrim(coalesce(p ->> 'institutionName', '')), v_kind, v_plan,
          btrim(coalesce(p ->> 'contactName', '')), nullif(btrim(coalesce(p ->> 'contactRole', '')), ''),
          nullif(btrim(coalesce(p ->> 'country', '')), ''), v_people,
          nullif(btrim(coalesce(p ->> 'message', '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.request_plan(jsonb) from public, anon;
grant execute on function public.request_plan(jsonb) to authenticated;

create function public.plan_request_json(r public.plan_requests)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', r.id, 'institutionName', r.institution_name, 'institutionKind', r.institution_kind, 'plan', r.plan,
    'contactName', r.contact_name, 'contactRole', r.contact_role, 'country', r.country,
    'peopleEstimate', r.people_estimate, 'message', r.message, 'status', r.status,
    'answerNote', r.answer_note, 'answeredAt', r.answered_at, 'createdAt', r.created_at,
    'requesterEmail', case when public.is_active_reviewer(auth.uid()) then (select email from auth.users u where u.id = r.requested_by_user_id) end);
$$;

revoke all on function public.plan_request_json(public.plan_requests) from public, anon, authenticated;

create function public.my_plan_requests()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(public.plan_request_json(r) order by r.created_at desc), '[]'::jsonb)
    from public.plan_requests r where r.requested_by_user_id = auth.uid();
$$;

revoke all on function public.my_plan_requests() from public, anon;
grant execute on function public.my_plan_requests() to authenticated;

create function public.steward_list_plan_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_list_plan_requests: platform reviewer required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(public.plan_request_json(r) order by r.created_at), '[]'::jsonb) from public.plan_requests r);
end;
$$;

revoke all on function public.steward_list_plan_requests() from public, anon;
grant execute on function public.steward_list_plan_requests() to authenticated;

create function public.steward_answer_plan_request(p_request_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_r public.plan_requests%rowtype;
begin
  if auth.uid() is null or not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_answer_plan_request: platform reviewer required' using errcode = '42501';
  end if;
  if p_status not in ('in_conversation', 'approved', 'declined') then
    raise exception 'steward_answer_plan_request: unknown status' using errcode = '22023';
  end if;
  if p_status = 'declined' and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'steward_answer_plan_request: a decline needs a note' using errcode = '22023';
  end if;
  update public.plan_requests
     set status = p_status, answer_note = nullif(btrim(coalesce(p_note, '')), ''),
         answered_by_user_id = auth.uid(), answered_at = now()
   where id = p_request_id
  returning * into v_r;
  if not found then
    raise exception 'steward_answer_plan_request: not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case p_status when 'approved' then 'approve' when 'declined' then 'reject' else 'update' end,
          'plan_request', v_r.id, v_r.institution_name, jsonb_build_object('status', p_status, 'plan', v_r.plan));
end;
$$;

revoke all on function public.steward_answer_plan_request(uuid, text, text) from public, anon;
grant execute on function public.steward_answer_plan_request(uuid, text, text) to authenticated;
