# M6 System Exhibition (development-only)

The M6 System Exhibition is a **deterministic developer inspection
environment**. It is **not** a product surface, it does not change the
constitutional architecture, and it does not add any engine. The primary way
to experience the platform is the production application itself — the
canonical user journey (see `docs/canonical-user-journey.md`). This
environment exists alongside that journey, only to inspect deterministic
examples and edge cases from one development-only starting point, and it must
never duplicate production functionality.

## What it is

- A single dev route, **`/dev/exhibition`**, with calm copy, links grouped by
  the concept or state being inspected and by guided journey, and honest
  empty/disputed states — not a browse, admin panel, dashboard, search, or
  metrics view. General browsing of People, Institutions, and Contributions
  lives only in the production directories.
- One coherent, **unmistakably fictional** conservation-history world,
  loaded by a local seed, that exercises every completed engine and state.

## Relationship to the production reading experience

The production application is now the primary way to experience the
platform: a first-time reader signs in and browses **People**,
**Institutions**, and **Contributions** by name from the `/explore` hub and
the `/people`, `/institutions`, `/contributions` directories (backed by the
`list_people` / `list_organizations` / `list_contributions` read models),
reaching every detail page without ever seeing a UUID. General browsing
therefore lives in production, not here.

The exhibition is a deterministic developer inspection environment. It exists
to inspect things production should not surface prominently: deterministic
showcase records, edge cases (disputed, unknown, and approximate states),
canonical-record reuse across surfaces, reviewer demonstrations,
architectural concepts, and reset instructions. Anything that belongs in the
normal user experience must live only in production; the exhibition must
never grow a parallel browse interface or otherwise duplicate a production
capability.
Locally, the same seeded world populates both — the production directories
list these clearly-labelled fictional records during development, and in a
real deployment (where this seed never runs) they list only real data.

## Why the data is fictional

Every seeded record is fictional development-only material and carries a
visible `— Development Exhibition` label in its display name / institution
name. No real person, institution, community, or claim is represented. This
keeps the exhibition unambiguous for anyone reviewing it and avoids
introducing unsourced historical claims into the system, consistent with the
provenance-first, no-inferred-history principles of the Design Bible and
Product Blueprint. Absence, uncertainty, and disagreement are seeded
explicitly so the engines' honest-gap behavior is visible rather than
implied.

## How to reset and open it

```
npm run supabase:reset   # applies migrations, then loads the seed world
npm run dev
```

Then open:

```
http://localhost:3000/dev/exhibition
```

The exhibition page needs no authentication (it is guarded only by
`NODE_ENV`; see below). The person, institution, and contribution pages it
links to are the product's normal authenticated reading surfaces, so opening
a link requires registering and signing in (`/register`). Reviewer-only
areas remain authorized separately; the exhibition never grants reviewer
access or seeds an account.

## Stable showcase routes

The exhibition links to canonical seeded records by deterministic UUID. The
principal entities:

- Person — Dr. Helena Arvoredo: `/people/e6110000-0000-4000-8000-000000000001`
- Institution — Instituto de História da Floresta Amazônica (IHFA):
  `/institutions/e6220000-0000-4000-8000-000000000001`
- Contribution — Long-term canopy-phenology dataset:
  `/contributions/e6660000-0000-4000-8000-000000000001`

The full set of links (five people, three institutions, three
contributions, plus the auth/review flows) is defined in
`src/app/dev/exhibition/content.ts`, whose ids mirror the seed. Link labels
are human-readable names; UUIDs appear only in `href`s, never as visible
text.

## Which engines and states are demonstrated

- **Scientific Biography** — a person with a substantial verified narrative
  (Helena), a person with a short provisional narrative (Rafael), a person
  with no narrative at all (Ana Yara — honest absence), and a disputed
  record (Samuel), with provenance and verification distinctions visible.
- **Timeline** — one life exercises exact (day), month, year, and decade
  precision; approximate and uncertain dates; a closed interval; an
  open-ended (ongoing) period; an unknown date; and overlapping events. A
  single canonical Event (an interview) is reused on a person, an
  institution, and a contribution timeline; a second canonical Event (the
  ongoing programme) is shared the same way.
- **Participation** — several people connected to multiple institutions in
  distinct capacities, with repeated periods, ongoing, approximate, and
  uncertain periods, each canonical Participation projected from both the
  person side and the institution side. Affiliation never fabricates a
  contribution.
- **Relationships** — directional (mentorship, succession, interview) and
  symmetric (collaboration, field partnership, correspondence) kinds, with
  verified, provisional, and disputed states; symmetric relationships
  display reciprocally from both participants.
- **Institution Engine** — an active institution with a former name, an
  acronym, an external identifier, a founding year, and
  introduction/overview/significance narrative facets; a field station with
  an approximate decade-precision founding and a documented name change; and
  a closed archive with an intentionally incomplete history (an honest
  reserved/absent state for later facets).
- **Contribution Engine** — contribution as a first-class object with both
  person and institution contributors in distinct capacities and with
  temporal uncertainty, projected onto person and institution pages and with
  its own page. No rankings, percentages, or inferred credit.

## How deterministic UUIDs are managed

All showcase records use a fixed `e6……` namespace, one prefix per entity
type (`e611…` people, `e622…` organizations, `e633…` events, `e644…`
participations, `e655…` relationships, `e666…` contributions), with a small
numeric suffix. The same ids appear in exactly two places, kept in sync:

- `supabase/seeds/m6_exhibition.sql` — the canonical rows, and
- `src/app/dev/exhibition/content.ts` — the link targets (`EXHIBITION_IDS`).

`supabase/tests/database/exhibition.test.sql` asserts the ids resolve and
that associations are correct, so drift between the two is caught. Symmetric
relationships order their person ids to satisfy the engine's
`source_person_id < target_person_id` invariant.

## Why it is separate from production data and Playwright factories

- **Local only.** The seed is loaded exclusively by `supabase db reset` /
  `supabase start`, via `supabase/config.toml`
  (`[db.seed] sql_paths = ["./seed.sql", "./seeds/m6_exhibition.sql"]`). It
  is never part of a deployed environment and never inserts real participant
  data. It runs through the established privileged reset path, so it writes
  deny-by-default tables directly without weakening any RLS policy,
  `SECURITY DEFINER` boundary, or client grant, and without seeding any
  `auth.users` account or password.
- **No coupling to isolated tests.** The existing pgTAP database tests each
  wipe and rebuild their own fixtures inside a rolled-back transaction, and
  the Playwright suites create disposable fixtures via the service-role
  client or search for unique tokens — none of them depend on the exhibition
  world, and the exhibition does not replace those isolated factories. The
  exhibition's own tests are additive:
  `supabase/tests/database/exhibition.test.sql`,
  `tests/unit/dev-exhibition.test.ts`, and `tests/e2e/exhibition.spec.ts`.
- **Idempotent.** Every insert uses `on conflict (id) do nothing`, so the
  seed is safe to re-apply, and a reset always reproduces the identical
  world.

## How production mode excludes the route

The route follows the same contract as `/dev/design-system`:

1. **Not linked.** No product page, navigation entry, sitemap, or metadata
   references it; the only reference is a dev-to-dev link from
   `/dev/design-system`. There is no `sitemap.ts`/`robots.ts`, and the page
   sets `robots: { index: false, follow: false }`.
2. **Runtime-blocked.** `src/app/dev/exhibition/page.tsx` calls
   `isDevOnlyRouteBlocked(process.env.NODE_ENV)` (`src/lib/dev-only-route.ts`)
   and returns a real 404 via `notFound()` for any `NODE_ENV` other than
   `development`. The guard fails closed (anything that isn't exactly
   `"development"` is blocked) and is unit-tested in
   `tests/unit/dev-exhibition.test.ts`.
3. **Manifest presence.** As with the design-system route, the file still
   appears in the build route manifest — a documented App Router limitation,
   mitigated by the runtime block and the no-index metadata above.

## Adding future engines — production first

The production application is the canonical product; this environment only
inspects and demonstrates it. Therefore **every future engine (M7 onward)
must first integrate into the production application — its reading surfaces
and navigation — before it receives any exhibition representation.** The
exhibition is never where a capability debuts, and it must never add a
capability, analytics, a browse interface, or a production route of its own.
See `docs/canonical-user-journey.md` for this governing rule.

When a shipped engine is then given inspection coverage here, extend the
environment by **reusing** existing canonical rows rather than creating
parallel ones:

1. Add the new rows to `supabase/seeds/m6_exhibition.sql` under a new `e6……`
   prefix, linking to existing people/institutions/events/contributions via
   the join tables — never duplicate a canonical Event, Participation,
   Relationship, Institution, or Contribution just to show it on another
   surface.
2. Add a concept/state section (and, if useful, a journey) to
   `src/app/dev/exhibition/content.ts`, keeping the grouping engine-neutral
   and the labels human-readable — never a generic entity browse.
3. Extend `supabase/tests/database/exhibition.test.sql` with assertions for
   the new canonical associations, and add coverage to
   `tests/e2e/exhibition.spec.ts`.

## M7 — Knowledge Network inspection states

After the production Network experience, the exhibition adds a "Knowledge Network neighbourhoods" section and Journey 4 linking `/network/...` neighbourhoods for the seeded world, plus two seeded `organization_relationships` (a succession and an affiliation) that demonstrate institutional lineage from both ends. `EXHIBITION_ENGINES` gains `network`. The exhibition remains dev-only and never becomes the primary way to reach M7.
