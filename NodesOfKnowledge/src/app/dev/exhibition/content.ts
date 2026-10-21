// Content model for the System Exhibition dev route (see
// src/app/dev/exhibition/page.tsx and docs/m6-system-exhibition.md).
//
// The exhibition is a DETERMINISTIC DEVELOPER INSPECTION ENVIRONMENT -- not a
// product surface and not a complement to one. It never duplicates
// production functionality: general browsing of People, Institutions, and
// Contributions lives only in the application (the /explore hub and the
// /people, /institutions, /contributions directories). The M7 Knowledge
// Network is INFRASTRUCTURE the production application uses inline (documented
// connections read on the canonical pages); this environment is where that
// infrastructure is INSPECTED. This module exists only to inspect
// deterministic examples, edge cases, canonical-record reuse, reviewer
// demonstrations, architectural concepts, and fictional showcase data, and to
// hold the reset instructions.
//
// This module is intentionally pure and framework-agnostic (no React, no
// server-only imports) so it can be unit-tested directly. The deterministic
// UUIDs below MIRROR the local seed at supabase/seeds/m6_exhibition.sql --
// the exhibition never invents records; it only links to canonical seeded
// ones. Keep the two files in sync (the DB showcase test asserts these ids
// exist).

/** Engines whose deterministic examples this environment inspects. */
export const EXHIBITION_ENGINES = [
  "scientific-biography",
  "timeline",
  "participation",
  "relationships",
  "institution",
  "contribution",
  "network",
] as const;

export type ExhibitionEngine = (typeof EXHIBITION_ENGINES)[number];

/** Deterministic ids from supabase/seeds/m6_exhibition.sql. */
export const EXHIBITION_IDS = {
  people: {
    helena: "e6110000-0000-4000-8000-000000000001",
    rafael: "e6110000-0000-4000-8000-000000000002",
    anaYara: "e6110000-0000-4000-8000-000000000003",
    samuel: "e6110000-0000-4000-8000-000000000004",
    beatriz: "e6110000-0000-4000-8000-000000000005",
  },
  organizations: {
    ihfa: "e6220000-0000-4000-8000-000000000001",
    ebrv: "e6220000-0000-4000-8000-000000000002",
    aet: "e6220000-0000-4000-8000-000000000003",
  },
  contributions: {
    dataset: "e6660000-0000-4000-8000-000000000001",
    interpretation: "e6660000-0000-4000-8000-000000000002",
    oralHistory: "e6660000-0000-4000-8000-000000000003",
  },
} as const;

const personHref = (id: string) => `/people/${id}`;
const institutionHref = (id: string) => `/institutions/${id}`;
const contributionHref = (id: string) => `/contributions/${id}`;
const institutionNetworkHref = (id: string) => `/network/institutions/${id}`;

export interface ExhibitionLink {
  label: string;
  href: string;
  /** What this link is here to demonstrate. Calm, explanatory copy. */
  note?: string;
}

export interface ExhibitionSection {
  id: string;
  title: string;
  description?: string;
  links: ExhibitionLink[];
}

export interface ExhibitionJourney {
  id: string;
  title: string;
  description: string;
  steps: ExhibitionLink[];
}

export const exhibitionCopy = {
  title: "M6 — System Exhibition",
  intro:
    "A deterministic developer inspection environment for the completed engines, built from one small, fictional world. It is not part of the product and never duplicates it -- the normal reading experience lives in the application itself, so start at Explore. This environment exists only to inspect deterministic examples and edge cases, canonical-record reuse, reviewer demonstrations, and architectural concepts, and to hold the reset instructions.",
  fictionalNotice:
    "Every record linked from this page is fictional development-only material. The people, institutions, events, and claims do not describe any real person, organization, or history; they exist solely to inspect the reading surfaces of the system. Records carry a visible “— Development Exhibition” label. This route is served only when NODE_ENV=development and returns a real 404 otherwise; it is never part of a production deployment.",
  authNote:
    "The person, institution, and contribution pages are authenticated reading surfaces -- opening a link below requires being registered and signed in, exactly as in the product. Reviewer-only areas remain authorized separately: this environment never grants reviewer access or seeds an account.",
  resetIntro:
    "The fictional world is loaded by the local seed during a database reset. To (re)build it and open this environment:",
  resetCommands: ["npm run supabase:reset", "npm run dev"],
  url: "http://localhost:3000/dev/exhibition",
  designSystemHref: "/dev/design-system",
  exploreHref: "/explore",
} as const;

// Sections are organized by the concept or state being inspected -- never as
// a generic "all people / all institutions" browse (that is production's
// job). Each links a few specific records chosen because they demonstrate
// something particular.
export const exhibitionSections: ExhibitionSection[] = [
  {
    id: "showcase-records",
    title: "Deterministic showcase records",
    description:
      "The principal fictional records the demonstrations below draw on. A fixed inspection set, not a browse -- the normal directory of records lives in the application.",
    links: [
      {
        label: "Dr. Helena Arvoredo",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "The principal scientific life the demonstrations use.",
      },
      {
        label: "Instituto de História da Floresta Amazônica (IHFA)",
        href: institutionHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The active institution used across the projection examples.",
      },
      {
        label: "Long-term canopy-phenology dataset",
        href: contributionHref(EXHIBITION_IDS.contributions.dataset),
        note: "A contribution attributed jointly to a person and an institution.",
      },
    ],
  },
  {
    id: "temporal-states",
    title: "Temporal states",
    description:
      "Every temporal state the Timeline engine can represent -- exact, month, year, and decade precision; approximate and uncertain dates; a closed interval; an open-ended (ongoing) period; an unknown date -- plus overlapping events and a single canonical Event reused across surfaces.",
    links: [
      {
        label: "Dr. Helena Arvoredo — the full temporal spectrum",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "A timeline spanning exact → unknown dates, with an overlapping interval and an ongoing programme.",
      },
      {
        label: "Arquivo de Ecologia Tropical (AET) — unknown date + closure",
        href: institutionHref(EXHIBITION_IDS.organizations.aet),
        note: "An institution timeline with an unrecorded (unknown) date and a closure milestone.",
      },
      {
        label: "Oral-history preservation — reused canonical Event",
        href: contributionHref(EXHIBITION_IDS.contributions.oralHistory),
        note: "The same interview Event appears here and on the person and archive timelines -- never duplicated.",
      },
    ],
  },
  {
    id: "projections",
    title: "Projections without duplication",
    description:
      "The same canonical Participation and Contribution rows, read from both the person side and the institution side -- no record copied to appear on two surfaces. Affiliation never fabricates a contribution.",
    links: [
      {
        label: "Dr. Helena Arvoredo — person-side projection",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "Person-side participation and contribution.",
      },
      {
        label: "IHFA — institution-side projection",
        href: institutionHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The same canonical rows, seen from the institution.",
      },
      {
        label: "Long-term canopy-phenology dataset — both contributors",
        href: contributionHref(EXHIBITION_IDS.contributions.dataset),
        note: "A person and an institution credited on one contribution, in distinct capacities.",
      },
    ],
  },
  {
    id: "relationship-states",
    title: "Relationship states",
    description:
      "Directional and symmetric relationships across several kinds, with verified, provisional, and disputed states; symmetric relationships display reciprocally from both participants.",
    links: [
      {
        label: "Dr. Helena Arvoredo — directional, symmetric, and disputed",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "Mentor and predecessor (directional), a symmetric collaboration, and a disputed field partnership.",
      },
      {
        label: "Beatriz Salgado — the reciprocal side",
        href: personHref(EXHIBITION_IDS.people.beatriz),
        note: "The same symmetric collaboration seen from the other participant.",
      },
    ],
  },
  {
    id: "empty-disputed",
    title: "Empty and disputed states",
    description:
      "Absence, uncertainty, and disagreement shown honestly, not hidden.",
    links: [
      {
        label: "Ana Yara — no narrative",
        href: personHref(EXHIBITION_IDS.people.anaYara),
        note: "A biography rendered with an explicit absence, not a fabricated summary -- and a disputed field partnership.",
      },
      {
        label: "Arquivo de Ecologia Tropical (AET) — incomplete history",
        href: institutionHref(EXHIBITION_IDS.organizations.aet),
        note: "Only an introduction is recorded; later facets show an honest reserved state.",
      },
      {
        label: "Samuel Nascimento — disputed record",
        href: personHref(EXHIBITION_IDS.people.samuel),
        note: "A contested provenance state on a person record.",
      },
      {
        label: "Dr. Helena Arvoredo — unknown and uncertain dates",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "A deposit with an unknown date and an interview with an uncertain one.",
      },
    ],
  },
  {
    id: "knowledge-network",
    title: "Knowledge Network (infrastructure, inspected here)",
    description:
      "The Knowledge Network is invisible historical infrastructure (ADR-0017): production reads its documented connections INLINE on the canonical pages, never as a separate destination. Institutional lineage now reads on the Institution page itself; this section is where the infrastructure is inspected, including the consolidated one-hop institution neighbourhood. Every connection is PROJECTED from a canonical assertion and never inferred.",
    links: [
      {
        label: "IHFA — institutional lineage reads inline on the Institution page",
        href: institutionHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The M6.5 reserved 'Relationships' slot is now a live inline section: a succession (AET as predecessor) and a symmetric affiliation.",
      },
      {
        label: "IHFA — consolidated network neighbourhood (inspection)",
        href: institutionNetworkHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The one-hop neighbourhood in one place: lineage, members, contributions, and events, each with provenance and source.",
      },
      {
        label: "AET — the same succession, inverse role (inspection)",
        href: institutionNetworkHref(EXHIBITION_IDS.organizations.aet),
        note: "The one canonical succession record, read from the successor's side (IHFA as the Successor). No duplicate row.",
      },
      {
        label: "Dr. Helena Arvoredo — her connections read inline on the biography",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "Timeline, participation, relationships, and contributions ARE her documented connections; no separate person-network page.",
      },
    ],
  },
  {
    id: "reviewer-auth",
    title: "Reviewer and authentication flows",
    description:
      "The claim and review flows, reachable here for inspection. Reviewer authorization is never granted automatically.",
    links: [
      { label: "Register", href: "/register", note: "Create a development account to open the authenticated pages above." },
      { label: "Claim a person record", href: "/member/claim", note: "The member claim-discovery flow." },
      {
        label: "Reviewer claim queue",
        href: "/review/claims",
        note: "Requires reviewer authorization; this environment does not grant it.",
      },
    ],
  },
];

export const exhibitionJourneys: ExhibitionJourney[] = [
  {
    id: "a-scientific-life",
    title: "Journey 1 — A scientific life",
    description:
      "Inspect one person end to end: biography, timeline, participation, relationships, then the institution and a contribution.",
    steps: [
      { label: "Open Helena Arvoredo", href: personHref(EXHIBITION_IDS.people.helena), note: "Start at the biography." },
      {
        label: "Follow the institution she led",
        href: institutionHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The same participation and contribution, from the institution side.",
      },
      {
        label: "Open a contribution she stewarded",
        href: contributionHref(EXHIBITION_IDS.contributions.dataset),
        note: "A contribution with person and institution contributors.",
      },
    ],
  },
  {
    id: "an-institution-through-time",
    title: "Journey 2 — An institution through time",
    description:
      "Inspect an active institution: identity and name history, timeline, the people who participated, and its contribution projection.",
    steps: [
      { label: "Open IHFA", href: institutionHref(EXHIBITION_IDS.organizations.ihfa), note: "Identity, former name, acronym, external identifier." },
      {
        label: "See a participant's life",
        href: personHref(EXHIBITION_IDS.people.beatriz),
        note: "The director, whose relationship to the founder is recorded as a succession.",
      },
    ],
  },
  {
    id: "honest-incompleteness",
    title: "Journey 3 — Honest incompleteness",
    description:
      "Inspect how absence, uncertainty, and disagreement are shown rather than hidden.",
    steps: [
      { label: "A person with no narrative", href: personHref(EXHIBITION_IDS.people.anaYara), note: "Honest absence." },
      { label: "A disputed record", href: personHref(EXHIBITION_IDS.people.samuel), note: "Contested provenance." },
      {
        label: "An institution with incomplete history",
        href: institutionHref(EXHIBITION_IDS.organizations.aet),
        note: "Reserved/absent later facets.",
      },
    ],
  },
  {
    id: "connecting-the-preserved-history",
    title: "Journey 4 — Connecting the preserved history",
    description:
      "Inspect how the Knowledge Network connects already-preserved records as invisible infrastructure: documented connections read inline on the canonical pages, and an institutional lineage reads from both ends without any duplicated record.",
    steps: [
      {
        label: "Read Helena's connections inline on her biography",
        href: personHref(EXHIBITION_IDS.people.helena),
        note: "Timeline, participation, relationships, contributions -- her documented connections, in the reading flow.",
      },
      {
        label: "Read IHFA's institutional lineage inline on the Institution page",
        href: institutionHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The live inline 'Institutional relationships' section.",
      },
      {
        label: "Inspect the consolidated institution neighbourhood",
        href: institutionNetworkHref(EXHIBITION_IDS.organizations.ihfa),
        note: "The one-hop view in one place, for inspection.",
      },
      {
        label: "See the same succession from the other side",
        href: institutionNetworkHref(EXHIBITION_IDS.organizations.aet),
        note: "The inverse role, one canonical record, no duplication.",
      },
    ],
  },
];
