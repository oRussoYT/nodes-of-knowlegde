-- The "Depois" ideas of ROTEIRO.md (31 Oct 2026):
--   1. signed interpretations about the record -- a named person's reading of
--      the facts, always kept apart from the facts, reviewed before it shows,
--      and hideable by the person it is about;
--   2. help to declare ties correctly: a private list of one's own support
--      (grants, pending proposals, in-kind) plus a draft drawn from the record
--      for NIH Other Support and the NSF Collaborators & Other Affiliations;
--   3. conflict-of-interest screening: the documented ties between a set of
--      people -- facts only, never a score;
--   4. a public, read-only API: Nodes and their institutions with ROR and
--      Wikidata identifiers (people only through the existing public pages).

-- 1. Signed interpretations -------------------------------------------------
create table public.record_interpretations (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  author_label text not null,
  body text not null,
  sources text,
  status text not null default 'proposed',
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  constraint record_interpretations_subject check (subject_type in ('person', 'contribution')),
  constraint record_interpretations_body check (char_length(btrim(body)) between 20 and 4000),
  constraint record_interpretations_sources check (sources is null or char_length(sources) <= 1000),
  constraint record_interpretations_status check (status in ('proposed', 'published', 'declined', 'withdrawn', 'hidden_by_subject'))
);
create index record_interpretations_subject_idx on public.record_interpretations (subject_type, subject_id);
alter table public.record_interpretations enable row level security;
-- No policies: read and written only through the functions below.

comment on table public.record_interpretations is
  'Signed interpretations: a named person''s reading of the record. Never a '
  'fact; shown apart from facts, only after a steward publishes it, and the '
  'person it is about can hide it.';

-- Who decides an interpretation: a platform reviewer, or a steward of the
-- person it is about (for a work, of any of its people).
create function public.can_decide_interpretation(p_user uuid, p_type text, p_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user is not null and (
    public.is_active_reviewer(p_user)
    or (p_type = 'person' and public.can_steward_person(p_user, p_subject))
    or (p_type = 'contribution' and exists (
          select 1 from public.person_contributions pc
           where pc.contribution_id = p_subject and public.can_steward_person(p_user, pc.person_id))));
$$;
revoke all on function public.can_decide_interpretation(uuid, text, uuid) from public, anon, authenticated;

create function public.write_interpretation(p_type text, p_subject uuid, p_body text, p_sources text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'write_interpretation: sign in first' using errcode = '42501';
  end if;
  v_name := public.author_name(auth.uid());
  if v_name = 'A member' then
    raise exception 'write_interpretation: an interpretation is signed -- add your name to your profile first' using errcode = '22023';
  end if;
  if p_type = 'person' and not exists (select 1 from public.people where id = p_subject and verification_status <> 'merged') then
    raise exception 'write_interpretation: person not found' using errcode = 'P0002';
  end if;
  if p_type = 'contribution' and not exists (select 1 from public.contributions where id = p_subject) then
    raise exception 'write_interpretation: work not found' using errcode = 'P0002';
  end if;
  if p_type not in ('person', 'contribution') then
    raise exception 'write_interpretation: unknown subject' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) < 20 then
    raise exception 'write_interpretation: write at least a couple of sentences' using errcode = '22023';
  end if;
  if (select count(*) from public.record_interpretations
       where author_user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'write_interpretation: too many today' using errcode = '54000';
  end if;
  insert into public.record_interpretations (subject_type, subject_id, author_user_id, author_label, body, sources)
  values (p_type, p_subject, auth.uid(), v_name, btrim(left(p_body, 4000)), nullif(btrim(left(coalesce(p_sources, ''), 1000)), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.write_interpretation(text, uuid, text, text) from public, anon;
grant execute on function public.write_interpretation(text, uuid, text, text) to authenticated;

create function public.interpretations_for(p_type text, p_subject uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'author', i.author_label, 'body', i.body, 'sources', i.sources, 'status', i.status,
      'createdAt', i.created_at, 'isMine', i.author_user_id = auth.uid(),
      'canHide', i.status = 'published' and p_type = 'person' and p_subject is not distinct from public.my_linked_person(),
      'canDecide', i.status = 'proposed' and i.author_user_id <> auth.uid() and public.can_decide_interpretation(auth.uid(), p_type, p_subject))
      order by i.created_at), '[]'::jsonb) end
    from public.record_interpretations i
   where i.subject_type = p_type and i.subject_id = p_subject
     and (i.status = 'published'
          or i.author_user_id = auth.uid()
          or (i.status = 'proposed' and public.can_decide_interpretation(auth.uid(), p_type, p_subject)));
$$;
revoke all on function public.interpretations_for(text, uuid) from public, anon;
grant execute on function public.interpretations_for(text, uuid) to authenticated;

create function public.steward_decide_interpretation(p_id uuid, p_publish boolean, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v public.record_interpretations%rowtype;
begin
  select * into v from public.record_interpretations where id = p_id for update;
  if not found or v.status <> 'proposed' then
    raise exception 'steward_decide_interpretation: nothing to decide' using errcode = 'P0002';
  end if;
  if not public.can_decide_interpretation(auth.uid(), v.subject_type, v.subject_id) then
    raise exception 'steward_decide_interpretation: steward required' using errcode = '42501';
  end if;
  if v.author_user_id = auth.uid() then
    raise exception 'steward_decide_interpretation: someone else decides your own interpretation' using errcode = '42501';
  end if;
  update public.record_interpretations
     set status = case when p_publish then 'published' else 'declined' end,
         decided_by_user_id = auth.uid(), decided_at = now(),
         decision_note = nullif(btrim(left(coalesce(p_note, ''), 500)), '')
   where id = p_id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case when p_publish then 'approve' else 'reject' end, 'interpretation', v.subject_id,
          left(v.author_label, 200), jsonb_build_object('interpretation', p_id, 'subjectType', v.subject_type));
end;
$$;
revoke all on function public.steward_decide_interpretation(uuid, boolean, text) from public, anon;
grant execute on function public.steward_decide_interpretation(uuid, boolean, text) to authenticated;

create function public.withdraw_interpretation(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  update public.record_interpretations set status = 'withdrawn'
   where id = p_id and author_user_id = auth.uid() and status in ('proposed', 'published');
  if not found then
    raise exception 'withdraw_interpretation: only the author withdraws' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.withdraw_interpretation(uuid) from public, anon;
grant execute on function public.withdraw_interpretation(uuid) to authenticated;

-- The person an interpretation is about can always take it off their page.
create function public.hide_interpretation_about_me(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v public.record_interpretations%rowtype;
begin
  select * into v from public.record_interpretations where id = p_id for update;
  if not found or v.subject_type <> 'person' or v.status <> 'published'
     or v.subject_id is distinct from public.my_linked_person() then
    raise exception 'hide_interpretation_about_me: only the person it is about' using errcode = '42501';
  end if;
  update public.record_interpretations set status = 'hidden_by_subject', decided_by_user_id = auth.uid(), decided_at = now()
   where id = p_id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'interpretation', v.subject_id, left(v.author_label, 200), jsonb_build_object('interpretation', p_id, 'hiddenBySubject', true));
end;
$$;
revoke all on function public.hide_interpretation_about_me(uuid) from public, anon;
grant execute on function public.hide_interpretation_about_me(uuid) to authenticated;

create function public.steward_list_interpretations()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'subjectType', i.subject_type, 'subjectId', i.subject_id,
      'subjectLabel', case i.subject_type
          when 'person' then (select p.display_name from public.people p where p.id = i.subject_id)
          else (select c.title from public.contributions c where c.id = i.subject_id) end,
      'author', i.author_label, 'body', i.body, 'sources', i.sources, 'createdAt', i.created_at)
      order by i.created_at), '[]'::jsonb)
    from public.record_interpretations i
   where i.status = 'proposed' and i.author_user_id <> auth.uid()
     and public.can_decide_interpretation(auth.uid(), i.subject_type, i.subject_id);
$$;
revoke all on function public.steward_list_interpretations() from public, anon;
grant execute on function public.steward_list_interpretations() to authenticated;

-- 2. Declaring ties ------------------------------------------------------------
-- One's own support: private to its owner (it can hold amounts, so nobody
-- else -- not even stewards -- reads it).
create table public.support_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'grant',
  status text not null default 'current',
  title text not null,
  funder text,
  role text,
  start_year integer,
  end_year integer,
  effort_months numeric(5,2),
  amount_note text,
  overlap_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_items_kind check (kind in ('grant', 'contract', 'fellowship', 'in_kind', 'startup', 'other')),
  constraint support_items_status check (status in ('current', 'pending', 'past')),
  constraint support_items_title check (char_length(btrim(title)) between 3 and 300),
  constraint support_items_years check (start_year is null or start_year between 1900 and 2100),
  constraint support_items_end check (end_year is null or (end_year between 1900 and 2100 and (start_year is null or end_year >= start_year))),
  constraint support_items_effort check (effort_months is null or effort_months between 0 and 12)
);
create index support_items_owner_idx on public.support_items (owner_user_id);
alter table public.support_items enable row level security;
grant select, insert, update, delete on public.support_items to authenticated;
create policy support_items_owner on public.support_items
  for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create function public.save_support_item(p jsonb, p_id uuid default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_start integer := nullif(p->>'startYear', '')::integer;
  v_end integer := nullif(p->>'endYear', '')::integer;
  v_months numeric := nullif(p->>'effortMonths', '')::numeric;
begin
  if auth.uid() is null then
    raise exception 'save_support_item: sign in first' using errcode = '42501';
  end if;
  if p_id is null then
    if (select count(*) from public.support_items where owner_user_id = auth.uid()) >= 200 then
      raise exception 'save_support_item: limit reached' using errcode = '54000';
    end if;
    insert into public.support_items (owner_user_id, kind, status, title, funder, role, start_year, end_year, effort_months, amount_note, overlap_note)
    values (auth.uid(), coalesce(nullif(p->>'kind', ''), 'grant'), coalesce(nullif(p->>'status', ''), 'current'),
            btrim(left(coalesce(p->>'title', ''), 300)), nullif(btrim(left(coalesce(p->>'funder', ''), 200)), ''),
            nullif(btrim(left(coalesce(p->>'role', ''), 120)), ''), v_start, v_end, v_months,
            nullif(btrim(left(coalesce(p->>'amountNote', ''), 200)), ''), nullif(btrim(left(coalesce(p->>'overlapNote', ''), 1000)), ''))
    returning id into v_id;
  else
    update public.support_items
       set kind = coalesce(nullif(p->>'kind', ''), kind), status = coalesce(nullif(p->>'status', ''), status),
           title = btrim(left(coalesce(p->>'title', title), 300)), funder = nullif(btrim(left(coalesce(p->>'funder', ''), 200)), ''),
           role = nullif(btrim(left(coalesce(p->>'role', ''), 120)), ''), start_year = v_start, end_year = v_end,
           effort_months = v_months, amount_note = nullif(btrim(left(coalesce(p->>'amountNote', ''), 200)), ''),
           overlap_note = nullif(btrim(left(coalesce(p->>'overlapNote', ''), 1000)), ''), updated_at = now()
     where id = p_id and owner_user_id = auth.uid()
    returning id into v_id;
    if v_id is null then
      raise exception 'save_support_item: not yours' using errcode = '42501';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_support_item(jsonb, uuid) from public, anon;
grant execute on function public.save_support_item(jsonb, uuid) to authenticated;

create function public.delete_support_item(p_id uuid)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  delete from public.support_items where id = p_id and owner_user_id = auth.uid();
$$;
revoke all on function public.delete_support_item(uuid) from public, anon;
grant execute on function public.delete_support_item(uuid) to authenticated;

-- Where someone is now: their latest ongoing (else latest) institution.
create function public.current_affiliation(p_person uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.name from public.participations pa join public.organizations o on o.id = pa.organization_id
   where pa.person_id = p_person and pa.verification_status <> 'disputed'
   order by pa.is_ongoing desc, coalesce(pa.end_date, pa.start_date) desc nulls last
   limit 1;
$$;
revoke all on function public.current_affiliation(uuid) from public, anon, authenticated;

-- The draft: what the record already knows, for the signed-in person only.
create function public.my_support_draft()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.my_linked_person() as id),
  cutoff as (select (current_date - interval '48 months')::date as d),
  coauthors as (
    select q.id, q.display_name, max(c.start_date) as last_date, count(distinct c.id) as works
      from me join public.person_contributions mine on mine.person_id = me.id
      join public.contributions c on c.id = mine.contribution_id
      join public.person_contributions other on other.contribution_id = c.id and other.person_id <> me.id
      join public.people q on q.id = other.person_id and q.verification_status <> 'merged', cutoff
     where c.start_date >= cutoff.d
     group by q.id, q.display_name
  ),
  bonds as (
    select q.id, q.display_name, r.kind, rk.label,
           case when r.source_person_id = me.id then 'source' else 'target' end as side,
           extract(year from r.start_date)::int as start_year, extract(year from r.end_date)::int as end_year
      from me join public.relationships r on me.id in (r.source_person_id, r.target_person_id)
      join public.people q on q.id = case when r.source_person_id = me.id then r.target_person_id else r.source_person_id end
      left join public.relationship_kinds rk on rk.key = r.kind
     where r.verification_status <> 'disputed' and q.verification_status <> 'merged'
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'personId', (select id from me),
    'name', (select p.display_name from me join public.people p on p.id = me.id),
    'appointments', coalesce((select jsonb_agg(jsonb_build_object(
        'organization', o.name, 'role', coalesce(cap.label, pa.capacity),
        'startYear', extract(year from pa.start_date)::int, 'endYear', extract(year from pa.end_date)::int,
        'ongoing', pa.is_ongoing, 'status', pa.verification_status)
        order by pa.is_ongoing desc, pa.start_date desc nulls last)
        from me join public.participations pa on pa.person_id = me.id
        join public.organizations o on o.id = pa.organization_id
        left join public.participation_capacities cap on cap.key = pa.capacity
       where pa.verification_status <> 'disputed'), '[]'::jsonb),
    'advisors', coalesce((select jsonb_agg(jsonb_build_object('personId', b.id, 'name', b.display_name,
        'affiliation', public.current_affiliation(b.id), 'startYear', b.start_year, 'endYear', b.end_year) order by b.display_name)
        from bonds b where b.kind in ('mentorship', 'advising') and b.side = 'target'), '[]'::jsonb),
    'advisees', coalesce((select jsonb_agg(jsonb_build_object('personId', b.id, 'name', b.display_name,
        'affiliation', public.current_affiliation(b.id), 'startYear', b.start_year, 'endYear', b.end_year) order by b.display_name)
        from bonds b where b.kind in ('mentorship', 'advising') and b.side = 'source'), '[]'::jsonb),
    'coauthors', coalesce((select jsonb_agg(jsonb_build_object('personId', c.id, 'name', c.display_name,
        'affiliation', public.current_affiliation(c.id), 'lastYear', extract(year from c.last_date)::int, 'works', c.works) order by c.display_name)
        from coauthors c), '[]'::jsonb),
    'collaborators', coalesce((select jsonb_agg(jsonb_build_object('personId', b.id, 'name', b.display_name, 'kind', b.label,
        'affiliation', public.current_affiliation(b.id), 'startYear', b.start_year, 'endYear', b.end_year) order by b.display_name)
        from bonds b, cutoff where b.kind not in ('mentorship', 'advising', 'interview', 'succession')
         and (b.end_year is null or b.end_year >= extract(year from cutoff.d))), '[]'::jsonb),
    'support', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'status', s.status, 'title', s.title,
        'funder', s.funder, 'role', s.role, 'startYear', s.start_year, 'endYear', s.end_year,
        'effortMonths', s.effort_months, 'amountNote', s.amount_note, 'overlapNote', s.overlap_note)
        order by case s.status when 'current' then 0 when 'pending' then 1 else 2 end, s.start_year desc nulls last, s.title)
        from public.support_items s where s.owner_user_id = auth.uid()), '[]'::jsonb)
  ) end;
$$;
revoke all on function public.my_support_draft() from public, anon;
grant execute on function public.my_support_draft() to authenticated;

-- 3. Conflict-of-interest screening --------------------------------------------
-- For every pair among up to 15 people: their documented bonds, the works
-- they share and the institutions where their periods overlap. Facts with
-- years; never a score. Bonds hidden by a person stay hidden here too.
create function public.conflict_check(p_people uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ids as (
    select distinct u.id from unnest(coalesce(p_people[1:15], '{}'::uuid[])) as u(id)
      join public.people p on p.id = u.id and p.verification_status <> 'merged'
     where auth.uid() is not null
  ),
  pairs as (select a.id as a, b.id as b from ids a join ids b on a.id < b.id),
  facts as (
    select pr.a, pr.b,
      coalesce((select jsonb_agg(jsonb_build_object('kind', coalesce(rk.label, r.kind),
            'startYear', extract(year from r.start_date)::int, 'endYear', extract(year from r.end_date)::int,
            'status', r.verification_status) order by r.start_date nulls last)
          from public.relationships r left join public.relationship_kinds rk on rk.key = r.kind
         where ((r.source_person_id = pr.a and r.target_person_id = pr.b) or (r.source_person_id = pr.b and r.target_person_id = pr.a))
           and r.verification_status <> 'disputed'
           and not exists (select 1 from public.relationship_hides h where h.relationship_id = r.id)), '[]'::jsonb) as bonds,
      coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'title', w.title, 'year', extract(year from w.start_date)::int)
            order by w.start_date desc nulls last)
          from (select distinct c.id, c.title, c.start_date from public.contributions c
                  join public.person_contributions x on x.contribution_id = c.id and x.person_id = pr.a
                  join public.person_contributions y on y.contribution_id = c.id and y.person_id = pr.b) w), '[]'::jsonb) as works,
      coalesce((select jsonb_agg(distinct jsonb_build_object('organization', o.name,
            'fromYear', greatest(extract(year from x.start_date), extract(year from y.start_date))::int,
            'toYear', least(coalesce(extract(year from x.end_date), case when x.is_ongoing then extract(year from current_date) end),
                            coalesce(extract(year from y.end_date), case when y.is_ongoing then extract(year from current_date) end))::int))
          from public.participations x join public.participations y on y.organization_id = x.organization_id
          join public.organizations o on o.id = x.organization_id
         where x.person_id = pr.a and y.person_id = pr.b
           and x.verification_status <> 'disputed' and y.verification_status <> 'disputed'
           and x.start_date is not null and y.start_date is not null
           and x.start_date <= coalesce(y.end_date, case when y.is_ongoing then current_date end, y.start_date)
           and y.start_date <= coalesce(x.end_date, case when x.is_ongoing then current_date end, x.start_date)), '[]'::jsonb) as places
      from pairs pr
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'people', coalesce((select jsonb_agg(jsonb_build_object('personId', p.id, 'name', p.display_name,
        'affiliation', public.current_affiliation(p.id)) order by p.display_name)
        from ids join public.people p on p.id = ids.id), '[]'::jsonb),
    'pairs', coalesce((select jsonb_agg(jsonb_build_object(
        'a', jsonb_build_object('personId', pa.id, 'name', pa.display_name),
        'b', jsonb_build_object('personId', pb.id, 'name', pb.display_name),
        'bonds', f.bonds, 'sharedWorks', f.works, 'sharedPlaces', f.places)
        order by least(pa.display_name, pb.display_name), greatest(pa.display_name, pb.display_name))
        from facts f join public.people pa on pa.id = f.a join public.people pb on pb.id = f.b
       where jsonb_array_length(f.bonds) + jsonb_array_length(f.works) + jsonb_array_length(f.places) > 0), '[]'::jsonb)
  ) end;
$$;
revoke all on function public.conflict_check(uuid[]) from public, anon;
grant execute on function public.conflict_check(uuid[]) to authenticated;

-- 4. Public API: Nodes and their institutions -----------------------------------
create function public.public_api_organization(p_org uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
      'id', o.id, 'name', o.name, 'shortName', o.short_name, 'country', o.country_code,
      'latitude', o.latitude, 'longitude', o.longitude,
      'ror', (select e.identifier_value from public.organization_external_identifiers e
               where e.organization_id = o.id and e.scheme = 'ror' and e.verification_status <> 'disputed' limit 1),
      'wikidata', (select e.identifier_value from public.organization_external_identifiers e
               where e.organization_id = o.id and e.scheme = 'wikidata' and e.verification_status <> 'disputed' limit 1))
    from public.organizations o where o.id = p_org;
$$;

create function public.public_api_nodes()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', n.slug, 'name', n.name, 'shortName', n.short_name, 'tagline', n.tagline,
      'counts', public.node_counts(n.id),
      'institutions', coalesce((select jsonb_agg(public.public_api_organization(no.organization_id) order by o.name)
          from public.node_organizations no join public.organizations o on o.id = no.organization_id
         where no.node_id = n.id), '[]'::jsonb))
      order by n.name), '[]'::jsonb)
    from public.nodes n where n.status = 'active';
$$;

revoke all on function public.public_api_nodes() from public;
revoke all on function public.public_api_organization(uuid) from public;
grant execute on function public.public_api_nodes() to anon, authenticated;
grant execute on function public.public_api_organization(uuid) to anon, authenticated;
