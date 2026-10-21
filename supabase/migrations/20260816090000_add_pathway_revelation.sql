-- Milestone M8.6: Revelation Engine -- bounded pathway (C6).
--
-- The LAST and highest-interpretive-risk revelation. M8.1-M8.5 each read from a
-- SINGLE focal record. M8.6 is the first TWO-ENDPOINT lens: given a focal person
-- and a SELECTED target entity, it reveals a FINITE, SMALL, FULLY-VISIBLE CHAIN
-- of explicit assertions connecting them through intermediaries -- a documented
-- pathway (M8 Specification Sec.3.2, bounded multi-hop composition).
--
-- THE ENDPOINT RULE (Spec Sec.3.2, added under review) governs this milestone:
-- a pathway asserts NOTHING about its endpoints beyond the literal existence of
-- the chain. The surface must present it as "a documented chain of N steps
-- connects A and B", NEVER "A is connected to B" -- a long chain conveys a felt
-- connection the evidence does not support. The hop bound is therefore kept
-- SMALL and longer chains are treated with MORE reserve. Boundedness is a
-- CONSTITUTIONAL property (it keeps the composition inspectable and away from
-- inference), not a performance one (Spec Sec.6.6).
--
--   * reveal_person_pathway(p_from uuid, p_to uuid) -- for a focal person and a
--     selected target entity (person / organization / contribution / event),
--     the shortest documented chain of >= 2 explicit-assertion steps connecting
--     them, bounded to a small hop cap, cycle-safe, each step decomposable to
--     its canonical row with both endpoints projected as ProjectedNode doorways.
--
-- HETEROGENEOUS GRAPH (ratified with the product owner). Nodes are the four
-- canonical entity types; edges are the explicit, provenance-bearing assertions
-- that connect two entities, read UNDIRECTED:
--   relationships (person-person), organization_relationships (org-org),
--   participations (person-org), person_contributions / organization_contributions
--   (entity-contribution), person_events / organization_events /
--   contribution_events (entity-event). An event-association step carries the
--   EVENT record's own provenance/temporal (the bare link is the explicit
--   placement; the event is the documented record it points at).
--
-- >= 2 STEPS ONLY. A single explicit assertion linking two entities is M7's
-- one-hop CONNECTION, already read on each record's page. The pathway lens is
-- strictly MULTI-hop: it reveals only chains of two or more steps, so it never
-- re-presents (nor competes with) an M7 connection. It also composes ACROSS
-- kinds, so it never re-presents M8.3's same-kind directional descent.
--
-- Constitutional invariants (M8 Specification Sec.9.1), enforced here:
--   * READ-ONLY: one read function (plus prior lenses) and NOTHING ELSE -- no
--     table, no column, no RLS change, no write path. M8 creates no Assertion.
--   * DETERMINISTIC + BOUNDED: a bounded (hop cap 4), cycle-safe traversal over
--     the explicit assertions; a single, deterministically-chosen minimal-length
--     chain is returned (ordered by depth, then a neutral path key). No AI, no
--     similarity, no inference, no probability, no statistics.
--   * NO RANKING: the chain's length is stated as a fact (N steps), NEVER as a
--     rank; pathways are never ordered or scored by length; no path-significance
--     or centrality is computed (Spec Sec.4, Sec.278).
--   * DECOMPOSABLE: every step carries its exact canonical row (its `source`),
--     both endpoints as ProjectedNodes, the connecting assertion's category and
--     label, its temporal, and its provenance. A reader decomposes the chain
--     link by link.
--   * NEVER FILLS A GAP: only explicit edges are followed; where no chain of <=
--     4 steps exists, the honest statement is "no documented chain of up to four
--     steps connects them", NEVER "not connected".
--   * FAIL-CLOSED SECURITY: SECURITY DEFINER, search_path pinned, auth.uid()
--     required in-body, revoked from PUBLIC, granted to authenticated only.
--     Merged people are excluded from the graph and as endpoints (their pages
--     404); a merged/nonexistent focal or an unresolvable target -> a document
--     that reveals no chain, never an error.
--   * ENDPOINT RULE: the function returns only the literal chain; the surface
--     states "a documented chain of N steps connects A and B" and never asserts
--     a connection between the endpoints.
--
-- Deferred (NOT built here): comparison (C5, enabled, not assigned). This is the
-- final revelation capability; interpretation of what a pathway MEANS is M9's.

-- Internal helper: project ANY canonical entity as a ProjectedNode jsonb. Called
-- only from reveal_person_pathway (a SECURITY DEFINER function), so it runs with
-- the definer's rights; it is revoked from PUBLIC and granted to no client role.
create function public.pathway_entity_node(p_type text, p_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select case p_type
    when 'person' then (
      select jsonb_build_object('type', 'person', 'id', pe.id, 'label', pe.display_name,
        'secondary_label', null, 'href', '/people/' || pe.id, 'verification_status', pe.verification_status)
      from public.people pe where pe.id = p_id)
    when 'organization' then (
      select jsonb_build_object('type', 'organization', 'id', o.id, 'label', o.name,
        'secondary_label', o.short_name, 'href', '/institutions/' || o.id, 'verification_status', o.verification_status)
      from public.organizations o where o.id = p_id)
    when 'contribution' then (
      select jsonb_build_object('type', 'contribution', 'id', c.id, 'label', c.title,
        'secondary_label', null, 'href', '/contributions/' || c.id, 'verification_status', c.verification_status)
      from public.contributions c where c.id = p_id)
    when 'event' then (
      select jsonb_build_object('type', 'event', 'id', ev.id, 'label', ev.title,
        'secondary_label', null, 'href', null, 'verification_status', ev.verification_status)
      from public.events ev where ev.id = p_id)
    else null
  end
$$;

revoke all on function public.pathway_entity_node(text, uuid) from public;

create function public.reveal_person_pathway(p_from uuid, p_to uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_to_type text;
  v_from_node jsonb;
  v_to_node jsonb;
  v_hit_steps jsonb[];
  v_path jsonb;
  c_max_hops constant integer := 4;
begin
  if auth.uid() is null then
    raise exception 'reveal_person_pathway: authentication required';
  end if;

  if p_from is null or p_to is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_from;
  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  v_from_node := jsonb_build_object(
    'type', 'person', 'id', v_person.id, 'label', v_person.display_name,
    'secondary_label', null, 'href', '/people/' || v_person.id,
    'verification_status', v_person.verification_status
  );

  -- Resolve the target's entity type (uuids are globally unique across tables).
  -- A merged person is treated as unresolvable (its page 404s).
  v_to_type := case
    when exists (select 1 from public.people pe where pe.id = p_to and pe.verification_status <> 'merged') then 'person'
    when exists (select 1 from public.organizations o where o.id = p_to) then 'organization'
    when exists (select 1 from public.contributions c where c.id = p_to) then 'contribution'
    when exists (select 1 from public.events e where e.id = p_to) then 'event'
    else null
  end;

  if v_to_type is null or (v_to_type = 'person' and p_to = p_from) then
    -- No resolvable, distinct target: an honest "no target / not found" document.
    return jsonb_build_object(
      'from_id', v_person.id, 'from', v_from_node,
      'to_id', p_to, 'to', null,
      'target_resolved', (v_to_type is not null),
      'found', false, 'step_count', 0, 'steps', '[]'::jsonb
    );
  end if;

  v_to_node := public.pathway_entity_node(v_to_type, p_to);

  -- The heterogeneous, undirected, provenance-bearing edge set, then a bounded,
  -- cycle-safe breadth-ordered traversal that carries each step's decomposable
  -- payload. The single minimal-length chain (>= 2 steps) is chosen by (depth,
  -- neutral path key) -- never by any metric.
  with recursive raw_edges as (
    -- person-person relationships
    select 'person'::text xt, r.source_person_id xi, 'person'::text yt, r.target_person_id yi,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'relationships', 'id', r.id),
        'category', 'relationship', 'label', rk.label,
        'from_type', 'person', 'from_id', r.source_person_id,
        'to_type', 'person', 'to_id', r.target_person_id,
        'temporal', jsonb_build_object('start_date', r.start_date, 'start_precision', r.start_precision,
          'end_date', r.end_date, 'end_precision', r.end_precision, 'is_approximate', r.is_approximate,
          'is_ongoing', r.is_ongoing, 'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status)
      ) core
    from public.relationships r
    join public.relationship_kinds rk on rk.key = r.kind and rk.is_directional = r.is_directional
    join public.people sp on sp.id = r.source_person_id and sp.verification_status <> 'merged'
    join public.people tp on tp.id = r.target_person_id and tp.verification_status <> 'merged'
    union all
    -- org-org institutional relationships
    select 'organization', orr.source_organization_id, 'organization', orr.target_organization_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'organization_relationships', 'id', orr.id),
        'category', 'institutional_relationship', 'label', ork.label,
        'from_type', 'organization', 'from_id', orr.source_organization_id,
        'to_type', 'organization', 'to_id', orr.target_organization_id,
        'temporal', jsonb_build_object('start_date', orr.start_date, 'start_precision', orr.start_precision,
          'end_date', orr.end_date, 'end_precision', orr.end_precision, 'is_approximate', orr.is_approximate,
          'is_ongoing', orr.is_ongoing, 'date_is_unknown', orr.date_is_unknown, 'date_is_uncertain', orr.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', orr.source_type, 'verification_status', orr.verification_status)
      )
    from public.organization_relationships orr
    join public.organization_relationship_kinds ork on ork.key = orr.kind and ork.is_directional = orr.is_directional
    union all
    -- person-organization participations
    select 'person', pa.person_id, 'organization', pa.organization_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'participations', 'id', pa.id),
        'category', 'participation', 'label', pcap.label,
        'from_type', 'person', 'from_id', pa.person_id,
        'to_type', 'organization', 'to_id', pa.organization_id,
        'temporal', jsonb_build_object('start_date', pa.start_date, 'start_precision', pa.start_precision,
          'end_date', pa.end_date, 'end_precision', pa.end_precision, 'is_approximate', pa.is_approximate,
          'is_ongoing', pa.is_ongoing, 'date_is_unknown', pa.date_is_unknown, 'date_is_uncertain', pa.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', pa.source_type, 'verification_status', pa.verification_status)
      )
    from public.participations pa
    join public.people pp on pp.id = pa.person_id and pp.verification_status <> 'merged'
    join public.participation_capacities pcap on pcap.key = pa.capacity
    union all
    -- person-contribution attributions (temporal from the contribution)
    select 'person', pc.person_id, 'contribution', pc.contribution_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'person_contributions', 'id', pc.id),
        'category', 'contribution', 'label', ccap.label,
        'from_type', 'person', 'from_id', pc.person_id,
        'to_type', 'contribution', 'to_id', pc.contribution_id,
        'temporal', jsonb_build_object('start_date', c.start_date, 'start_precision', c.start_precision,
          'end_date', c.end_date, 'end_precision', c.end_precision, 'is_approximate', c.is_approximate,
          'is_ongoing', c.is_ongoing, 'date_is_unknown', c.date_is_unknown, 'date_is_uncertain', c.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', pc.source_type, 'verification_status', pc.verification_status)
      )
    from public.person_contributions pc
    join public.contributions c on c.id = pc.contribution_id
    join public.people pcp on pcp.id = pc.person_id and pcp.verification_status <> 'merged'
    join public.contribution_capacities ccap on ccap.key = pc.capacity
    union all
    -- organization-contribution attributions
    select 'organization', oc.organization_id, 'contribution', oc.contribution_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'organization_contributions', 'id', oc.id),
        'category', 'contribution', 'label', occap.label,
        'from_type', 'organization', 'from_id', oc.organization_id,
        'to_type', 'contribution', 'to_id', oc.contribution_id,
        'temporal', jsonb_build_object('start_date', c.start_date, 'start_precision', c.start_precision,
          'end_date', c.end_date, 'end_precision', c.end_precision, 'is_approximate', c.is_approximate,
          'is_ongoing', c.is_ongoing, 'date_is_unknown', c.date_is_unknown, 'date_is_uncertain', c.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', oc.source_type, 'verification_status', oc.verification_status)
      )
    from public.organization_contributions oc
    join public.contributions c on c.id = oc.contribution_id
    join public.contribution_capacities occap on occap.key = oc.capacity
    union all
    -- person-event associations (event provenance/temporal)
    select 'person', pev.person_id, 'event', pev.event_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'person_events', 'id', pev.id),
        'category', 'event', 'label', ek.label,
        'from_type', 'person', 'from_id', pev.person_id,
        'to_type', 'event', 'to_id', pev.event_id,
        'temporal', jsonb_build_object('start_date', ev.start_date, 'start_precision', ev.start_precision,
          'end_date', ev.end_date, 'end_precision', ev.end_precision, 'is_approximate', ev.is_approximate,
          'is_ongoing', ev.is_ongoing, 'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status)
      )
    from public.person_events pev
    join public.events ev on ev.id = pev.event_id
    join public.event_kinds ek on ek.key = ev.event_kind
    join public.people pep on pep.id = pev.person_id and pep.verification_status <> 'merged'
    union all
    -- organization-event associations
    select 'organization', oev.organization_id, 'event', oev.event_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'organization_events', 'id', oev.id),
        'category', 'event', 'label', ek.label,
        'from_type', 'organization', 'from_id', oev.organization_id,
        'to_type', 'event', 'to_id', oev.event_id,
        'temporal', jsonb_build_object('start_date', ev.start_date, 'start_precision', ev.start_precision,
          'end_date', ev.end_date, 'end_precision', ev.end_precision, 'is_approximate', ev.is_approximate,
          'is_ongoing', ev.is_ongoing, 'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status)
      )
    from public.organization_events oev
    join public.events ev on ev.id = oev.event_id
    join public.event_kinds ek on ek.key = ev.event_kind
    union all
    -- contribution-event associations
    select 'contribution', cev.contribution_id, 'event', cev.event_id,
      jsonb_build_object(
        'source', jsonb_build_object('type', 'contribution_events', 'id', cev.id),
        'category', 'event', 'label', ek.label,
        'from_type', 'contribution', 'from_id', cev.contribution_id,
        'to_type', 'event', 'to_id', cev.event_id,
        'temporal', jsonb_build_object('start_date', ev.start_date, 'start_precision', ev.start_precision,
          'end_date', ev.end_date, 'end_precision', ev.end_precision, 'is_approximate', ev.is_approximate,
          'is_ongoing', ev.is_ongoing, 'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status)
      )
    from public.contribution_events cev
    join public.events ev on ev.id = cev.event_id
    join public.event_kinds ek on ek.key = ev.event_kind
  ),
  edges as (
    -- undirected: each assertion is traversable both ways. The `core` records the
    -- assertion's own direction (from_type/from_id -> to_type/to_id); the
    -- reversed row swaps the traversal endpoints AND re-labels the step's from/to
    -- so the chain always reads in traversal order (from = the node arrived from).
    select xt a_type, xi a_id, yt b_type, yi b_id, core from raw_edges
    union all
    select yt a_type, yi a_id, xt b_type, xi b_id,
      core || jsonb_build_object('from_type', yt, 'from_id', yi, 'to_type', xt, 'to_id', xi)
    from raw_edges
  ),
  search as (
    select e.b_type cur_type, e.b_id cur_id, 1 depth,
      array['person:' || p_from::text, e.b_type || ':' || e.b_id::text] visited,
      array[e.core] steps,
      'person:' || p_from::text || '>' || e.b_type || ':' || e.b_id::text path_key
    from edges e
    where e.a_type = 'person' and e.a_id = p_from
      and not (e.b_type = 'person' and e.b_id = p_from)
    union all
    select e.b_type, e.b_id, s.depth + 1,
      s.visited || (e.b_type || ':' || e.b_id::text),
      s.steps || e.core,
      s.path_key || '>' || e.b_type || ':' || e.b_id::text
    from search s
    join edges e on e.a_type = s.cur_type and e.a_id = s.cur_id
    where s.depth < c_max_hops
      and not ((e.b_type || ':' || e.b_id::text) = any(s.visited))
      and not (s.cur_type = v_to_type and s.cur_id = p_to)
  )
  select s.steps
  into v_hit_steps
  from search s
  where s.cur_type = v_to_type and s.cur_id = p_to and s.depth >= 2
  order by s.depth asc, s.path_key asc
  limit 1;

  if v_hit_steps is null then
    return jsonb_build_object(
      'from_id', v_person.id, 'from', v_from_node,
      'to_id', p_to, 'to', v_to_node,
      'target_resolved', true, 'found', false, 'step_count', 0, 'steps', '[]'::jsonb
    );
  end if;

  -- Resolve each step's endpoint nodes and assemble the ordered chain.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'source', st->'source',
      'category', st->>'category',
      'label', st->>'label',
      'from', public.pathway_entity_node(st->>'from_type', (st->>'from_id')::uuid),
      'to', public.pathway_entity_node(st->>'to_type', (st->>'to_id')::uuid),
      'temporal', st->'temporal',
      'provenance', st->'provenance'
    ) order by ord
  ), '[]'::jsonb)
  into v_path
  from unnest(v_hit_steps) with ordinality as u(st, ord);

  return jsonb_build_object(
    'from_id', v_person.id, 'from', v_from_node,
    'to_id', p_to, 'to', v_to_node,
    'target_resolved', true, 'found', true,
    'step_count', array_length(v_hit_steps, 1), 'steps', v_path
  );
end;
$$;

comment on function public.reveal_person_pathway(uuid, uuid) is
  'M8.6 Revelation Engine -- bounded pathway (C6). Returns an authenticated reader '
  'the shortest DOCUMENTED CHAIN of >= 2 explicit-assertion steps connecting a '
  'focal person to a selected target entity (person/organization/contribution/'
  'event) through intermediaries, over the heterogeneous canonical assertion graph, '
  'bounded to a small hop cap (4) and cycle-safe. Each step decomposes to its '
  'canonical row with both endpoints as ProjectedNodes, its category/label, '
  'temporal, and provenance. Deterministic, read-only; a single minimal-length '
  'chain chosen by depth then a neutral path key -- never by any metric, never '
  'ranked. ENDPOINT RULE: the chain asserts nothing about its endpoints beyond its '
  'literal existence; the surface says "a documented chain of N steps connects A '
  'and B", never "A is connected to B". No inference, similarity, statistics, or '
  'centrality. Merged people excluded. Null for a merged/nonexistent focal. '
  'SECURITY DEFINER. Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_person_pathway(uuid, uuid) from public;
grant execute on function public.reveal_person_pathway(uuid, uuid) to authenticated;
