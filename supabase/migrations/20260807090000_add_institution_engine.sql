-- Milestone M6.5: Institution Engine -- institutions as historical actors in the
-- production of conservation knowledge.
--
-- The fifth constitutional engine (after Timeline M6.2, Participation M6.3,
-- Relationship M6.4). An Institution is a historical ACTOR -- it comes into
-- being, changes through time, organizes people and resources, produces
-- knowledge, preserves memory, and shapes conservation. It is not an employer,
-- an address, a logo, a container of people, or a Node tenant. See
-- docs/decisions/0015-institution-engine.md and
-- docs/m6.5-institution-engine.md.
--
-- ADDITIVE extension of the minimal `organizations` entity created in M6.3 as
-- the target of Participation. M6.3 Participation records are NOT invalidated:
-- new columns take defaults, so every existing organizations row and every
-- Participation pointing at it remains valid and naturally becomes part of the
-- Institution page. The Institution Engine does NOT create a parallel identity
-- table.
--
-- The two clocks (Design Bible): people enter/contribute/depart/die;
-- institutions endure/transform/merge/divide/move/decline/revive/preserve
-- memory. Transformation is modelled by the smallest durable COMBINATION of:
-- institutional Events (M6.2, projected -- never copied), historical names
-- (aliases with their own period + provenance), temporal assertions (founding /
-- closure), a status vocabulary, and predecessor/successor semantics (reserved
-- via Events + a documented future relationship generalization) -- NOT a single
-- mutable status field. A current institution never erases a predecessor.
--
-- Adds:
--   1. public.organization_types -- data-backed institution-type vocabulary.
--   2. ALTER public.organizations -- institutional identity (type, status,
--      founding/closure temporal, location, website) + its own provenance.
--   3. public.organization_names -- historically valid / former / alternative /
--      acronym / Indigenous / local / translated names, each carrying form,
--      language, type, the period it was used, provenance, verification.
--   4. public.organization_external_identifiers -- ROR/Wikidata/ISNI/... support
--      (optional; an external id disambiguates, it never defines the history).
--   5. public.organization_narrative -- curated institutional narrative in
--      distinct facets (introduction / overview / significance / legacy).
--   6. public.organization_events -- projects a canonical Event onto an
--      institution timeline WITHOUT duplication (mirrors person_events).
--   7. public.get_organization / get_organization_timeline /
--      get_organization_participation -- bounded SECURITY DEFINER reads.
--
-- Deferred (reserved, not built): the universal Entity Engine; canonical
-- institution<->institution Relationships (M6.4 is person<->person; see
-- ADR-0015 for the additive path); the Contribution Engine; Historical Records
-- ingestion / a file repository; collections management; place beyond a single
-- free-text location; external-registry reconciliation / duplicate merging;
-- Node administration / federation / tenancy.

-- ---------------------------------------------------------------------
-- organization_types -- generic institution-type vocabulary (data, not code)
-- ---------------------------------------------------------------------

create table public.organization_types (
  key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint organization_types_key_not_blank check (btrim(key) <> ''),
  constraint organization_types_label_not_blank check (btrim(label) <> '')
);

comment on table public.organization_types is
  'Generic, discipline-independent controlled vocabulary of institution types '
  '(docs/controlled-vocabularies.md). Node-neutral: not all institutions '
  'resemble universities or NGOs. A Node adds its own types as DATA, never as '
  'code. Deny-by-default; surfaced only through get_organization.';

alter table public.organization_types enable row level security;
grant select, insert, update, delete on public.organization_types to service_role;

insert into public.organization_types (key, label, description, sort_order) values
  ('research_programme',            'Research programme',            'A sustained research programme.',                         10),
  ('field_station',                 'Field station',                 'A field research station.',                               20),
  ('university',                    'University',                    'A university.',                                          30),
  ('museum',                        'Museum',                        'A museum.',                                              40),
  ('research_institute',            'Research institute',            'A research institute.',                                  50),
  ('government_agency',             'Government agency',             'A government agency.',                                   60),
  ('archive',                       'Archive',                       'An archive.',                                            70),
  ('library',                       'Library',                       'A library.',                                             80),
  ('laboratory',                    'Laboratory',                    'A laboratory.',                                          90),
  ('botanical_garden',              'Botanical garden',              'A botanical garden.',                                   100),
  ('zoological_institution',        'Zoological institution',        'A zoological institution.',                             110),
  ('conservation_ngo',             'Conservation NGO',              'A conservation non-governmental organization.',         120),
  ('community_organization',        'Community organization',        'A community organization.',                             130),
  ('indigenous_organization',       'Indigenous organization',       'An Indigenous organization.',                           140),
  ('scientific_society',            'Scientific society',            'A scientific society.',                                 150),
  ('funding_organization',          'Funding organization',          'A funding organization.',                               160),
  ('collection_holding_institution','Collection-holding institution','An institution holding scientific or cultural collections.', 170),
  ('consortium',                    'Consortium',                    'A consortium of institutions.',                         180),
  ('other',                         'Institution',                   'A curated institution not covered by another type.',    900);

-- ---------------------------------------------------------------------
-- organizations -- ADDITIVE extension into an institutional identity
-- ---------------------------------------------------------------------
-- New columns default so every existing row / Participation stays valid. The
-- canonical CURRENT name remains organizations.name; historical/other names
-- live in organization_names. status (operational/historical state) is distinct
-- from verification_status (provenance) and from temporal precision.

alter table public.organizations
  add column organization_type text references public.organization_types (key),
  add column status text not null default 'active',
  add column founding_date date,
  add column founding_precision text,
  add column founding_is_approximate boolean not null default false,
  add column closure_date date,
  add column closure_precision text,
  add column location text,
  add column website text,
  add column source_type text not null default 'imported_historical',
  add column verification_status text not null default 'provisional';

alter table public.organizations
  -- Historical state -- a merged/closed/historical institution stays READABLE
  -- (unlike a merged PERSON, which is hidden). Distinct from verification.
  add constraint organizations_status_valid check (
    status in ('active', 'historical', 'closed', 'dormant', 'merged',
               'absorbed', 'succeeded', 'provisional', 'status_unknown')
  ),
  add constraint organizations_founding_precision_valid check (
    founding_precision is null or founding_precision in ('day', 'month', 'year', 'decade')
  ),
  add constraint organizations_closure_precision_valid check (
    closure_precision is null or closure_precision in ('day', 'month', 'year', 'decade')
  ),
  add constraint organizations_founding_precision_matches_date check (
    (founding_date is null) = (founding_precision is null)
  ),
  add constraint organizations_closure_precision_matches_date check (
    (closure_date is null) = (closure_precision is null)
  ),
  -- circa only qualifies a known founding date.
  add constraint organizations_founding_approx_requires_date check (
    not founding_is_approximate or founding_date is not null
  ),
  -- If both are known, closure cannot precede founding. (Founding may be unknown
  -- while closure is known, and vice versa -- history is partial.)
  add constraint organizations_closure_after_founding check (
    closure_date is null or founding_date is null or closure_date >= founding_date
  ),
  add constraint organizations_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  add constraint organizations_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  );

comment on table public.organizations is
  'A historical ACTOR (Institution Engine, M6.5) -- extended additively from the '
  'M6.3 minimal belonging-target. Holds the canonical CURRENT identity (name, '
  'short_name, type, status, founding/closure, location, website) with its own '
  'provenance; historical/other names live in organization_names, external ids '
  'in organization_external_identifiers, curated history in organization_narrative, '
  'and its timeline projects canonical Events via organization_events. A '
  'merged/closed/historical institution remains readable. Deny-by-default; read '
  'only via get_organization / get_organization_timeline / '
  'get_organization_participation.';
comment on column public.organizations.status is
  'Operational/historical state (active|historical|closed|dormant|merged|'
  'absorbed|succeeded|provisional|status_unknown). NOT verification (provenance) '
  'and NOT temporal precision. Transformation is carried by Events + names + '
  'future relationships, not by this field alone.';
comment on column public.organizations.location is
  'A single free-text location at the granularity the steward chooses. NOT '
  'precise coordinates; sensitive/Indigenous locations are not exposed by '
  'default and are not reduced to this field (governance deferred, ADR-0015).';

create index organizations_organization_type_idx on public.organizations (organization_type);
create index organizations_status_idx on public.organizations (status);

-- ---------------------------------------------------------------------
-- organization_names -- historically valid / other names (not search synonyms)
-- ---------------------------------------------------------------------

create table public.organization_names (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  name text not null,
  name_type text not null,   -- former | alternative | acronym | indigenous | local | translation
  language text,             -- BCP-47-ish tag or language name, when known

  -- The period during which the name was used (shared temporal precision).
  start_date date,
  start_precision text,
  end_date date,
  end_precision text,

  source_type text not null,
  verification_status text not null default 'provisional',
  created_at timestamptz not null default now(),

  constraint organization_names_name_not_blank check (btrim(name) <> ''),
  constraint organization_names_type_valid check (
    name_type in ('former', 'alternative', 'acronym', 'indigenous', 'local', 'translation')
  ),
  constraint organization_names_start_precision_valid check (
    start_precision is null or start_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint organization_names_end_precision_valid check (
    end_precision is null or end_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint organization_names_start_precision_matches_date check (
    (start_date is null) = (start_precision is null)
  ),
  constraint organization_names_end_precision_matches_date check (
    (end_date is null) = (end_precision is null)
  ),
  constraint organization_names_end_after_start check (
    end_date is null or start_date is null or end_date >= start_date
  ),
  constraint organization_names_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint organization_names_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  )
);

comment on table public.organization_names is
  'Historically valid, former, alternative, acronym, Indigenous, local, or '
  'translated names for an institution -- each a first-class assertion with its '
  'own period, provenance, and verification, NOT a disposable search synonym. '
  'The canonical CURRENT name is organizations.name; this table holds the '
  'others. An institution did not always have its current name. Deny-by-default; '
  'read via get_organization.';

create index organization_names_organization_id_idx on public.organization_names (organization_id);

alter table public.organization_names enable row level security;
grant select, insert, update, delete on public.organization_names to service_role;

-- ---------------------------------------------------------------------
-- organization_external_identifiers -- interoperability, never authority
-- ---------------------------------------------------------------------

create table public.organization_external_identifiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  scheme text not null,          -- ror | wikidata | isni | viaf | grid | national_registry | archival_authority | other
  identifier_value text not null,
  url text,

  source_type text not null,
  verification_status text not null default 'provisional',
  created_at timestamptz not null default now(),

  constraint organization_external_identifiers_value_not_blank check (btrim(identifier_value) <> ''),
  constraint organization_external_identifiers_scheme_valid check (
    scheme in ('ror', 'wikidata', 'isni', 'viaf', 'grid', 'national_registry', 'archival_authority', 'other')
  ),
  constraint organization_external_identifiers_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint organization_external_identifiers_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  -- One external identifier value in a scheme maps to at most one institution.
  -- This does NOT auto-merge records; duplicate resolution stays a governed
  -- process (ADR-0015). Distinct schemes/values may coexist on one institution.
  constraint organization_external_identifiers_unique unique (scheme, identifier_value)
);

comment on table public.organization_external_identifiers is
  'Optional external identifiers (ROR, Wikidata, ISNI, VIAF, GRID legacy, '
  'national/archival registries, ...) for disambiguation and interoperability. '
  'An external id NEVER defines the institution''s narrative, boundaries, '
  'sovereignty, or evidence, and never silently merges records. Deny-by-default; '
  'read via get_organization.';

create index organization_external_identifiers_organization_id_idx on public.organization_external_identifiers (organization_id);

alter table public.organization_external_identifiers enable row level security;
grant select, insert, update, delete on public.organization_external_identifiers to service_role;

-- ---------------------------------------------------------------------
-- organization_narrative -- curated institutional history (facets)
-- ---------------------------------------------------------------------

create table public.organization_narrative (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,

  kind text not null,   -- introduction | overview | significance | legacy
  body text not null,

  source_type text not null,
  verification_status text not null default 'provisional',
  authored_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_narrative_body_not_blank check (btrim(body) <> ''),
  constraint organization_narrative_kind_valid check (
    kind in ('introduction', 'overview', 'significance', 'legacy')
  ),
  constraint organization_narrative_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint organization_narrative_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  -- One current narrative per facet per institution.
  constraint organization_narrative_one_per_facet unique (organization_id, kind)
);

comment on table public.organization_narrative is
  'Curated, human-authored institutional history in distinct facets '
  '(introduction | overview | significance | legacy), each a first-class '
  'assertion with its own provenance -- never auto-generated, never AI, never a '
  'mission statement presented as history. A missing facet is an honest absence. '
  'Deny-by-default; read via get_organization.';

create trigger organization_narrative_set_updated_at
  before update on public.organization_narrative
  for each row
  execute function public.set_updated_at();

create index organization_narrative_organization_id_idx on public.organization_narrative (organization_id);

alter table public.organization_narrative enable row level security;
grant select, insert, update, delete on public.organization_narrative to service_role;

-- ---------------------------------------------------------------------
-- organization_events -- projects a canonical Event onto an institution timeline
-- ---------------------------------------------------------------------
-- The SAME canonical public.events row can appear on a person timeline
-- (person_events, M6.2) AND an institution timeline (this) with NO duplication
-- -- Many-Clocks. Mirrors person_events exactly.

create table public.organization_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint organization_events_unique unique (organization_id, event_id)
);

comment on table public.organization_events is
  'Projects a canonical Event onto an institution''s timeline. The same Event '
  'may also appear on person (and future project) timelines without '
  'duplication (Many-Clocks). Deny-by-default; read via '
  'get_organization_timeline.';

create index organization_events_organization_id_idx on public.organization_events (organization_id);
create index organization_events_event_id_idx on public.organization_events (event_id);

alter table public.organization_events enable row level security;
grant select, insert, update, delete on public.organization_events to service_role;

-- ---------------------------------------------------------------------
-- get_organization -- canonical institution identity + names + ids + narrative
-- ---------------------------------------------------------------------
-- Bounded read of the institution's OWN record (identity, type, status,
-- founding/closure, location, website, provenance) plus its owned sub-records
-- (historical names, external identifiers, narrative facets). Timeline and
-- Participation are SEPARATE projections (composed at the page), so each read
-- evolves independently and stays a bounded, testable payload. SECURITY
-- DEFINER, search_path pinned, auth.uid() required, EXECUTE to authenticated
-- only. Historical/closed/merged institutions ARE returned (only a nonexistent
-- id returns null) -- historical institutions are never hidden.

create function public.get_organization(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  v_type jsonb;
  v_names jsonb;
  v_identifiers jsonb;
  v_narrative jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_organization: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;
  if not found then
    return null;
  end if;

  select case when ot.key is null then null
              else jsonb_build_object('key', ot.key, 'label', ot.label) end
    into v_type
    from public.organization_types ot
    where ot.key = v_org.organization_type;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', n.id,
             'name', n.name,
             'name_type', n.name_type,
             'language', n.language,
             'temporal', jsonb_build_object(
               'start_date', n.start_date, 'start_precision', n.start_precision,
               'end_date', n.end_date, 'end_precision', n.end_precision
             ),
             'provenance', jsonb_build_object('source_type', n.source_type, 'verification_status', n.verification_status)
           )
           order by n.start_date asc nulls last, n.name asc
         ), '[]'::jsonb)
    into v_names
    from public.organization_names n
    where n.organization_id = v_org.id;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', x.id,
             'scheme', x.scheme,
             'identifier_value', x.identifier_value,
             'url', x.url,
             'provenance', jsonb_build_object('source_type', x.source_type, 'verification_status', x.verification_status)
           )
           order by x.scheme asc
         ), '[]'::jsonb)
    into v_identifiers
    from public.organization_external_identifiers x
    where x.organization_id = v_org.id;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'kind', na.kind,
             'body', na.body,
             'provenance', jsonb_build_object('source_type', na.source_type, 'verification_status', na.verification_status)
           )
         ), '[]'::jsonb)
    into v_narrative
    from public.organization_narrative na
    where na.organization_id = v_org.id;

  return jsonb_build_object(
    'id', v_org.id,
    'name', v_org.name,
    'short_name', v_org.short_name,
    'type', v_type,
    'status', v_org.status,
    'founding', case when v_org.founding_date is null then null else jsonb_build_object(
      'date', v_org.founding_date, 'precision', v_org.founding_precision, 'is_approximate', v_org.founding_is_approximate
    ) end,
    'closure', case when v_org.closure_date is null then null else jsonb_build_object(
      'date', v_org.closure_date, 'precision', v_org.closure_precision
    ) end,
    'location', v_org.location,
    'website', v_org.website,
    'provenance', jsonb_build_object('source_type', v_org.source_type, 'verification_status', v_org.verification_status),
    'names', v_names,
    'external_identifiers', v_identifiers,
    'narrative', v_narrative
  );
end;
$$;

comment on function public.get_organization(uuid) is
  'Canonical institution identity read model: the institution''s own record + '
  'historical names + external identifiers + narrative facets, for an '
  'authenticated reader. Historical/closed/merged institutions are returned; '
  'null only for a nonexistent id. SECURITY DEFINER -- see '
  'docs/decisions/0015-institution-engine.md. Never grant EXECUTE to anon/PUBLIC.';

revoke all on function public.get_organization(uuid) from public;
grant execute on function public.get_organization(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_organization_timeline -- institution clock (projects canonical Events)
-- ---------------------------------------------------------------------
-- Same event shape as get_person_timeline (the TypeScript reuses the M6.2
-- timeline parser + components). Projects via organization_events; events are
-- NOT copied.

create function public.get_organization_timeline(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_events jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_organization_timeline: authentication required';
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
        'id', ev.id,
        'kind', jsonb_build_object('key', ek.key, 'label', ek.label),
        'title', ev.title,
        'summary', ev.summary,
        'place', ev.place,
        'temporal', jsonb_build_object(
          'start_date', ev.start_date, 'start_precision', ev.start_precision,
          'end_date', ev.end_date, 'end_precision', ev.end_precision,
          'is_approximate', ev.is_approximate, 'is_ongoing', ev.is_ongoing,
          'date_is_unknown', ev.date_is_unknown, 'date_is_uncertain', ev.date_is_uncertain
        ),
        'provenance', jsonb_build_object('source_type', ev.source_type, 'verification_status', ev.verification_status)
      )
      order by ev.start_date asc nulls last, ev.created_at asc
    ),
    '[]'::jsonb
  )
  into v_events
  from public.organization_events oe
  join public.events ev on ev.id = oe.event_id
  join public.event_kinds ek on ek.key = ev.event_kind
  where oe.organization_id = v_org_id;

  return jsonb_build_object('organization_id', v_org_id, 'events', v_events);
end;
$$;

comment on function public.get_organization_timeline(uuid) is
  'Canonical institution-timeline read model: projects canonical Events onto an '
  'institution (undated last), same shape as get_person_timeline. Null for a '
  'nonexistent institution. SECURITY DEFINER. Never grant EXECUTE to anon/PUBLIC.';

revoke all on function public.get_organization_timeline(uuid) from public;
grant execute on function public.get_organization_timeline(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_organization_participation -- the institution's human history
-- ---------------------------------------------------------------------
-- Projects the SAME canonical Participation records (M6.3) from the
-- institution's perspective: the person is the counterpart, grouped (in the
-- client) by capacity, ordered historically -- never by prestige (equal
-- dignity). No duplication: one Participation appears on the person's biography
-- AND here. Merged people are omitted.

create function public.get_organization_participation(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_participations jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_organization_participation: authentication required';
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
        'id', pa.id,
        'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
        'person', jsonb_build_object('id', pe.id, 'display_name', pe.display_name),
        'summary', pa.summary,
        'temporal', jsonb_build_object(
          'start_date', pa.start_date, 'start_precision', pa.start_precision,
          'end_date', pa.end_date, 'end_precision', pa.end_precision,
          'is_approximate', pa.is_approximate, 'is_ongoing', pa.is_ongoing,
          'date_is_unknown', pa.date_is_unknown, 'date_is_uncertain', pa.date_is_uncertain
        ),
        'provenance', jsonb_build_object('source_type', pa.source_type, 'verification_status', pa.verification_status)
      )
      order by pa.start_date asc nulls last, pa.created_at asc
    ),
    '[]'::jsonb
  )
  into v_participations
  from public.participations pa
  join public.participation_capacities cap on cap.key = pa.capacity
  join public.people pe on pe.id = pa.person_id
  where pa.organization_id = v_org_id
    and pe.verification_status <> 'merged';

  return jsonb_build_object('organization_id', v_org_id, 'participations', v_participations);
end;
$$;

comment on function public.get_organization_participation(uuid) is
  'Canonical institution-participation read model: projects the SAME M6.3 '
  'Participation records from the institution''s perspective (the person is the '
  'counterpart), undated last, merged people omitted. No duplication. Null for a '
  'nonexistent institution. SECURITY DEFINER. Never grant EXECUTE to anon/PUBLIC.';

revoke all on function public.get_organization_participation(uuid) from public;
grant execute on function public.get_organization_participation(uuid) to authenticated;
