-- Milestone M7: Knowledge Network Engine -- connecting the preserved history.
--
-- M6 PRESERVED the records (people, events, participations, relationships,
-- institutions, contributions, each an Assertion with provenance, verification,
-- and honest temporal uncertainty). M7 CONNECTS them: it lets a reader move
-- through the production of scientific knowledge as a connected historical
-- fabric, while every connection stays historically situated, provenance-
-- bearing, temporally honest, and explainable. See
-- docs/decisions/0017-knowledge-network-engine.md and
-- docs/m7-knowledge-network-engine.md.
--
-- Ratified architecture (ADR-0017): the Knowledge Network is a DERIVED,
-- provenance-preserving READ MODEL over canonical records. It is NOT a source
-- of historical truth, NOT a generic edge store, NOT a universal Entity table,
-- and NOT a graph database. Most M7 connections are PROJECTIONS of Assertions
-- already stored by M1-M6:
--   * Person <-> Institution   from public.participations
--   * Person <-> Person        from public.relationships
--   * Person <-> Contribution  from public.person_contributions
--   * Institution <-> Contribution from public.organization_contributions
--   * Person <-> Event         from public.person_events
--   * Institution <-> Event    from public.organization_events
--   * Contribution <-> Event   from public.contribution_events
-- Deleting or changing any of those canonical rows automatically changes its
-- network projection, because the projection is computed at read time and
-- copies nothing. Every projected connection carries a pointer to the exact
-- canonical row that justifies it ("source"); the projection is NEVER evidence
-- for its own edge.
--
-- The ONE genuine schema gap this migration fills is institution-to-institution
-- historical relationships (predecessor/successor, parent/subordinate,
-- administered-by, hosted-by, affiliation, merger, joint operation). Renames
-- are already represented by organization_names (M6.5); participation,
-- contribution, and event links already carry the other institutional
-- connections. Institutional relationships are EXPLICIT assertions, mirroring
-- the M6.4 Relationship Engine exactly (composite kind/directionality FK,
-- canonical ordering for symmetric bonds, no self-link, duplicate prevention,
-- the shared Many-Clocks temporal model, provenance + verification, an optional
-- historically bounded note, deny-by-default RLS). They are NEVER inferred from
-- shared personnel, shared contributors, a shared event, similar names,
-- geographic proximity, common funding, web links, overlapping topics,
-- co-authorship, or participation. There is no untyped "related institution".
--
-- Adds:
--   1. public.organization_relationship_kinds -- data-backed controlled
--      vocabulary of institutional relationship kinds (directionality + role
--      labels + inverse labels). Node-neutral; extended as DATA, never code.
--   2. public.organization_relationships -- ONE canonical record per bond
--      between two institutions.
--   3. public.get_organization_relationships(uuid) -- perspective-projecting
--      read model for institutional lineage (same shape as
--      get_person_relationships).
--   4. Bounded ONE-HOP network read models, each SECURITY DEFINER, search_path
--      pinned, auth-enforced in-body, revoked from PUBLIC, granted to
--      authenticated only, fail-closed, canonical-source-preserving,
--      temporally honest, deterministically ordered:
--        * get_person_network(uuid)
--        * get_organization_network(uuid)
--        * get_contribution_network(uuid)
--        * get_event_network(uuid)
--
-- Deferred (reserved, not built): inferred/suggested connections, link
-- prediction, similarity, recommendations, semantic search, centrality/ranking/
-- influence, two-hop or whole-graph traversal, a graph database, RDF/SPARQL, a
-- public API, federation/tenancy/Node administration, contribution-to-
-- contribution intellectual lineage, and any network VISUALIZATION beyond an
-- honest reserved surface (ADR-0017 sections 8, 9, 12). These belong to M8
-- (discovery) and M9 (interpretation) or to a later ratified need.
--
-- One-hop means: only connections directly justified by canonical Assertions
-- involving the focal record. No friend-of-a-friend, no path expansion
-- disguised as data. No overlap, co-occurrence, shared keyword, shared
-- institution, or shared event ever becomes a connection here.

-- =====================================================================
-- organization_relationship_kinds -- generic controlled vocabulary (data)
-- =====================================================================

create table public.organization_relationship_kinds (
  key text primary key,
  label text not null,                -- neutral name of the bond ("Succession")
  is_directional boolean not null,    -- directional (predecessor->successor) vs symmetric (affiliates)

  -- The role each end plays, singular (for one entry) and plural (for a group
  -- heading), with correct INVERSE labels on both institutions' pages: on the
  -- source's page the counterpart shows the target role; on the target's page,
  -- the source role. For symmetric kinds the source and target roles match.
  source_role_label text not null,
  source_role_label_plural text not null,
  target_role_label text not null,
  target_role_label_plural text not null,

  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint organization_relationship_kinds_key_not_blank check (btrim(key) <> ''),
  constraint organization_relationship_kinds_label_not_blank check (btrim(label) <> ''),
  constraint organization_relationship_kinds_source_role_not_blank check (btrim(source_role_label) <> ''),
  constraint organization_relationship_kinds_target_role_not_blank check (btrim(target_role_label) <> ''),
  -- A symmetric kind must have identical source/target roles (there is no
  -- direction to distinguish them); a directional kind should differ.
  constraint organization_relationship_kinds_symmetric_roles_match check (
    is_directional or (source_role_label = target_role_label and source_role_label_plural = target_role_label_plural)
  ),
  -- Referenced by the composite FK on organization_relationships so a row's
  -- denormalized is_directional is forced to match its kind's.
  constraint organization_relationship_kinds_key_directional_unique unique (key, is_directional)
);

comment on table public.organization_relationship_kinds is
  'Generic, discipline-independent controlled vocabulary of institution-to-'
  'institution relationship kinds (docs/controlled-vocabularies.md), each '
  'declaring directionality and the role each end plays (singular + plural, for '
  'inverse-label display on both institutions'' pages). Node-neutral: a Node '
  'adds its own kinds as DATA, never code. Deny-by-default; surfaced only '
  'through get_organization_relationships / get_organization_network.';

alter table public.organization_relationship_kinds enable row level security;
grant select, insert, update, delete on public.organization_relationship_kinds to service_role;

-- Founding institutional vocabulary. Directional kinds name two distinct roles;
-- symmetric kinds repeat one role. Extensible as data without a code change.
insert into public.organization_relationship_kinds
  (key, label, is_directional, source_role_label, source_role_label_plural, target_role_label, target_role_label_plural, description, sort_order) values
  ('succession',      'Succession',              true,  'Predecessor',         'Predecessors',          'Successor',            'Successors',            'A succession: the source institution preceded the target in role or work.',      10),
  ('parent_body',     'Parent body',             true,  'Parent body',         'Parent bodies',         'Subordinate body',     'Subordinate bodies',    'A structural parent/subordinate relationship between institutions.',             20),
  ('administration',  'Administration',          true,  'Administering body',  'Administering bodies',  'Administered body',    'Administered bodies',   'One institution administered another.',                                          30),
  ('hosting',         'Hosting',                 true,  'Host',                'Hosts',                 'Hosted body',          'Hosted bodies',         'One institution hosted another (e.g. a station or programme).',                   40),
  ('merger',          'Merger',                  true,  'Antecedent body',     'Antecedent bodies',     'Merged-successor body','Merged-successor bodies','One institution merged into / was formed from another.',                        50),
  ('affiliation',     'Affiliation',             false, 'Affiliated institution','Affiliated institutions','Affiliated institution','Affiliated institutions','A formal affiliation between two institutions.',                             60),
  ('partnership',     'Institutional partnership',false,'Partner institution', 'Partner institutions',  'Partner institution',  'Partner institutions',  'A formal partnership between two institutions.',                                 70),
  ('joint_operation', 'Joint operation',         false, 'Joint operator',      'Joint operators',       'Joint operator',       'Joint operators',       'Two institutions jointly operated a shared endeavour.',                          80),
  ('other',           'Institutional relationship',false,'Associated institution','Associated institutions','Associated institution','Associated institutions','A curated institutional relationship not covered by another kind.',           900);

-- =====================================================================
-- organization_relationships -- ONE canonical record per institutional bond
-- =====================================================================

create table public.organization_relationships (
  id uuid primary key default gen_random_uuid(),

  kind text not null,
  -- Denormalized from the kind and FORCED to match it by the composite FK
  -- below, so the symmetric-canonical CHECK (which cannot join to the kinds
  -- table) can guarantee reciprocal bonds are stored once.
  is_directional boolean not null,

  source_organization_id uuid not null references public.organizations (id) on delete cascade,
  target_organization_id uuid not null references public.organizations (id) on delete cascade,

  note text,   -- optional, historically bounded note: how the relationship
               -- began, its context, how it changed, why it matters. Never
               -- auto-generated; a missing note is honest.

  -- The SHARED Many-Clocks temporal model -- identical to relationships /
  -- participations / events, so an institutional bond's span is dated with the
  -- same honesty (precision / approximation / uncertainty / missing + intervals
  -- + open-ended).
  start_date date,
  start_precision text,
  end_date date,
  end_precision text,
  is_approximate boolean not null default false,
  is_ongoing boolean not null default false,
  date_is_unknown boolean not null default false,
  date_is_uncertain boolean not null default false,

  source_type text not null,
  verification_status text not null default 'provisional',
  created_by_user_id uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The kind reference; the composite target forces is_directional == kind's.
  constraint organization_relationships_kind_fkey foreign key (kind, is_directional)
    references public.organization_relationship_kinds (key, is_directional),

  -- No self-relationship: a bond is between two DISTINCT institutions.
  constraint organization_relationships_no_self check (source_organization_id <> target_organization_id),

  -- Canonical reciprocal storage: a SYMMETRIC bond is stored once, in a fixed
  -- order (source < target), so (A,B) and (B,A) can never both exist. A
  -- DIRECTIONAL bond keeps source/target meaning (A->B and B->A are distinct).
  constraint organization_relationships_symmetric_canonical check (
    is_directional or source_organization_id < target_organization_id
  ),
  -- Prevents exact duplicates; combined with the canonical order above, also
  -- prevents symmetric mirror duplicates.
  constraint organization_relationships_unique unique (kind, source_organization_id, target_organization_id),

  constraint organization_relationships_note_not_blank check (
    note is null or btrim(note) <> ''
  ),

  -- Temporal invariants (identical discipline to relationships / participations).
  constraint organization_relationships_start_precision_valid check (
    start_precision is null or start_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint organization_relationships_end_precision_valid check (
    end_precision is null or end_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint organization_relationships_start_precision_matches_date check (
    (start_date is null) = (start_precision is null)
  ),
  constraint organization_relationships_end_precision_matches_date check (
    (end_date is null) = (end_precision is null)
  ),
  constraint organization_relationships_unknown_iff_no_start check (
    (start_date is null) = date_is_unknown
  ),
  constraint organization_relationships_end_requires_start check (
    end_date is null or start_date is not null
  ),
  constraint organization_relationships_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  constraint organization_relationships_ongoing_requires_open_start check (
    not is_ongoing or (start_date is not null and end_date is null)
  ),
  constraint organization_relationships_unknown_excludes_qualifiers check (
    not date_is_unknown or (not is_approximate and not is_ongoing and not date_is_uncertain)
  ),
  constraint organization_relationships_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  constraint organization_relationships_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  )
);

comment on table public.organization_relationships is
  'ONE canonical record per historically meaningful bond between two '
  'institutions (never a pair of mirror rows). The single new canonical '
  'relation introduced by M7 (ADR-0017): the institution-to-institution '
  'connection that could not be projected from participation, contribution, '
  'event, or name history. Symmetric bonds are stored in canonical order '
  '(source < target); directional bonds keep source/target meaning. Carries '
  'provenance + verification + an optional historically bounded note; a row '
  'never implies truth and is NEVER inferred from shared personnel, contributors, '
  'events, names, proximity, funding, or participation. Deny-by-default; read '
  'via get_organization_relationships / get_organization_network.';
comment on column public.organization_relationships.is_directional is
  'Denormalized from organization_relationship_kinds and forced to match it by '
  'organization_relationships_kind_fkey; present so the symmetric-canonical '
  'CHECK can run.';
comment on column public.organization_relationships.note is
  'Optional historically bounded note. Never auto-generated/AI; a missing note '
  'is an honest state, distinct from the factual assertions.';

create index organization_relationships_source_organization_id_idx on public.organization_relationships (source_organization_id);
create index organization_relationships_target_organization_id_idx on public.organization_relationships (target_organization_id);
create index organization_relationships_kind_idx on public.organization_relationships (kind);
create index organization_relationships_verification_status_idx on public.organization_relationships (verification_status);
create index organization_relationships_start_date_idx on public.organization_relationships (start_date);

create trigger organization_relationships_set_updated_at
  before update on public.organization_relationships
  for each row
  execute function public.set_updated_at();

alter table public.organization_relationships enable row level security;
grant select, insert, update, delete on public.organization_relationships to service_role;

-- =====================================================================
-- get_organization_relationships -- institutional lineage, per-org perspective
-- =====================================================================
--
-- Mirrors get_person_relationships exactly, for institutions. SECURITY DEFINER,
-- search_path pinned, auth.uid() required, EXECUTE to authenticated only, tables
-- stay locked. For the given institution it returns EACH bond ONCE, from THAT
-- institution's perspective: its role, the counterpart's role and its INVERSE
-- label (singular + plural), and the direction (outgoing / incoming /
-- symmetric) -- so the SAME canonical record appears correctly on both
-- institutions' pages without duplication. Ordered chronologically (undated
-- last). Provisional/disputed bonds ARE returned (rendered calmly); existence
-- never implies truth. A nonexistent institution returns null (institutions are
-- never hidden by status). Grouping is the client's job.

create function public.get_organization_relationships(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_relationships jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_organization_relationships: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select o.id into v_org_id from public.organizations o where o.id = p_organization_id;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'is_directional', r.is_directional),
        'counterpart', jsonb_build_object('id', cp.id, 'name', cp.name, 'short_name', cp.short_name),
        'perspective', jsonb_build_object(
          'organization_role_label',
            case when r.source_organization_id = v_org_id then k.source_role_label else k.target_role_label end,
          'counterpart_role_label',
            case when r.source_organization_id = v_org_id then k.target_role_label else k.source_role_label end,
          'counterpart_role_label_plural',
            case when r.source_organization_id = v_org_id then k.target_role_label_plural else k.source_role_label_plural end,
          'direction',
            case when not r.is_directional then 'symmetric'
                 when r.source_organization_id = v_org_id then 'outgoing'
                 else 'incoming' end
        ),
        'note', r.note,
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
        )
      )
      order by r.start_date asc nulls last, r.created_at asc
    ),
    '[]'::jsonb
  )
  into v_relationships
  from public.organization_relationships r
  join public.organization_relationship_kinds k
    on k.key = r.kind and k.is_directional = r.is_directional
  join public.organizations cp
    on cp.id = (case when r.source_organization_id = v_org_id then r.target_organization_id else r.source_organization_id end)
  where (r.source_organization_id = v_org_id or r.target_organization_id = v_org_id);

  return jsonb_build_object('organization_id', v_org_id, 'relationships', v_relationships);
end;
$$;

comment on function public.get_organization_relationships(uuid) is
  'Canonical institutional-relationships read model. Returns an authenticated '
  'reader a provenance-bearing set of an institution''s bonds (jsonb), each '
  'projected from THAT institution''s perspective with correct inverse labels, '
  'ordered chronologically (undated last); null for a nonexistent institution. '
  'SECURITY DEFINER -- see docs/decisions/0017-knowledge-network-engine.md. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.get_organization_relationships(uuid) from public;
grant execute on function public.get_organization_relationships(uuid) to authenticated;

-- =====================================================================
-- get_person_network -- one-hop neighbourhood centred on a person
-- =====================================================================
--
-- Projects the canonical Assertions that DIRECTLY involve this person into the
-- common network reading shape: participations (-> institutions), relationships
-- (-> people), person_contributions (-> contributions), person_events
-- (-> events). One hop only; no inference; every connection carries its
-- canonical source row id. Merged counterpart PEOPLE are omitted (their detail
-- pages 404). A merged/nonexistent person returns null. Connections are
-- returned as a single flat, deterministically ordered array (family, then
-- chronology undated-last, then label, then id); grouping is the client's job.

create function public.get_person_network(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_connections jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_person_network: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;

  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  select coalesce(
    jsonb_agg(c.connection order by c.sort_family, c.sort_date asc nulls last, c.sort_label asc, c.projected_id asc),
    '[]'::jsonb
  )
  into v_connections
  from (
    -- Person <-> Institution (from participations)
    select
      1 as sort_family, pa.start_date as sort_date, org.name as sort_label,
      'participation:' || pa.id as projected_id,
      jsonb_build_object(
        'id', 'participation:' || pa.id,
        'family', 'participation',
        'direction', 'outgoing',
        'node', jsonb_build_object('type', 'organization', 'id', org.id, 'label', org.name, 'secondary_label', org.short_name, 'href', '/institutions/' || org.id, 'verification_status', org.verification_status),
        'kind', jsonb_build_object('key', cap.key, 'label', cap.label),
        'perspective', null,
        'temporal', jsonb_build_object('start_date', pa.start_date, 'start_precision', pa.start_precision, 'end_date', pa.end_date, 'end_precision', pa.end_precision, 'is_approximate', pa.is_approximate, 'is_ongoing', pa.is_ongoing, 'date_is_unknown', pa.date_is_unknown, 'date_is_uncertain', pa.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', pa.source_type, 'verification_status', pa.verification_status),
        'source', jsonb_build_object('type', 'participations', 'id', pa.id),
        'visibility', 'visible'
      ) as connection
    from public.participations pa
    join public.organizations org on org.id = pa.organization_id
    join public.participation_capacities cap on cap.key = pa.capacity
    where pa.person_id = v_person.id

    union all

    -- Person <-> Person (from relationships), projected from this person's view
    select
      2, r.start_date, cp.display_name,
      'relationship:' || r.id,
      jsonb_build_object(
        'id', 'relationship:' || r.id,
        'family', 'relationship',
        'direction', case when not r.is_directional then 'symmetric' when r.source_person_id = v_person.id then 'outgoing' else 'incoming' end,
        'node', jsonb_build_object('type', 'person', 'id', cp.id, 'label', cp.display_name, 'secondary_label', null, 'href', '/people/' || cp.id, 'verification_status', cp.verification_status),
        'kind', jsonb_build_object('key', k.key, 'label', k.label),
        'perspective', jsonb_build_object(
          'focal_role_label', case when r.source_person_id = v_person.id then k.source_role_label else k.target_role_label end,
          'counterpart_role_label', case when r.source_person_id = v_person.id then k.target_role_label else k.source_role_label end,
          'counterpart_role_label_plural', case when r.source_person_id = v_person.id then k.target_role_label_plural else k.source_role_label_plural end
        ),
        'temporal', jsonb_build_object('start_date', r.start_date, 'start_precision', r.start_precision, 'end_date', r.end_date, 'end_precision', r.end_precision, 'is_approximate', r.is_approximate, 'is_ongoing', r.is_ongoing, 'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status),
        'source', jsonb_build_object('type', 'relationships', 'id', r.id),
        'visibility', 'visible'
      )
    from public.relationships r
    join public.relationship_kinds k on k.key = r.kind and k.is_directional = r.is_directional
    join public.people cp on cp.id = (case when r.source_person_id = v_person.id then r.target_person_id else r.source_person_id end)
    where (r.source_person_id = v_person.id or r.target_person_id = v_person.id)
      and cp.verification_status <> 'merged'

    union all

    -- Person <-> Contribution (from person_contributions)
    select
      3, null::date, c.title,
      'person_contribution:' || pc.id,
      jsonb_build_object(
        'id', 'person_contribution:' || pc.id,
        'family', 'contribution_attribution',
        'direction', 'outgoing',
        'node', jsonb_build_object('type', 'contribution', 'id', c.id, 'label', c.title, 'secondary_label', ck.label, 'href', '/contributions/' || c.id, 'verification_status', c.verification_status),
        'kind', jsonb_build_object('key', cap.key, 'label', cap.label),
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', pc.source_type, 'verification_status', pc.verification_status),
        'source', jsonb_build_object('type', 'person_contributions', 'id', pc.id),
        'visibility', 'visible'
      )
    from public.person_contributions pc
    join public.contributions c on c.id = pc.contribution_id
    join public.contribution_kinds ck on ck.key = c.contribution_kind
    join public.contribution_capacities cap on cap.key = pc.capacity
    where pc.person_id = v_person.id

    union all

    -- Person <-> Event (from person_events); event nodes have no reading route
    select
      4, ev.start_date, ev.title,
      'person_event:' || pe.id,
      jsonb_build_object(
        'id', 'person_event:' || pe.id,
        'family', 'event_association',
        'direction', 'undirected',
        'node', jsonb_build_object('type', 'event', 'id', ev.id, 'label', ev.title, 'secondary_label', ek.label, 'href', null, 'verification_status', ev.verification_status),
        'kind', jsonb_build_object('key', ek.key, 'label', ek.label),
        'perspective', null,
        'temporal', jsonb_build_object('start_date', ev.start_date, 'start_precision', ev.start_precision, 'end_date', ev.end_date, 'end_precision', ev.end_precision, 'is_approximate', ev.is_approximate, 'is_ongoing', ev.is_ongoing, 'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status),
        'source', jsonb_build_object('type', 'person_events', 'id', pe.id),
        'visibility', 'visible'
      )
    from public.person_events pe
    join public.events ev on ev.id = pe.event_id
    join public.event_kinds ek on ek.key = ev.event_kind
    where pe.person_id = v_person.id
  ) c;

  return jsonb_build_object(
    'focal', jsonb_build_object('type', 'person', 'id', v_person.id, 'label', v_person.display_name, 'secondary_label', null, 'href', '/people/' || v_person.id, 'verification_status', v_person.verification_status),
    'connections', v_connections
  );
end;
$$;

comment on function public.get_person_network(uuid) is
  'One-hop Knowledge Network read model centred on a person: participations, '
  'relationships, contribution attributions, and event associations projected '
  'into the common network shape, each preserving its canonical source row. No '
  'inference, no metrics. Merged counterpart people omitted; null for a merged/'
  'nonexistent person. SECURITY DEFINER -- ADR-0017. Never grant to anon/PUBLIC.';

revoke all on function public.get_person_network(uuid) from public;
grant execute on function public.get_person_network(uuid) to authenticated;

-- =====================================================================
-- get_organization_network -- one-hop neighbourhood centred on an institution
-- =====================================================================
--
-- Projects: participations (-> people), organization_contributions
-- (-> contributions), organization_events (-> events), and the NEW canonical
-- organization_relationships (-> institutions, institutional lineage). One hop;
-- no inference; canonical source preserved. Merged member PEOPLE are omitted.
-- Institutions are never hidden by status; a nonexistent institution returns
-- null.

create function public.get_organization_network(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  v_connections jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_organization_network: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(c.connection order by c.sort_family, c.sort_date asc nulls last, c.sort_label asc, c.projected_id asc),
    '[]'::jsonb
  )
  into v_connections
  from (
    -- Institution <-> Institution (from organization_relationships), per this org's view
    select
      1 as sort_family, r.start_date as sort_date, cp.name as sort_label,
      'organization_relationship:' || r.id as projected_id,
      jsonb_build_object(
        'id', 'organization_relationship:' || r.id,
        'family', 'institutional_relationship',
        'direction', case when not r.is_directional then 'symmetric' when r.source_organization_id = v_org.id then 'outgoing' else 'incoming' end,
        'node', jsonb_build_object('type', 'organization', 'id', cp.id, 'label', cp.name, 'secondary_label', cp.short_name, 'href', '/institutions/' || cp.id, 'verification_status', cp.verification_status),
        'kind', jsonb_build_object('key', k.key, 'label', k.label),
        'perspective', jsonb_build_object(
          'focal_role_label', case when r.source_organization_id = v_org.id then k.source_role_label else k.target_role_label end,
          'counterpart_role_label', case when r.source_organization_id = v_org.id then k.target_role_label else k.source_role_label end,
          'counterpart_role_label_plural', case when r.source_organization_id = v_org.id then k.target_role_label_plural else k.source_role_label_plural end
        ),
        'temporal', jsonb_build_object('start_date', r.start_date, 'start_precision', r.start_precision, 'end_date', r.end_date, 'end_precision', r.end_precision, 'is_approximate', r.is_approximate, 'is_ongoing', r.is_ongoing, 'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status),
        'source', jsonb_build_object('type', 'organization_relationships', 'id', r.id),
        'visibility', 'visible'
      ) as connection
    from public.organization_relationships r
    join public.organization_relationship_kinds k on k.key = r.kind and k.is_directional = r.is_directional
    join public.organizations cp on cp.id = (case when r.source_organization_id = v_org.id then r.target_organization_id else r.source_organization_id end)
    where (r.source_organization_id = v_org.id or r.target_organization_id = v_org.id)

    union all

    -- Institution <-> Person (from participations)
    select
      2, pa.start_date, pe.display_name,
      'participation:' || pa.id,
      jsonb_build_object(
        'id', 'participation:' || pa.id,
        'family', 'participation',
        'direction', 'incoming',
        'node', jsonb_build_object('type', 'person', 'id', pe.id, 'label', pe.display_name, 'secondary_label', null, 'href', '/people/' || pe.id, 'verification_status', pe.verification_status),
        'kind', jsonb_build_object('key', cap.key, 'label', cap.label),
        'perspective', null,
        'temporal', jsonb_build_object('start_date', pa.start_date, 'start_precision', pa.start_precision, 'end_date', pa.end_date, 'end_precision', pa.end_precision, 'is_approximate', pa.is_approximate, 'is_ongoing', pa.is_ongoing, 'date_is_unknown', pa.date_is_unknown, 'date_is_uncertain', pa.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', pa.source_type, 'verification_status', pa.verification_status),
        'source', jsonb_build_object('type', 'participations', 'id', pa.id),
        'visibility', 'visible'
      )
    from public.participations pa
    join public.people pe on pe.id = pa.person_id
    join public.participation_capacities cap on cap.key = pa.capacity
    where pa.organization_id = v_org.id
      and pe.verification_status <> 'merged'

    union all

    -- Institution <-> Contribution (from organization_contributions)
    select
      3, null::date, c.title,
      'organization_contribution:' || oc.id,
      jsonb_build_object(
        'id', 'organization_contribution:' || oc.id,
        'family', 'contribution_attribution',
        'direction', 'outgoing',
        'node', jsonb_build_object('type', 'contribution', 'id', c.id, 'label', c.title, 'secondary_label', ck.label, 'href', '/contributions/' || c.id, 'verification_status', c.verification_status),
        'kind', jsonb_build_object('key', cap.key, 'label', cap.label),
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', oc.source_type, 'verification_status', oc.verification_status),
        'source', jsonb_build_object('type', 'organization_contributions', 'id', oc.id),
        'visibility', 'visible'
      )
    from public.organization_contributions oc
    join public.contributions c on c.id = oc.contribution_id
    join public.contribution_kinds ck on ck.key = c.contribution_kind
    join public.contribution_capacities cap on cap.key = oc.capacity
    where oc.organization_id = v_org.id

    union all

    -- Institution <-> Event (from organization_events)
    select
      4, ev.start_date, ev.title,
      'organization_event:' || oe.id,
      jsonb_build_object(
        'id', 'organization_event:' || oe.id,
        'family', 'event_association',
        'direction', 'undirected',
        'node', jsonb_build_object('type', 'event', 'id', ev.id, 'label', ev.title, 'secondary_label', ek.label, 'href', null, 'verification_status', ev.verification_status),
        'kind', jsonb_build_object('key', ek.key, 'label', ek.label),
        'perspective', null,
        'temporal', jsonb_build_object('start_date', ev.start_date, 'start_precision', ev.start_precision, 'end_date', ev.end_date, 'end_precision', ev.end_precision, 'is_approximate', ev.is_approximate, 'is_ongoing', ev.is_ongoing, 'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status),
        'source', jsonb_build_object('type', 'organization_events', 'id', oe.id),
        'visibility', 'visible'
      )
    from public.organization_events oe
    join public.events ev on ev.id = oe.event_id
    join public.event_kinds ek on ek.key = ev.event_kind
    where oe.organization_id = v_org.id
  ) c;

  return jsonb_build_object(
    'focal', jsonb_build_object('type', 'organization', 'id', v_org.id, 'label', v_org.name, 'secondary_label', v_org.short_name, 'href', '/institutions/' || v_org.id, 'verification_status', v_org.verification_status),
    'connections', v_connections
  );
end;
$$;

comment on function public.get_organization_network(uuid) is
  'One-hop Knowledge Network read model centred on an institution: institutional '
  'relationships, participations, contribution attributions, and event '
  'associations projected into the common network shape, each preserving its '
  'canonical source row. No inference, no metrics. Merged member people omitted; '
  'null for a nonexistent institution. SECURITY DEFINER -- ADR-0017. Never grant '
  'to anon/PUBLIC.';

revoke all on function public.get_organization_network(uuid) from public;
grant execute on function public.get_organization_network(uuid) to authenticated;

-- =====================================================================
-- get_contribution_network -- one-hop neighbourhood centred on a contribution
-- =====================================================================
--
-- Projects: person_contributions (-> people), organization_contributions
-- (-> institutions), contribution_events (-> events). One hop; no inference;
-- canonical source preserved. Merged contributor PEOPLE are omitted. A
-- nonexistent contribution returns null.

create function public.get_contribution_network(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_c public.contributions%rowtype;
  v_connections jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_contribution_network: authentication required';
  end if;

  if p_contribution_id is null then
    return null;
  end if;

  select * into v_c from public.contributions c where c.id = p_contribution_id;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(c.connection order by c.sort_family, c.sort_date asc nulls last, c.sort_label asc, c.projected_id asc),
    '[]'::jsonb
  )
  into v_connections
  from (
    -- Contribution <-> Person (from person_contributions)
    select
      1 as sort_family, null::date as sort_date, pe.display_name as sort_label,
      'person_contribution:' || pc.id as projected_id,
      jsonb_build_object(
        'id', 'person_contribution:' || pc.id,
        'family', 'contribution_attribution',
        'direction', 'incoming',
        'node', jsonb_build_object('type', 'person', 'id', pe.id, 'label', pe.display_name, 'secondary_label', null, 'href', '/people/' || pe.id, 'verification_status', pe.verification_status),
        'kind', jsonb_build_object('key', cap.key, 'label', cap.label),
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', pc.source_type, 'verification_status', pc.verification_status),
        'source', jsonb_build_object('type', 'person_contributions', 'id', pc.id),
        'visibility', 'visible'
      ) as connection
    from public.person_contributions pc
    join public.people pe on pe.id = pc.person_id
    join public.contribution_capacities cap on cap.key = pc.capacity
    where pc.contribution_id = v_c.id
      and pe.verification_status <> 'merged'

    union all

    -- Contribution <-> Institution (from organization_contributions)
    select
      2, null::date, org.name,
      'organization_contribution:' || oc.id,
      jsonb_build_object(
        'id', 'organization_contribution:' || oc.id,
        'family', 'contribution_attribution',
        'direction', 'incoming',
        'node', jsonb_build_object('type', 'organization', 'id', org.id, 'label', org.name, 'secondary_label', org.short_name, 'href', '/institutions/' || org.id, 'verification_status', org.verification_status),
        'kind', jsonb_build_object('key', cap.key, 'label', cap.label),
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', oc.source_type, 'verification_status', oc.verification_status),
        'source', jsonb_build_object('type', 'organization_contributions', 'id', oc.id),
        'visibility', 'visible'
      )
    from public.organization_contributions oc
    join public.organizations org on org.id = oc.organization_id
    join public.contribution_capacities cap on cap.key = oc.capacity
    where oc.contribution_id = v_c.id

    union all

    -- Contribution <-> Event (from contribution_events)
    select
      3, ev.start_date, ev.title,
      'contribution_event:' || ce.id,
      jsonb_build_object(
        'id', 'contribution_event:' || ce.id,
        'family', 'event_association',
        'direction', 'undirected',
        'node', jsonb_build_object('type', 'event', 'id', ev.id, 'label', ev.title, 'secondary_label', ek.label, 'href', null, 'verification_status', ev.verification_status),
        'kind', jsonb_build_object('key', ek.key, 'label', ek.label),
        'perspective', null,
        'temporal', jsonb_build_object('start_date', ev.start_date, 'start_precision', ev.start_precision, 'end_date', ev.end_date, 'end_precision', ev.end_precision, 'is_approximate', ev.is_approximate, 'is_ongoing', ev.is_ongoing, 'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status),
        'source', jsonb_build_object('type', 'contribution_events', 'id', ce.id),
        'visibility', 'visible'
      )
    from public.contribution_events ce
    join public.events ev on ev.id = ce.event_id
    join public.event_kinds ek on ek.key = ev.event_kind
    where ce.contribution_id = v_c.id
  ) c;

  return jsonb_build_object(
    'focal', jsonb_build_object('type', 'contribution', 'id', v_c.id, 'label', v_c.title, 'secondary_label', null, 'href', '/contributions/' || v_c.id, 'verification_status', v_c.verification_status),
    'connections', v_connections
  );
end;
$$;

comment on function public.get_contribution_network(uuid) is
  'One-hop Knowledge Network read model centred on a contribution: person and '
  'institution attributions and event associations projected into the common '
  'network shape, each preserving its canonical source row. No inference, no '
  'metrics. Merged contributor people omitted; null for a nonexistent '
  'contribution. SECURITY DEFINER -- ADR-0017. Never grant to anon/PUBLIC.';

revoke all on function public.get_contribution_network(uuid) from public;
grant execute on function public.get_contribution_network(uuid) to authenticated;

-- =====================================================================
-- get_event_network -- one-hop neighbourhood centred on an event
-- =====================================================================
--
-- Projects: person_events (-> people), organization_events (-> institutions),
-- contribution_events (-> contributions). One hop; no inference; canonical
-- source preserved. Merged people omitted. A nonexistent event returns null.
-- Events have no dedicated reading route yet; this bounded read is provided for
-- completeness and future event surfaces (ADR-0017), and is exercised by tests.

create function public.get_event_network(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ev public.events%rowtype;
  v_connections jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_event_network: authentication required';
  end if;

  if p_event_id is null then
    return null;
  end if;

  select * into v_ev from public.events e where e.id = p_event_id;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(c.connection order by c.sort_family, c.sort_label asc, c.projected_id asc),
    '[]'::jsonb
  )
  into v_connections
  from (
    select
      1 as sort_family, pe.display_name as sort_label,
      'person_event:' || pev.id as projected_id,
      jsonb_build_object(
        'id', 'person_event:' || pev.id,
        'family', 'event_association',
        'direction', 'undirected',
        'node', jsonb_build_object('type', 'person', 'id', pe.id, 'label', pe.display_name, 'secondary_label', null, 'href', '/people/' || pe.id, 'verification_status', pe.verification_status),
        'kind', null,
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', v_ev.source_type, 'verification_status', v_ev.verification_status),
        'source', jsonb_build_object('type', 'person_events', 'id', pev.id),
        'visibility', 'visible'
      ) as connection
    from public.person_events pev
    join public.people pe on pe.id = pev.person_id
    where pev.event_id = v_ev.id
      and pe.verification_status <> 'merged'

    union all

    select
      2, org.name,
      'organization_event:' || oe.id,
      jsonb_build_object(
        'id', 'organization_event:' || oe.id,
        'family', 'event_association',
        'direction', 'undirected',
        'node', jsonb_build_object('type', 'organization', 'id', org.id, 'label', org.name, 'secondary_label', org.short_name, 'href', '/institutions/' || org.id, 'verification_status', org.verification_status),
        'kind', null,
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', v_ev.source_type, 'verification_status', v_ev.verification_status),
        'source', jsonb_build_object('type', 'organization_events', 'id', oe.id),
        'visibility', 'visible'
      )
    from public.organization_events oe
    join public.organizations org on org.id = oe.organization_id
    where oe.event_id = v_ev.id

    union all

    select
      3, c2.title,
      'contribution_event:' || ce.id,
      jsonb_build_object(
        'id', 'contribution_event:' || ce.id,
        'family', 'event_association',
        'direction', 'undirected',
        'node', jsonb_build_object('type', 'contribution', 'id', c2.id, 'label', c2.title, 'secondary_label', null, 'href', '/contributions/' || c2.id, 'verification_status', c2.verification_status),
        'kind', null,
        'perspective', null,
        'temporal', null,
        'provenance', jsonb_build_object('source_type', v_ev.source_type, 'verification_status', v_ev.verification_status),
        'source', jsonb_build_object('type', 'contribution_events', 'id', ce.id),
        'visibility', 'visible'
      )
    from public.contribution_events ce
    join public.contributions c2 on c2.id = ce.contribution_id
    where ce.event_id = v_ev.id
  ) c;

  return jsonb_build_object(
    'focal', jsonb_build_object('type', 'event', 'id', v_ev.id, 'label', v_ev.title, 'secondary_label', null, 'href', null, 'verification_status', v_ev.verification_status),
    'connections', v_connections
  );
end;
$$;

comment on function public.get_event_network(uuid) is
  'One-hop Knowledge Network read model centred on an event: the people, '
  'institutions, and contributions associated with it, projected into the common '
  'network shape, each preserving its canonical source row. No inference, no '
  'metrics. Merged people omitted; null for a nonexistent event. Reserved for a '
  'future event reading surface. SECURITY DEFINER -- ADR-0017. Never grant to '
  'anon/PUBLIC.';

revoke all on function public.get_event_network(uuid) from public;
grant execute on function public.get_event_network(uuid) to authenticated;
