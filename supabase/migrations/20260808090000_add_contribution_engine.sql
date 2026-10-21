-- Milestone M6.6: Contribution Engine -- what people, institutions, communities,
-- and knowledge traditions made possible, and how we know.
--
-- The sixth constitutional engine (after Timeline M6.2, Participation M6.3,
-- Relationship M6.4, Institution M6.5). A Contribution is a historically
-- situated, provenance-bearing account of something an actor helped bring into
-- being, sustain, transform, preserve, understand, transmit, or make possible.
-- See docs/decisions/0016-contribution-engine.md and
-- docs/m6.6-contribution-engine.md.
--
-- Semantic boundary (ADR-0016) -- a Contribution is NOT, and is never inferred
-- from, any of these:
--   * Participation (M6.3): bounded belonging. A person belonging to an
--     institution is NOT a contribution; a contribution is never inferred from
--     affiliation, employment, or a participation row.
--   * Relationship (M6.4): a bond BETWEEN entities. A collaboration may enable
--     a contribution, but the bond is not the contribution. (Mentorship stays an
--     M6.4 Relationship -- it is deliberately NOT a contribution kind.)
--   * Event (M6.2): something that happened. A contribution may emerge through
--     many events or be marked by one, but it is not reducible to an event, and
--     its temporal scope is NOT an event date (projected via contribution_events,
--     never copied).
--   * Output: an artifact/result. A contribution may produce, preserve, or
--     interpret an output, or exist without one. Outputs/records/datasets are a
--     later engine (CC2) -- reserved, not built here.
--   * Narrative: interpretation, kept in a distinct table with its own
--     provenance; it does not itself prove a contribution occurred.
--   * Evidence: supports an attribution; the provenance of the contribution
--     record does NOT automatically prove any contributor attribution -- each
--     attribution is its OWN assertion.
--
-- Adds:
--   1. public.contribution_kinds -- data-backed vocabulary of the KIND of
--      historical object contributed (empirical observation, field knowledge,
--      long-term monitoring, archival preservation, training, ...). Node-neutral.
--   2. public.contribution_capacities -- data-backed vocabulary of the CAPACITY
--      in which a contributor helped (field observation, coordination, funding,
--      institutional support, ...). Kind and capacity are DIFFERENT axes.
--   3. public.contributions -- the canonical Contribution record: title, kind,
--      description, the SHARED Many-Clocks temporal scope, a safe-granularity
--      place, and its OWN provenance. No ranking, score, reach, or count.
--   4. public.person_contributions -- explicit person->contribution attribution,
--      each a provenance-bearing assertion carrying a capacity. NOT polymorphic.
--   5. public.organization_contributions -- explicit organization->contribution
--      attribution (a funder/host is an attributed institutional contributor
--      with a funding/institutional_support capacity, never auto-inferred).
--   6. public.contribution_narrative -- curated interpretation in facets
--      (overview | context | significance | legacy), separate from the assertion.
--   7. public.contribution_events -- projects canonical Events onto a
--      contribution WITHOUT duplication (Many-Clocks; mirrors person_events /
--      organization_events).
--   8. get_contribution / get_contribution_timeline / get_person_contributions /
--      get_organization_contributions -- bounded SECURITY DEFINER reads.
--
-- Collective / Indigenous contributions: a contribution requires NO individual
-- contributor. Both attribution tables may be empty, so a collective whose
-- authors cannot or should not be isolated is representable WITHOUT fabricating
-- a false person -- attributed instead to a community or Indigenous
-- organization (M6.5 types), or carried in narrative with an honest limitation.
-- The platform records a historical role; it never claims ownership of
-- knowledge, never claims community authorization it was not granted, and never
-- exposes culturally restricted knowledge. Governance of community
-- authorization is an explicit deferred extension point (ADR-0016), not
-- resolved in code here.
--
-- Deferred (reserved, not built): the universal Entity Engine; generalized
-- polymorphic attribution; a distinct contributor/host/funder/custodian
-- typology beyond capacity; a Contribution<->Event RELATION vocabulary (events
-- are projected plainly for now); Outputs / Historical Records ingestion / a
-- dataset or publication repository / citation graph; effectiveness or impact
-- scoring; contribution percentages; rankings; AI-generated attribution or
-- narrative; automated contributor extraction; duplicate resolution; public
-- editing; Node administration / federation / tenancy.

-- ---------------------------------------------------------------------
-- contribution_kinds -- the KIND of historical object contributed (data)
-- ---------------------------------------------------------------------
-- A kind names WHAT was contributed as a historical object -- a genuinely
-- different sort of thing an actor helped bring into being, sustain, preserve,
-- understand, transmit, or make possible. It is DISTINCT from a contributor's
-- capacity (contribution_capacities). Publication-centered role taxonomies
-- (CRediT, authorship roles) are deliberately NOT reproduced: "author" is not a
-- kind, and a publication is only ONE kind among many that conventional records
-- overprivilege.

create table public.contribution_kinds (
  key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint contribution_kinds_key_not_blank check (btrim(key) <> ''),
  constraint contribution_kinds_label_not_blank check (btrim(label) <> '')
);

comment on table public.contribution_kinds is
  'Generic, discipline-independent controlled vocabulary of contribution KINDS '
  '(docs/controlled-vocabularies.md) -- what historical object was contributed. '
  'DISTINCT from contributor capacity. Node-neutral: a Node adds its own kinds '
  'as DATA, never as code. Never a publication/authorship taxonomy. '
  'Deny-by-default; surfaced only through get_contribution and the projections.';

alter table public.contribution_kinds enable row level security;
grant select, insert, update, delete on public.contribution_kinds to service_role;

-- The founding vocabulary makes visible the labour and knowledge that
-- publication-centered records lose. Each row is a genuinely different
-- historical object. "Mentorship" is intentionally ABSENT (it is an M6.4
-- Relationship, a bond between two people, not an object contributed);
-- "funding" and "hosting" are intentionally ABSENT (they are contributor
-- CAPACITIES, not objects). A Node extends this as data.
insert into public.contribution_kinds (key, label, description, sort_order) values
  ('empirical_observation',        'Empirical observation',            'Sustained or decisive empirical observation of the natural world.',            10),
  ('field_knowledge',              'Field knowledge',                  'Practical knowledge of a place, terrain, route, season, or field craft.',      20),
  ('taxonomic_knowledge',          'Taxonomic knowledge',              'Recognition, description, or discrimination of species or taxa.',              30),
  ('ecological_interpretation',    'Ecological interpretation',        'Interpretation of ecological pattern, process, or relationship.',              40),
  ('conceptual_contribution',      'Conceptual contribution',          'A conceptual or theoretical contribution to understanding.',                   50),
  ('research_question',            'Research question',                'The framing of a research question or line of inquiry.',                       60),
  ('method_or_protocol',           'Method or protocol',               'A method, protocol, or way of working that others could follow.',              70),
  ('technical_adaptation',         'Technical adaptation',             'Adaptation of technique, instrument, or apparatus to a purpose.',              80),
  ('long_term_monitoring',         'Long-term monitoring',             'Establishment or sustaining of long-term observation or monitoring.',          90),
  ('data_stewardship',             'Data stewardship',                 'Care, curation, and continuity of data over time.',                          100),
  ('collection_stewardship',       'Collection stewardship',           'Care and continuity of specimens or collections.',                            110),
  ('field_infrastructure',         'Field infrastructure',             'Construction or maintenance of field infrastructure that made work possible.', 120),
  ('institutional_infrastructure', 'Institutional infrastructure',     'Building or sustaining the institutional capacity that made work possible.',   130),
  ('archival_preservation',        'Archival preservation',            'Preservation of records, archives, or documentary memory.',                   140),
  ('oral_history_preservation',    'Oral-history preservation',        'Preservation or transmission of oral history and memory.',                    150),
  ('training',                     'Training',                         'The building of capability in others across a body of work.',                 160),
  ('translation',                  'Translation and linguistic mediation','Translation or linguistic mediation that made knowledge crossable.',        170),
  ('logistical_knowledge',         'Logistical knowledge',             'Logistical knowledge that made sustained work possible.',                     180),
  ('community_governance',         'Community governance',             'Community governance that sustained shared work or stewardship.',              190),
  ('local_indigenous_knowledge',   'Local or Indigenous knowledge',    'A local or Indigenous knowledge contribution, recorded with its own governance.',200),
  ('conservation_practice',        'Conservation practice',            'A conservation practice developed, adapted, or sustained.',                    210),
  ('management_model',             'Management model',                 'A model for managing land, resources, or a protected area.',                   220),
  ('policy_influence',             'Policy influence',                 'Influence on policy or governance, distinct from its later consequences.',     230),
  ('scientific_communication',     'Scientific communication',         'Communication that carried knowledge to others.',                             240),
  ('software_or_tooling',          'Software or analytical tooling',   'Software or analytical tooling that others could use.',                       250),
  ('publication_or_report',        'Publication or report',            'A publication or report (an output among many kinds, never the only one).',   260),
  ('referenced_dataset',           'Referenced dataset or data resource','A referenced dataset or data resource (referenced, not ingested; CC2).',     270),
  ('other',                        'Contribution',                     'A curated contribution not covered by another kind.',                         900);

-- ---------------------------------------------------------------------
-- contribution_capacities -- the CAPACITY in which a contributor helped (data)
-- ---------------------------------------------------------------------
-- A capacity names HOW a particular contributor helped with a contribution --
-- a different axis from the contribution's kind. One contribution
-- ("Establishment of a long-term forest-monitoring programme") may draw
-- contributors of many capacities (conceptual development, field observation,
-- site knowledge, protocol development, technical construction, data
-- stewardship, institutional support, funding, coordination, training,
-- community governance, archival preservation). Equal dignity is binding: no
-- capacity outranks another, none carries a prestige weight, and credit is
-- never divided into shares or percentages. CRediT is NOT reproduced.

create table public.contribution_capacities (
  key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint contribution_capacities_key_not_blank check (btrim(key) <> ''),
  constraint contribution_capacities_label_not_blank check (btrim(label) <> '')
);

comment on table public.contribution_capacities is
  'Generic, discipline-independent controlled vocabulary of contributor '
  'CAPACITIES (docs/controlled-vocabularies.md) -- how a contributor helped, a '
  'different axis from contribution KIND. Node-neutral; equal dignity (no '
  'prestige ordering, no shares). Funding and institutional hosting are '
  'capacities here, never objects and never intellectual ownership. '
  'Deny-by-default; surfaced only through the contribution reads.';

alter table public.contribution_capacities enable row level security;
grant select, insert, update, delete on public.contribution_capacities to service_role;

insert into public.contribution_capacities (key, label, description, sort_order) values
  ('conceptual_development', 'Conceptual development', 'Developed the concept, framing, or theoretical basis.',        10),
  ('field_observation',      'Field observation',      'Contributed sustained or decisive field observation.',         20),
  ('site_knowledge',         'Site knowledge',         'Contributed knowledge of the place, terrain, or conditions.',   30),
  ('protocol_development',   'Protocol development',   'Developed the method or protocol.',                            40),
  ('technical_construction', 'Technical construction', 'Built or adapted the technical means.',                        50),
  ('data_stewardship',       'Data stewardship',       'Stewarded the data over time.',                                60),
  ('analysis',               'Analysis',               'Contributed analysis or interpretation.',                      70),
  ('documentation',          'Documentation',          'Documented or wrote up the work.',                             80),
  ('coordination',           'Coordination',           'Coordinated people, activity, or continuity.',                 90),
  ('training',               'Training',               'Trained or built capability in others.',                      100),
  ('community_governance',   'Community governance',   'Contributed community governance or collective stewardship.', 110),
  ('custodianship',          'Custodianship',          'Held custody of specimens, collections, or records.',         120),
  ('archival_preservation',  'Archival preservation',  'Preserved records or documentary memory.',                    130),
  ('translation',            'Translation',            'Translated or mediated across languages.',                    140),
  ('logistical_support',     'Logistical support',     'Provided logistical knowledge or support.',                   150),
  ('institutional_support',  'Institutional support',  'Provided institutional hosting or support (not ownership).',   160),
  ('funding',                'Funding',                'Funded the work (funding is not intellectual ownership).',    170),
  ('other',                  'Contributor',            'A contributor in a capacity not covered by another value.',   900);

-- ---------------------------------------------------------------------
-- contributions -- the canonical Contribution record
-- ---------------------------------------------------------------------
-- ONE canonical record per contribution, projected onto person, institution,
-- and its own page WITHOUT contradictory copies. Carries its OWN temporal scope
-- (when the contribution occurred or developed -- never automatically a
-- publication date, an event date, a participation period, or a founding date)
-- and its OWN provenance. Contribution status is NOT a concept here: there is no
-- "successful"/"effective" state -- only verification (how confirmed the record
-- is) and honest temporal states. No ranking, score, reach, impact factor,
-- citation count, or popularity is stored, ever.

create table public.contributions (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  contribution_kind text not null references public.contribution_kinds (key),
  description text,   -- concise account of WHAT was contributed; never required

  -- The SHARED Many-Clocks temporal model -- identical to events /
  -- participations / relationships (precision / approximation / uncertainty /
  -- missing + intervals + open-ended). A contribution may be ongoing (a
  -- monitoring programme still running), undated, approximate, or uncertain.
  start_date date,
  start_precision text,
  end_date date,
  end_precision text,
  is_approximate boolean not null default false,
  is_ongoing boolean not null default false,
  date_is_unknown boolean not null default false,
  date_is_uncertain boolean not null default false,

  place text,   -- a single free-text place at a chosen, safe granularity; NOT
                -- coordinates; sensitive/Indigenous locations are not exposed.

  source_type text not null,
  verification_status text not null default 'provisional',
  created_by_user_id uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contributions_title_not_blank check (btrim(title) <> ''),
  constraint contributions_start_precision_valid check (
    start_precision is null or start_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint contributions_end_precision_valid check (
    end_precision is null or end_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint contributions_start_precision_matches_date check (
    (start_date is null) = (start_precision is null)
  ),
  constraint contributions_end_precision_matches_date check (
    (end_date is null) = (end_precision is null)
  ),
  -- A contribution either has a start date or is explicitly undated -- never
  -- silently dateless. "Unknown time" stays a first-class state.
  constraint contributions_unknown_iff_no_start check (
    (start_date is null) = date_is_unknown
  ),
  constraint contributions_end_requires_start check (
    end_date is null or start_date is not null
  ),
  constraint contributions_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  constraint contributions_ongoing_requires_open_start check (
    not is_ongoing or (start_date is not null and end_date is null)
  ),
  constraint contributions_unknown_excludes_qualifiers check (
    not date_is_unknown or (not is_approximate and not is_ongoing and not date_is_uncertain)
  ),
  constraint contributions_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint contributions_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  )
);

comment on table public.contributions is
  'The canonical Contribution record (M6.6): a historically situated, '
  'provenance-bearing account of something an actor helped bring into being, '
  'sustain, transform, preserve, understand, transmit, or make possible. ONE '
  'record, projected onto person / institution / its own page without '
  'contradictory copies. NOT a publication, participation, relationship, event, '
  'or output, and never inferred from them. Its temporal scope is its own (not a '
  'publication or event date). No ranking/score/impact/count is ever stored. '
  'Deny-by-default; read via get_contribution and the projections.';
comment on column public.contributions.place is
  'A single free-text place at the granularity the steward chooses. NOT precise '
  'coordinates; sensitive/Indigenous locations are not exposed by default '
  '(governance deferred, ADR-0016).';
comment on column public.contributions.verification_status is
  'How confirmed the record is (provisional|verified_self|verified_admin|'
  'disputed). This is NOT a contribution "status": there is deliberately no '
  '"successful" or "effective" state -- historical significance is never a '
  'measurable ranking.';

create index contributions_contribution_kind_idx on public.contributions (contribution_kind);
create index contributions_start_date_idx on public.contributions (start_date);
create index contributions_verification_status_idx on public.contributions (verification_status);

create trigger contributions_set_updated_at
  before update on public.contributions
  for each row
  execute function public.set_updated_at();

alter table public.contributions enable row level security;
grant select, insert, update, delete on public.contributions to service_role;

-- ---------------------------------------------------------------------
-- person_contributions -- explicit person->contribution attribution
-- ---------------------------------------------------------------------
-- Each attribution is its OWN provenance-bearing assertion: the provenance of
-- the contribution record does NOT automatically prove that a given person
-- contributed. An attribution carries a CAPACITY (how they helped) -- distinct
-- from the contribution's kind. Attribution is NEVER inferred from authorship,
-- affiliation, employment, participation, co-occurrence in an event, a shared
-- institution, publication or funding metadata, or another contributor's
-- statement. Explicit and typed, NOT a polymorphic entity edge.

create table public.person_contributions (
  id uuid primary key default gen_random_uuid(),

  contribution_id uuid not null references public.contributions (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  capacity text not null references public.contribution_capacities (key),

  -- Optional, historically precise note about what this person did. Never a
  -- share, percentage, or rank.
  attribution_note text,

  -- Stable, NON-prestige ordering: defaults to 0 (equal) so contributors read
  -- in a deterministic, historically-neutral order (creation order within a
  -- capacity), never a leaderboard. Present only because "ordering where
  -- historically meaningful" is occasionally real; it is never a ranking.
  sort_order integer not null default 0,

  source_type text not null,
  verification_status text not null default 'provisional',
  created_at timestamptz not null default now(),

  constraint person_contributions_note_not_blank check (
    attribution_note is null or btrim(attribution_note) <> ''
  ),
  constraint person_contributions_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint person_contributions_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  -- One person may be attributed to a contribution in several DIFFERENT
  -- capacities, but not the same capacity twice.
  constraint person_contributions_unique unique (contribution_id, person_id, capacity)
);

comment on table public.person_contributions is
  'Explicit person->contribution attribution (M6.6), each a provenance-bearing '
  'assertion carrying a CAPACITY. The contribution record''s provenance never '
  'proves an attribution; each is its own claim. NEVER inferred from authorship, '
  'affiliation, employment, participation, event co-occurrence, or metadata. '
  'Not polymorphic. Deny-by-default; read via get_contribution / '
  'get_person_contributions.';

create index person_contributions_contribution_id_idx on public.person_contributions (contribution_id);
create index person_contributions_person_id_idx on public.person_contributions (person_id);
create index person_contributions_capacity_idx on public.person_contributions (capacity);

alter table public.person_contributions enable row level security;
grant select, insert, update, delete on public.person_contributions to service_role;

-- ---------------------------------------------------------------------
-- organization_contributions -- explicit organization->contribution attribution
-- ---------------------------------------------------------------------
-- What an institution helped make possible, in an institutional CAPACITY. A
-- funder is an attributed institutional contributor with a 'funding' capacity;
-- a host with 'institutional_support' -- funding/hosting is NEVER intellectual
-- ownership and is never auto-inferred. An institutional contribution is NEVER
-- inferred because a person was affiliated there, a publication lists its
-- address, it hosted an event, a contributor participated in it, or it funded
-- adjacent work. A collective (community or Indigenous organization) can be a
-- contributor here WITHOUT isolating individuals.

create table public.organization_contributions (
  id uuid primary key default gen_random_uuid(),

  contribution_id uuid not null references public.contributions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  capacity text not null references public.contribution_capacities (key),

  attribution_note text,
  sort_order integer not null default 0,

  source_type text not null,
  verification_status text not null default 'provisional',
  created_at timestamptz not null default now(),

  constraint organization_contributions_note_not_blank check (
    attribution_note is null or btrim(attribution_note) <> ''
  ),
  constraint organization_contributions_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint organization_contributions_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  constraint organization_contributions_unique unique (contribution_id, organization_id, capacity)
);

comment on table public.organization_contributions is
  'Explicit organization->contribution attribution (M6.6), each a '
  'provenance-bearing assertion carrying an institutional CAPACITY. Funding and '
  'hosting are capacities, never intellectual ownership; never auto-inferred '
  'from affiliation, address, event hosting, participation, or adjacent '
  'funding. A community or Indigenous organization can be a collective '
  'contributor without isolating individuals. Not polymorphic. Deny-by-default; '
  'read via get_contribution / get_organization_contributions.';

create index organization_contributions_contribution_id_idx on public.organization_contributions (contribution_id);
create index organization_contributions_organization_id_idx on public.organization_contributions (organization_id);
create index organization_contributions_capacity_idx on public.organization_contributions (capacity);

alter table public.organization_contributions enable row level security;
grant select, insert, update, delete on public.organization_contributions to service_role;

-- ---------------------------------------------------------------------
-- contribution_narrative -- curated interpretation (facets), separate from the assertion
-- ---------------------------------------------------------------------
-- Interpretation is kept OUT of the canonical record. Facets explain what the
-- contribution was (overview), the historical problem/context and how it was
-- made possible (context), why it mattered and what changed (significance), and
-- what remains, is uncertain, or is disputed (legacy). Never auto-generated,
-- never AI, never a publication abstract passed off as history, never a
-- contributor's self-description as the only account. A missing facet is an
-- honest absence.

create table public.contribution_narrative (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,

  kind text not null,   -- overview | context | significance | legacy
  body text not null,

  source_type text not null,
  verification_status text not null default 'provisional',
  authored_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contribution_narrative_body_not_blank check (btrim(body) <> ''),
  constraint contribution_narrative_kind_valid check (
    kind in ('overview', 'context', 'significance', 'legacy')
  ),
  constraint contribution_narrative_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  ),
  constraint contribution_narrative_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  -- One current narrative per facet per contribution.
  constraint contribution_narrative_one_per_facet unique (contribution_id, kind)
);

comment on table public.contribution_narrative is
  'Curated, human-authored interpretation of a contribution in distinct facets '
  '(overview | context | significance | legacy), each a first-class assertion '
  'with its own provenance -- kept SEPARATE from the canonical record. Never '
  'auto-generated/AI, never a publication abstract or a self-description passed '
  'off as history. A missing facet is an honest absence. Deny-by-default; read '
  'via get_contribution.';

create trigger contribution_narrative_set_updated_at
  before update on public.contribution_narrative
  for each row
  execute function public.set_updated_at();

create index contribution_narrative_contribution_id_idx on public.contribution_narrative (contribution_id);

alter table public.contribution_narrative enable row level security;
grant select, insert, update, delete on public.contribution_narrative to service_role;

-- ---------------------------------------------------------------------
-- contribution_events -- projects a canonical Event onto a contribution
-- ---------------------------------------------------------------------
-- The SAME canonical public.events row can appear on a person timeline
-- (person_events, M6.2), an institution timeline (organization_events, M6.5),
-- AND a contribution (this) with NO duplication -- Many-Clocks. A contribution
-- may emerge through, be announced at, be implemented through, be recognized
-- after, or continue beyond an event; the event's own kind/title/summary
-- carries that meaning. A dedicated relation-type vocabulary (originated /
-- announced / implemented / recognized / continued) is DEFERRED as an additive
-- extension point -- it is not required for the first complete reading
-- experience, and adding it now would fork the shared M6.2 timeline read shape.
-- Association never implies causation.

create table public.contribution_events (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint contribution_events_unique unique (contribution_id, event_id)
);

comment on table public.contribution_events is
  'Projects a canonical Event onto a contribution WITHOUT duplication. The same '
  'Event may also appear on person and institution timelines (Many-Clocks). '
  'Association never implies causation; a relation-type vocabulary is a deferred '
  'additive extension point (ADR-0016). Deny-by-default; read via '
  'get_contribution_timeline.';

create index contribution_events_contribution_id_idx on public.contribution_events (contribution_id);
create index contribution_events_event_id_idx on public.contribution_events (event_id);

alter table public.contribution_events enable row level security;
grant select, insert, update, delete on public.contribution_events to service_role;

-- ---------------------------------------------------------------------
-- get_contribution -- canonical identity + kind + narrative + contributors
-- ---------------------------------------------------------------------
-- Bounded read of the contribution's OWN record (identity, kind, description,
-- temporal scope, place, provenance) plus its OWNED sub-records (narrative
-- facets, person attributions, organization attributions). Each attribution
-- carries its OWN capacity + provenance (the record's provenance never proves
-- an attribution). Merged PEOPLE are omitted from contributor attributions
-- (a merged person is hidden platform-wide); merged/historical ORGANIZATIONS
-- remain (M6.5: institutions are never hidden). Timeline is a SEPARATE
-- projection (composed at the page). SECURITY DEFINER, search_path pinned,
-- auth.uid() required, EXECUTE to authenticated only. Null only for a
-- nonexistent id.

create function public.get_contribution(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_c public.contributions%rowtype;
  v_kind jsonb;
  v_narrative jsonb;
  v_people jsonb;
  v_organizations jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_contribution: authentication required';
  end if;

  if p_contribution_id is null then
    return null;
  end if;

  select * into v_c from public.contributions c where c.id = p_contribution_id;
  if not found then
    return null;
  end if;

  select jsonb_build_object('key', ck.key, 'label', ck.label)
    into v_kind
    from public.contribution_kinds ck
    where ck.key = v_c.contribution_kind;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'kind', na.kind,
             'body', na.body,
             'provenance', jsonb_build_object('source_type', na.source_type, 'verification_status', na.verification_status)
           )
         ), '[]'::jsonb)
    into v_narrative
    from public.contribution_narrative na
    where na.contribution_id = v_c.id;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', pc.id,
             'person', jsonb_build_object('id', pe.id, 'display_name', pe.display_name),
             'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
             'attribution_note', pc.attribution_note,
             'provenance', jsonb_build_object('source_type', pc.source_type, 'verification_status', pc.verification_status)
           )
           order by pc.sort_order asc, pc.created_at asc
         ), '[]'::jsonb)
    into v_people
    from public.person_contributions pc
    join public.people pe on pe.id = pc.person_id
    join public.contribution_capacities cap on cap.key = pc.capacity
    where pc.contribution_id = v_c.id
      and pe.verification_status <> 'merged';

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', oc.id,
             'organization', jsonb_build_object('id', org.id, 'name', org.name, 'short_name', org.short_name),
             'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
             'attribution_note', oc.attribution_note,
             'provenance', jsonb_build_object('source_type', oc.source_type, 'verification_status', oc.verification_status)
           )
           order by oc.sort_order asc, oc.created_at asc
         ), '[]'::jsonb)
    into v_organizations
    from public.organization_contributions oc
    join public.organizations org on org.id = oc.organization_id
    join public.contribution_capacities cap on cap.key = oc.capacity
    where oc.contribution_id = v_c.id;

  return jsonb_build_object(
    'id', v_c.id,
    'title', v_c.title,
    'kind', v_kind,
    'description', v_c.description,
    'temporal', jsonb_build_object(
      'start_date', v_c.start_date, 'start_precision', v_c.start_precision,
      'end_date', v_c.end_date, 'end_precision', v_c.end_precision,
      'is_approximate', v_c.is_approximate, 'is_ongoing', v_c.is_ongoing,
      'date_is_unknown', v_c.date_is_unknown, 'date_is_uncertain', v_c.date_is_uncertain
    ),
    'place', v_c.place,
    'provenance', jsonb_build_object('source_type', v_c.source_type, 'verification_status', v_c.verification_status),
    'narrative', v_narrative,
    'contributors', jsonb_build_object('people', v_people, 'organizations', v_organizations)
  );
end;
$$;

comment on function public.get_contribution(uuid) is
  'Canonical contribution read model: the contribution''s own record + narrative '
  'facets + person and organization attributions (each with its own capacity + '
  'provenance), for an authenticated reader. Merged people omitted; merged/'
  'historical organizations kept. Null only for a nonexistent id. SECURITY '
  'DEFINER -- see docs/decisions/0016-contribution-engine.md. Never grant '
  'EXECUTE to anon/PUBLIC.';

revoke all on function public.get_contribution(uuid) from public;
grant execute on function public.get_contribution(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_contribution_timeline -- contribution clock (projects canonical Events)
-- ---------------------------------------------------------------------
-- Same event shape as get_person_timeline / get_organization_timeline (the
-- TypeScript reuses the M6.2 timeline parser + components). Projects via
-- contribution_events; events are NOT copied. Null for a nonexistent
-- contribution.

create function public.get_contribution_timeline(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_events jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_contribution_timeline: authentication required';
  end if;

  if p_contribution_id is null then
    return null;
  end if;

  select c.id into v_id from public.contributions c where c.id = p_contribution_id;
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
  from public.contribution_events ce
  join public.events ev on ev.id = ce.event_id
  join public.event_kinds ek on ek.key = ev.event_kind
  where ce.contribution_id = v_id;

  return jsonb_build_object('contribution_id', v_id, 'events', v_events);
end;
$$;

comment on function public.get_contribution_timeline(uuid) is
  'Canonical contribution-timeline read model: projects canonical Events onto a '
  'contribution (undated last), same shape as get_person_timeline. Null for a '
  'nonexistent contribution. SECURITY DEFINER. Never grant EXECUTE to '
  'anon/PUBLIC.';

revoke all on function public.get_contribution_timeline(uuid) from public;
grant execute on function public.get_contribution_timeline(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_person_contributions -- the person's contributions (projection)
-- ---------------------------------------------------------------------
-- Projects the SAME canonical contributions this person is attributed to, from
-- the person's perspective: the person's capacity + attribution provenance,
-- plus the contribution's identity (title, kind, temporal, provenance) so the
-- Person page can render and LINK to the dedicated page. No duplication -- one
-- canonical attribution drives both surfaces. Ordered by the contribution's
-- time (undated last). Null for a nonexistent or merged person; empty array
-- when none. Grouping (by capacity) is the client's job.

create function public.get_person_contributions(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_contributions jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_person_contributions: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;
  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attribution_id', pc.id,
        'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
        'attribution_note', pc.attribution_note,
        'attribution_provenance', jsonb_build_object('source_type', pc.source_type, 'verification_status', pc.verification_status),
        'contribution', jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'kind', jsonb_build_object('key', ck.key, 'label', ck.label),
          'temporal', jsonb_build_object(
            'start_date', c.start_date, 'start_precision', c.start_precision,
            'end_date', c.end_date, 'end_precision', c.end_precision,
            'is_approximate', c.is_approximate, 'is_ongoing', c.is_ongoing,
            'date_is_unknown', c.date_is_unknown, 'date_is_uncertain', c.date_is_uncertain
          ),
          'provenance', jsonb_build_object('source_type', c.source_type, 'verification_status', c.verification_status)
        )
      )
      order by c.start_date asc nulls last, pc.sort_order asc, pc.created_at asc
    ),
    '[]'::jsonb
  )
  into v_contributions
  from public.person_contributions pc
  join public.contributions c on c.id = pc.contribution_id
  join public.contribution_kinds ck on ck.key = c.contribution_kind
  join public.contribution_capacities cap on cap.key = pc.capacity
  where pc.person_id = v_person.id;

  return jsonb_build_object('person_id', v_person.id, 'contributions', v_contributions);
end;
$$;

comment on function public.get_person_contributions(uuid) is
  'Canonical person-contributions read model: projects the SAME contributions a '
  'person is attributed to (their capacity + attribution provenance + the '
  'contribution''s identity), undated last, empty array when none; null for a '
  'nonexistent or merged person. No duplication. SECURITY DEFINER -- see '
  'docs/decisions/0016-contribution-engine.md. Never grant EXECUTE to '
  'anon/PUBLIC.';

revoke all on function public.get_person_contributions(uuid) from public;
grant execute on function public.get_person_contributions(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_organization_contributions -- the institution's contributions (projection)
-- ---------------------------------------------------------------------
-- Projects the SAME canonical contributions this institution is attributed to,
-- from the institution's perspective (its institutional capacity + attribution
-- provenance + the contribution's identity). No duplication -- consistent with
-- the person and dedicated pages by construction. Merged/historical
-- institutions remain readable (M6.5). Ordered by the contribution's time
-- (undated last). Null for a nonexistent institution; empty array when none.

create function public.get_organization_contributions(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_contributions jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_organization_contributions: authentication required';
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
        'attribution_id', oc.id,
        'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
        'attribution_note', oc.attribution_note,
        'attribution_provenance', jsonb_build_object('source_type', oc.source_type, 'verification_status', oc.verification_status),
        'contribution', jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'kind', jsonb_build_object('key', ck.key, 'label', ck.label),
          'temporal', jsonb_build_object(
            'start_date', c.start_date, 'start_precision', c.start_precision,
            'end_date', c.end_date, 'end_precision', c.end_precision,
            'is_approximate', c.is_approximate, 'is_ongoing', c.is_ongoing,
            'date_is_unknown', c.date_is_unknown, 'date_is_uncertain', c.date_is_uncertain
          ),
          'provenance', jsonb_build_object('source_type', c.source_type, 'verification_status', c.verification_status)
        )
      )
      order by c.start_date asc nulls last, oc.sort_order asc, oc.created_at asc
    ),
    '[]'::jsonb
  )
  into v_contributions
  from public.organization_contributions oc
  join public.contributions c on c.id = oc.contribution_id
  join public.contribution_kinds ck on ck.key = c.contribution_kind
  join public.contribution_capacities cap on cap.key = oc.capacity
  where oc.organization_id = v_org_id;

  return jsonb_build_object('organization_id', v_org_id, 'contributions', v_contributions);
end;
$$;

comment on function public.get_organization_contributions(uuid) is
  'Canonical institution-contributions read model: projects the SAME '
  'contributions an institution is attributed to (its capacity + attribution '
  'provenance + the contribution''s identity), undated last, empty array when '
  'none; null for a nonexistent institution. No duplication. SECURITY DEFINER '
  '-- see docs/decisions/0016-contribution-engine.md. Never grant EXECUTE to '
  'anon/PUBLIC.';

revoke all on function public.get_organization_contributions(uuid) from public;
grant execute on function public.get_organization_contributions(uuid) to authenticated;
