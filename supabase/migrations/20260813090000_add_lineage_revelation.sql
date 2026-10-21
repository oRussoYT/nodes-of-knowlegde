-- Milestone M8.3: Revelation Engine -- lineage & institutional evolution (C2).
--
-- M8.1 revealed co-presence from the person's vantage; M8.2 the same from the
-- institution's. M8.3 reveals a DIFFERENT pattern family: the documented
-- LINEAGE -- a chain of SAME-KIND DIRECTIONAL assertions read across generations
-- (M8 Specification Sec.3.4, sequence composition; Sec.1, "lineage means a chain
-- of same-kind relationship assertions, not a tradition"). Two lenses:
--
--   * reveal_organization_lineage(uuid) -- the institution's documented
--     succession/formation descent: the transitive chain over
--     organization_relationships of the temporal-descent kinds {succession,
--     merger} (Predecessor->Successor, Antecedent->Merged-successor), extending
--     M7's one-hop institutional lineage to the full bounded chain. Governance
--     kinds (administration, parent_body, hosting) are NOT part of the evolution
--     descent -- they are structure, not temporal descent, and remain in M7's
--     one-hop "Institutional relationships" section. See the M8.3 engine doc for
--     this scope clarification.
--
--   * reveal_person_mentorship_lineage(uuid) -- the documented mentorship descent
--     over relationships of kind 'mentorship' (Mentor->Student), transitive.
--
-- Constitutional invariants (M8 Specification Sec.9.1), enforced here:
--   * READ-ONLY: two read functions and NOTHING ELSE -- no table, no column, no
--     RLS change, no write path. M8 creates no Assertion.
--   * DETERMINISTIC + BOUNDED: a pure function of the explicit directional
--     assertions; a BOUNDED recursive traversal (depth-capped, cycle-safe), so
--     the chain is a finite configuration the reader can see whole (Spec Sec.6.6).
--     Ordering is neutral (depth, then endpoint name/display_name, then id),
--     never a metric; chains are never ranked by length.
--   * SAME-KIND, ORDER NOT CAUSATION: each chain follows same-kind directional
--     edges, ordered by the direction the assertions themselves carry (source ->
--     target). It shows WHAT FOLLOWED WHAT, never WHAT FOLLOWED FROM WHAT (Spec
--     Sec.3.4): no transmission of ideas/influence, no "school", no causation.
--   * DECOMPOSABLE: every step carries the exact canonical relationship row (its
--     `source`), both endpoints as ProjectedNodes, the kind, temporal, and
--     provenance. A reader can decompose the chain link by link.
--   * NEVER FILLS A BROKEN CHAIN: only explicit edges are followed; a gap is a
--     silence in the record, shown as the chain simply ending.
--   * TEMPORALLY HONEST: each step shows its own stored dates; nothing is
--     inferred or back-filled from adjacent records.
--   * FAIL-CLOSED SECURITY: SECURITY DEFINER, search_path pinned, auth.uid()
--     required in-body, revoked from PUBLIC, granted to authenticated only.
--     Merged people excluded from mentorship chains (their pages 404);
--     nonexistent/merged focal -> null. Organizations have no 'merged' state.
--   * INCOMPLETENESS: the chain shown is the DOCUMENTED lineage, never the true
--     one -- the reading surface states this plainly.
--
-- Deferred (NOT built here): continuity/rupture (C3, M8.4), recurrence (C4,
-- M8.5), bounded pathway (C6, M8.6), and comparison (C5 -- enabled by this
-- lineage juxtaposition but not assigned to M8.3). No inference, similarity,
-- ranking, centrality, recommendation, probabilistic link, or interpretation.

-- ---------------------------------------------------------------------
-- reveal_organization_lineage -- institutional succession/formation descent
-- ---------------------------------------------------------------------

create function public.reveal_organization_lineage(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  v_up jsonb;
  v_down jsonb;
  c_max_depth constant integer := 16;
begin
  if auth.uid() is null then
    raise exception 'reveal_organization_lineage: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;
  if not found then
    return null;
  end if;

  -- Upstream: antecedents (edges whose TARGET is the current node; the SOURCE is
  -- the antecedent). Follows the descent backwards from the focal institution.
  with recursive up as (
    select
      r.id as rel_id, r.kind,
      r.source_organization_id as from_id, r.target_organization_id as to_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      1 as depth,
      array[v_org.id, r.source_organization_id] as path
    from public.organization_relationships r
    where r.target_organization_id = v_org.id
      and r.is_directional
      and r.kind in ('succession', 'merger')
    union all
    select
      r.id, r.kind,
      r.source_organization_id, r.target_organization_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      u.depth + 1,
      u.path || r.source_organization_id
    from up u
    join public.organization_relationships r on r.target_organization_id = u.from_id
    where r.is_directional
      and r.kind in ('succession', 'merger')
      and u.depth < c_max_depth
      and not (r.source_organization_id = any(u.path))
  )
  select coalesce(
    jsonb_agg(
      s.step order by s.depth asc, s.from_name asc, s.to_name asc, s.rel_id asc
    ),
    '[]'::jsonb
  )
  into v_up
  from (
    select distinct on (u.rel_id)
      u.depth, u.rel_id, fo.name as from_name, too.name as to_name,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'organization_relationships', 'id', u.rel_id),
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'source_role', k.source_role_label),
        'from', jsonb_build_object(
          'type', 'organization', 'id', fo.id, 'label', fo.name,
          'secondary_label', fo.short_name, 'href', '/institutions/' || fo.id,
          'verification_status', fo.verification_status
        ),
        'to', jsonb_build_object(
          'type', 'organization', 'id', too.id, 'label', too.name,
          'secondary_label', too.short_name, 'href', '/institutions/' || too.id,
          'verification_status', too.verification_status
        ),
        'temporal', jsonb_build_object(
          'start_date', u.start_date, 'start_precision', u.start_precision,
          'end_date', u.end_date, 'end_precision', u.end_precision,
          'is_approximate', u.is_approximate, 'is_ongoing', u.is_ongoing,
          'date_is_unknown', u.date_is_unknown, 'date_is_uncertain', u.date_is_uncertain
        ),
        'provenance', jsonb_build_object('source_type', u.source_type, 'verification_status', u.verification_status),
        'direction', 'upstream',
        'depth', u.depth
      ) as step
    from up u
    join public.organizations fo on fo.id = u.from_id
    join public.organizations too on too.id = u.to_id
    join public.organization_relationship_kinds k on k.key = u.kind and k.is_directional = true
    order by u.rel_id, u.depth asc
  ) s;

  -- Downstream: successors (edges whose SOURCE is the current node; the TARGET is
  -- the successor). Follows the descent forwards from the focal institution.
  with recursive down as (
    select
      r.id as rel_id, r.kind,
      r.source_organization_id as from_id, r.target_organization_id as to_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      1 as depth,
      array[v_org.id, r.target_organization_id] as path
    from public.organization_relationships r
    where r.source_organization_id = v_org.id
      and r.is_directional
      and r.kind in ('succession', 'merger')
    union all
    select
      r.id, r.kind,
      r.source_organization_id, r.target_organization_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      d.depth + 1,
      d.path || r.target_organization_id
    from down d
    join public.organization_relationships r on r.source_organization_id = d.to_id
    where r.is_directional
      and r.kind in ('succession', 'merger')
      and d.depth < c_max_depth
      and not (r.target_organization_id = any(d.path))
  )
  select coalesce(
    jsonb_agg(
      s.step order by s.depth asc, s.from_name asc, s.to_name asc, s.rel_id asc
    ),
    '[]'::jsonb
  )
  into v_down
  from (
    select distinct on (d.rel_id)
      d.depth, d.rel_id, fo.name as from_name, too.name as to_name,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'organization_relationships', 'id', d.rel_id),
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'source_role', k.source_role_label),
        'from', jsonb_build_object(
          'type', 'organization', 'id', fo.id, 'label', fo.name,
          'secondary_label', fo.short_name, 'href', '/institutions/' || fo.id,
          'verification_status', fo.verification_status
        ),
        'to', jsonb_build_object(
          'type', 'organization', 'id', too.id, 'label', too.name,
          'secondary_label', too.short_name, 'href', '/institutions/' || too.id,
          'verification_status', too.verification_status
        ),
        'temporal', jsonb_build_object(
          'start_date', d.start_date, 'start_precision', d.start_precision,
          'end_date', d.end_date, 'end_precision', d.end_precision,
          'is_approximate', d.is_approximate, 'is_ongoing', d.is_ongoing,
          'date_is_unknown', d.date_is_unknown, 'date_is_uncertain', d.date_is_uncertain
        ),
        'provenance', jsonb_build_object('source_type', d.source_type, 'verification_status', d.verification_status),
        'direction', 'downstream',
        'depth', d.depth
      ) as step
    from down d
    join public.organizations fo on fo.id = d.from_id
    join public.organizations too on too.id = d.to_id
    join public.organization_relationship_kinds k on k.key = d.kind and k.is_directional = true
    order by d.rel_id, d.depth asc
  ) s;

  return jsonb_build_object(
    'organization_id', v_org.id,
    'organization', jsonb_build_object(
      'type', 'organization', 'id', v_org.id, 'label', v_org.name,
      'secondary_label', v_org.short_name, 'href', '/institutions/' || v_org.id,
      'verification_status', v_org.verification_status
    ),
    'upstream', v_up,
    'downstream', v_down
  );
end;
$$;

comment on function public.reveal_organization_lineage(uuid) is
  'M8.2/M8.3 Revelation Engine -- institutional succession/formation descent. '
  'Returns an authenticated reader the DOCUMENTED lineage of one institution: the '
  'bounded, cycle-safe transitive chain of directional organization_relationships '
  'of kind succession/merger (antecedents upstream, successors downstream), each '
  'step carrying its canonical row, both endpoints, kind, temporal, and provenance. '
  'Deterministic, decomposable, read-only; shows what followed what, never what '
  'followed from what; no inference, no metric, no ranking. Null for a nonexistent '
  'institution. SECURITY DEFINER. Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_organization_lineage(uuid) from public;
grant execute on function public.reveal_organization_lineage(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- reveal_person_mentorship_lineage -- documented mentorship descent
-- ---------------------------------------------------------------------

create function public.reveal_person_mentorship_lineage(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_up jsonb;
  v_down jsonb;
  c_max_depth constant integer := 16;
begin
  if auth.uid() is null then
    raise exception 'reveal_person_mentorship_lineage: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;
  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  -- Upstream: mentors (edges whose TARGET is the current person; the SOURCE is
  -- the mentor). Non-merged people only.
  with recursive up as (
    select
      r.id as rel_id,
      r.source_person_id as from_id, r.target_person_id as to_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      1 as depth,
      array[v_person.id, r.source_person_id] as path
    from public.relationships r
    join public.people mp on mp.id = r.source_person_id
    where r.target_person_id = v_person.id
      and r.kind = 'mentorship'
      and r.is_directional
      and mp.verification_status <> 'merged'
    union all
    select
      r.id,
      r.source_person_id, r.target_person_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      u.depth + 1,
      u.path || r.source_person_id
    from up u
    join public.relationships r on r.target_person_id = u.from_id
    join public.people mp on mp.id = r.source_person_id
    where r.kind = 'mentorship'
      and r.is_directional
      and mp.verification_status <> 'merged'
      and u.depth < c_max_depth
      and not (r.source_person_id = any(u.path))
  )
  select coalesce(
    jsonb_agg(s.step order by s.depth asc, s.from_name asc, s.to_name asc, s.rel_id asc),
    '[]'::jsonb
  )
  into v_up
  from (
    select distinct on (u.rel_id)
      u.depth, u.rel_id, fp.display_name as from_name, tp.display_name as to_name,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'relationships', 'id', u.rel_id),
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'source_role', k.source_role_label),
        'from', jsonb_build_object(
          'type', 'person', 'id', fp.id, 'label', fp.display_name,
          'secondary_label', null, 'href', '/people/' || fp.id,
          'verification_status', fp.verification_status
        ),
        'to', jsonb_build_object(
          'type', 'person', 'id', tp.id, 'label', tp.display_name,
          'secondary_label', null, 'href', '/people/' || tp.id,
          'verification_status', tp.verification_status
        ),
        'temporal', jsonb_build_object(
          'start_date', u.start_date, 'start_precision', u.start_precision,
          'end_date', u.end_date, 'end_precision', u.end_precision,
          'is_approximate', u.is_approximate, 'is_ongoing', u.is_ongoing,
          'date_is_unknown', u.date_is_unknown, 'date_is_uncertain', u.date_is_uncertain
        ),
        'provenance', jsonb_build_object('source_type', u.source_type, 'verification_status', u.verification_status),
        'direction', 'upstream',
        'depth', u.depth
      ) as step
    from up u
    join public.people fp on fp.id = u.from_id
    join public.people tp on tp.id = u.to_id
    join public.relationship_kinds k on k.key = 'mentorship' and k.is_directional = true
    order by u.rel_id, u.depth asc
  ) s;

  -- Downstream: students (edges whose SOURCE is the current person; the TARGET is
  -- the student). Non-merged people only.
  with recursive down as (
    select
      r.id as rel_id,
      r.source_person_id as from_id, r.target_person_id as to_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      1 as depth,
      array[v_person.id, r.target_person_id] as path
    from public.relationships r
    join public.people sp on sp.id = r.target_person_id
    where r.source_person_id = v_person.id
      and r.kind = 'mentorship'
      and r.is_directional
      and sp.verification_status <> 'merged'
    union all
    select
      r.id,
      r.source_person_id, r.target_person_id,
      r.start_date, r.start_precision, r.end_date, r.end_precision,
      r.is_approximate, r.is_ongoing, r.date_is_unknown, r.date_is_uncertain,
      r.source_type, r.verification_status,
      d.depth + 1,
      d.path || r.target_person_id
    from down d
    join public.relationships r on r.source_person_id = d.to_id
    join public.people sp on sp.id = r.target_person_id
    where r.kind = 'mentorship'
      and r.is_directional
      and sp.verification_status <> 'merged'
      and d.depth < c_max_depth
      and not (r.target_person_id = any(d.path))
  )
  select coalesce(
    jsonb_agg(s.step order by s.depth asc, s.from_name asc, s.to_name asc, s.rel_id asc),
    '[]'::jsonb
  )
  into v_down
  from (
    select distinct on (d.rel_id)
      d.depth, d.rel_id, fp.display_name as from_name, tp.display_name as to_name,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'relationships', 'id', d.rel_id),
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'source_role', k.source_role_label),
        'from', jsonb_build_object(
          'type', 'person', 'id', fp.id, 'label', fp.display_name,
          'secondary_label', null, 'href', '/people/' || fp.id,
          'verification_status', fp.verification_status
        ),
        'to', jsonb_build_object(
          'type', 'person', 'id', tp.id, 'label', tp.display_name,
          'secondary_label', null, 'href', '/people/' || tp.id,
          'verification_status', tp.verification_status
        ),
        'temporal', jsonb_build_object(
          'start_date', d.start_date, 'start_precision', d.start_precision,
          'end_date', d.end_date, 'end_precision', d.end_precision,
          'is_approximate', d.is_approximate, 'is_ongoing', d.is_ongoing,
          'date_is_unknown', d.date_is_unknown, 'date_is_uncertain', d.date_is_uncertain
        ),
        'provenance', jsonb_build_object('source_type', d.source_type, 'verification_status', d.verification_status),
        'direction', 'downstream',
        'depth', d.depth
      ) as step
    from down d
    join public.people fp on fp.id = d.from_id
    join public.people tp on tp.id = d.to_id
    join public.relationship_kinds k on k.key = 'mentorship' and k.is_directional = true
    order by d.rel_id, d.depth asc
  ) s;

  return jsonb_build_object(
    'person_id', v_person.id,
    'person', jsonb_build_object(
      'type', 'person', 'id', v_person.id, 'label', v_person.display_name,
      'secondary_label', null, 'href', '/people/' || v_person.id,
      'verification_status', v_person.verification_status
    ),
    'upstream', v_up,
    'downstream', v_down
  );
end;
$$;

comment on function public.reveal_person_mentorship_lineage(uuid) is
  'M8.3 Revelation Engine -- documented mentorship descent. Returns an '
  'authenticated reader the DOCUMENTED mentorship lineage of one person: the '
  'bounded, cycle-safe transitive chain of directional relationships of kind '
  'mentorship (mentors upstream, students downstream), each step carrying its '
  'canonical row, both endpoints, temporal, and provenance; merged people '
  'excluded. Deterministic, decomposable, read-only; a documented descent of '
  'mentorship, never a school/transmission/influence; no inference, no metric, no '
  'ranking. Null for a merged/nonexistent person. SECURITY DEFINER. Never grant '
  'EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_person_mentorship_lineage(uuid) from public;
grant execute on function public.reveal_person_mentorship_lineage(uuid) to authenticated;
