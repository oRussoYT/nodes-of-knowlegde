# Production Experience Phase I — Unifying M1–M7 Into One Coherent Product

Status: audit, benchmarking, and design foundation. Not M8. Introduces no new
knowledge engine, AI, discovery, recommendations, inference, ranking, metrics,
federation, or new Node architecture. Its single purpose is to make M1–M7 feel
like **one continuous scholarly reading environment** rather than a sequence of
milestone demonstrations.

This document is the problem map and the target definition. The companion
`production-experience-phase-1-engineering-report.md` records what was changed
and the closing audits.

> **Addendum — accepted refinements (supersede the tentative resolutions below).**
> Two decisions in this document were later strengthened by accepted direction
> and are recorded here so the doc stays coherent with what shipped:
> **P5** was resolved not by "document + invariant" but by full architectural
> consolidation — one canonical `ProvenanceAffordance` component that every
> engine delegates to (presentation only; all semantics, vocabulary,
> determinism, accessibility, and read models preserved). **P2** was pushed
> beyond divider/rhythm into a shared `ReadingSpine` primitive through which all
> three canonical pages compose one continuous reading spine, without flattening
> any engine's ontology. See the engineering report for details.

---

## 1. Starting condition (verified)

- `CLAUDE.md` read. Working rules understood (Server Components by default,
  business logic out of `src/components`, controlled vocabularies out of
  interface code, deny-by-default security, scope discipline).
- Working tree **clean**; branch `main`, up to date with `origin/main`.
- **M7 is committed.** `HEAD = 65f17f034306092d99070f8d5c2178d36220ee88`
  — `feat: implement M7 knowledge network engine`.
- No commit, push, or tag is performed by this phase.

Governing documents reviewed: Constitution/Design Bible v1.1, Product Blueprint
v1.1, Master Vision, canonical user journey, application information
architecture, development roadmap, ADRs through ADR-0017, the M6.1–M7
implementation/engineering reports, navigation config
(`src/lib/navigation/*`, `src/config/site.ts`), all production layouts and
pages under `src/app/(public|protected)`, the shared design-system components
(`src/components/ui`, `src/components/layout`), and the shared kernels
(`src/features/shared/provenance.ts`, `src/features/shared/temporal.ts`).

**Overall finding.** The architecture is not the problem, and in most respects
the *presentation* is already unusually disciplined: navigation is a single
typed source of truth read by every chrome surface; the temporal and provenance
vocabularies are genuinely shared kernels; empty states are honest; the Network
is already correctly demoted to invisible infrastructure (ADR-0017). The
remaining fragmentation is **local and specific**, not systemic. This phase is
therefore a refinement pass, not a redesign — consistent with §3's prohibition
on reopening settled questions.

---

## 2. Per-surface audit

Legend for "dead end?": **No** = at least one historically-justified onward
doorway; **Partial** = some connections lead on, some terminate; **N/A** =
orientation/account surface, not a reading surface.

### Public

| Surface | Purpose | Arrives understanding | Primary action | Next doorway | Dead end? | Notes |
|---|---|---|---|---|---|---|
| `/` | Entrance to the reading record | What NoK preserves (lives, institutions, contributions) and that reading needs a free account | Create account / Sign in | `/register`, `/login` | No | Quiet, honest, no metrics. Good. |
| `/register`, `/login`, `/forgot-password`, `/auth/confirm`, `/auth/error` | Authentication + recovery | Where they are in the auth flow | Submit / follow link | Into `/member` (confirm) | No | M4/M5 auth; out of scope to redesign. Confirm lands on `/member?confirmed=1`. |

### Authenticated orientation

| Surface | Purpose | Primary action | Next doorway | Dead end? | Notes |
|---|---|---|---|---|---|
| `/explore` | Reading lobby | Choose a reading entrance | People / Institutions / Contributions | No | Three doorway cards, no dashboard, no metrics. Matches target. |
| `/member` | Personal status + claim state | See status; act on claim | `/member/claim`, `/account` | **Partial** | **Approved claim is a dead end** — no link to the reader's own canonical Person page (see P1). |
| `/account` | Sign-in identity + link state | Read facts | `/member`, `/forgot-password` | N/A | Honest; genuinely-unbuilt password-change is correctly labelled future. |
| `/member/claim` | Claim workflow | Search + submit | Back to `/member` | N/A | Honest empty states; duplicate-claim prevention mirrored server-side. |

### Reading directories

| Surface | Primary action | Next doorway | Dead end? | Notes |
|---|---|---|---|---|
| `/people` | Pick a person | `/people/[id]` | No | Card list, shared verification badge, honest empty state. |
| `/institutions` | Pick an institution | `/institutions/[id]` | No | Same rhythm + `type · status` meta line. Justified content difference. |
| `/contributions` | Pick a contribution | `/contributions/[id]` | No | Same rhythm + kind line. |

The three directories already share hierarchy, list rhythm, verification
treatment, empty-state philosophy, and link behaviour (via `directoryCopy`,
`verificationBadge`, `PageHeader`, `Container width="content"`, `py-16`). This
is the strongest evidence the "one product" goal is largely met at the
directory tier.

### Canonical reading pages

| Surface | Answers "another doorway?" | Dead end? | Notes |
|---|---|---|---|
| `/people/[personId]` | Participation→Institution ✓, Contributions→Contribution ✓, **Relationships→Person ✗** | **Partial** | Biography → narrative → Divider → Timeline → Participation → Relationships → Contributions → reserved → withheld. Composed in bare `<div class="mt-10">`; each engine renders its own `<h2>`. |
| `/institutions/[organizationId]` | Contributions→Person/Institution ✓, Lineage→Institution ✓, **Participation→Person ✗** | **Partial** | Identity → Divider → intro → name history → Timeline → Participation → Lineage → Contributions → records → significance → legacy → withheld. Mixes page-level `<section aria-labelledby>` (narrative) and bare `<div>` (engines). |
| `/contributions/[contributionId]` | Contributors→Person ✓, Institutional context→Institution ✓ | No | Overview → contributors → institutional context → related events → significance → legacy → reserved → withheld. |

### Review

| Surface | Purpose | Dead end? | Notes |
|---|---|---|---|
| `/review/claims`, `/review/claims/[claimId]` | Governance queue + decision | N/A | Reviewer-only via server check; nav entry conditional. Reviewer identity not exposed. Out of scope to redesign; one small connective copy improvement proposed (P4). |

### M7 infrastructure & retained routes

| Route | Behaviour | Verdict |
|---|---|---|
| `/network` | Redirects → `/explore` | Correct. No parallel product homepage. |
| `/network/people/[personId]` | Redirects → `/people/[id]` | Correct. |
| `/network/contributions/[contributionId]` | Redirects → `/contributions/[id]` | Correct. |
| `/network/institutions/[organizationId]` | **Renders a full `NetworkView` page** | **Inconsistent (P3).** The other two entity network routes redirect; this one renders a parallel one-hop neighbourhood that now duplicates the inline `InstitutionLineage` on the canonical Institution page. Competes, mildly, with the canonical surface. |
| `/dev/exhibition`, `/dev/design-system` | Developer inspection | Retain, inspection-only. Not linked from production nav. |

---

## 3. System-level problem map (prioritised)

The audit surfaces **five** system-level problems. They are ranked by how
directly they break the phase's quality standard ("every documented connection
gives me another meaningful place to go").

**P1 — Confirmed cross-navigation dead ends (highest value).**
Two documented, first-class connections render the connected entity as plain
text instead of a doorway, even though the read model already carries the
target's id:
- *Person → Relationships → Person.* `RelationshipEntry` renders
  `relationship.counterpart.displayName` as an `<h4>`. `CounterpartRef` carries
  `id`. The reader can see *who* mentored someone but cannot travel to them.
- *Institution → Participation → Person.* `InstitutionParticipationEntry`
  renders `entry.person.displayName` as plain text; the entry model carries the
  person ref.

These are not merely gaps — they are **inconsistencies against the codebase's
own established pattern**. The symmetric directions already link:
`AffiliationGroup` (person's Participation → `/institutions/[id]`),
`ContributionContributors` → `/people/[id]`,
`ContributionInstitutionalContext` → `/institutions/[id]`. The fix extends a
proven pattern; it adds no data, no schema, no inference (§23, §8 safe).

**P2 — Section-container rhythm is not uniform across canonical pages.**
Heading *levels* are already consistent (section `h2` at `text-sm font-medium`,
group `h3` at `text-xs font-semibold uppercase`, entry `h4` at
`text-base font-medium`). But the *containers* differ: the Person page composes
engines in bare `<div class="mt-10">` and leans entirely on each engine's own
`<h2>`; the Institution and Contribution pages sometimes wrap sections in a
page-level `<section aria-labelledby>` (narrative facets) and sometimes in bare
`<div>` (engines). And the **Divider placement differs**: Person renders
`IdentityHeader → narrative → Divider → engines`, while Institution/Contribution
render `IdentityHeader → Divider → narrative → engines`. The reading spine looks
subtly different from page to page. Low risk to unify; must not flatten the
engines (§8).

**P3 — One retained network route renders a full view; its role must be made
explicit (resolved: retain + document, not redirect).**
`/network/institutions/[organizationId]` renders `NetworkView` while its two
sibling routes redirect. Initial reading suggested redirecting it for parity.
Deeper reading corrected that: the **Exhibition** (`dev/exhibition/content.ts`)
links to this route to *inspect* the M7 network read model, and it is the only
consumer of `NetworkView`. The sibling person/contribution network routes
redirect because their connections are fully read inline and there was nothing
distinct to inspect. Nothing in the reading journey links to
`/network/institutions/[id]` — no nav entry, no canonical-page link — so it does
not *appear* as a competing product surface to a reader; it is reachable only
via the Exhibition or a typed URL. Redirecting it would break the Exhibition's
inspection target and orphan `NetworkView`. **Resolution: retain the route as
the Exhibition's inspection surface and document the intentional asymmetry**
(§20 "Exhibition inspects the infrastructure"; §19 "do not remove a route merely
because it redirects"). No code change; the route audit records the reasoning.

**P4 — Continuation after governance/claim is under-connected.**
An *approved* claimant has, constitutionally, a linked canonical Person record —
but `/member` terminates the approved state in an `EmptyState` with no path to
read it. The phase brief explicitly calls for "a natural path to the canonical
Person page where constitutionally appropriate." This requires the approved
identity status to expose the linked `personId` (see §5 gap note). Reviewer
decision pages are correctly terminal; a single "read the linked record" line is
the only connective copy warranted, and only when appropriate.

**P5 — Provenance is one shared vocabulary but seven presentational
components.** `describeProvenance` is genuinely shared, so the *words* are
identical platform-wide. But each engine ships its own
`*Provenance.tsx` (`EventProvenance`, `ParticipationProvenance`,
`RelationshipProvenance`, `InstitutionProvenance`, `ContributionProvenance`,
`NetworkConnectionProvenance`, biography `ProvenanceDisclosure`). Any drift in
spacing/disclosure behaviour between them reads as "different subsystems." This
is the §15 concern ("improve consistency where engines use slightly different
visual or copy patterns"). Lower priority: verify whether they actually diverge
before consolidating; if they are already visually equivalent, prefer a
documented shared contract over a risky refactor.

**P6 — Obsolete capability copy (found during implementation).** Two
user-facing strings describe shipped capabilities as unavailable — the §12/§32
"no implemented capability still described as unavailable" target:
- The identity `no_claim` copy said claiming and "everything about PDBFF
  participants, participation history, and the network … will be available in a
  later milestone," while the same card already renders a working "Claim a
  person record" button and M5.3–M7 shipped those engines.
- `institutionCopy.relationships.deferred` ("Institutional relationships are not
  yet available") is dead copy: the canonical Institution page now reads
  `InstitutionLineage` inline (M7/ADR-0017) with its own live heading and honest
  empty state, and nothing references the deferred block.

Explicitly **not** problems (do not "fix"): the honest "under development" Alert
on `/`; the genuinely-future password-change EmptyState on `/account`; the
per-engine semantic distinctions (Biography narrative vs Timeline chronology vs
Participation belonging vs Relationships bonds) — these are the ontology and
must survive (§8).

---

## 4. Benchmarking synthesis (problem-discovery only)

Per §22, benchmarking was used to discover *problems*, never to copy layouts or
information architectures. Four problem landscapes were studied.

**Problem landscapes studied.** Digital scholarly editions; online museum
collection interfaces; knowledge-graph visualization; biographical/archival
authority records.

**Fragmentation problems discovered.**
- *Scholarly editions* repeatedly fragment because each apparatus (text,
  variants, notes, facsimile, indices) is engineered as its own module with its
  own navigation, so the reader is made to feel they have "left the text" to
  consult evidence. The evaluative-framework literature treats *continuity of
  reading across apparatus* as a first-order UX quality, not a nicety.
- *Museum collections* fragment into "record silos": an object page lists
  related people/places/exhibitions as bare labels that either dead-end or throw
  the user into an unrelated search result set, breaking the sense of one
  connected holdings-world. Reverse-IA studies of collection sites show
  exploratory paths collapsing at exactly these hand-off points.

**Orientation and reading problems discovered.**
- *Knowledge-graph visualizations* look impressive but are intellectually weak
  for reading: users lose orientation in a node-link canvas and cannot tell
  *why* two things are connected. Recent HCI work ("Improving Knowledge Graph
  Understanding with Contextual Views") finds that **contextual, in-place views
  outperform raw graph rendering** for comprehension — the connection is best
  read where the reader already is, annotated with its justification.
- *Authority records* degrade into directory entries: a name, a pile of coded
  fields, and empty slots that read as "nothing here" rather than "not yet
  documented" or "withheld." Uncertainty either disappears (a guessed date shown
  as fact) or overwhelms (every field caveated). Timelines degrade the mirror
  way — into flat event lists that carry no narrative of a life.
- *Provenance* fails in two opposite directions: buried in hover-only tooltips
  (invisible to the reader who needs to assess a claim, and to screen readers),
  or splattered as badge-walls that dominate the page over the content itself.

**Principles extracted (and evaluated against the Constitution).**
1. *Read the connection in place, justified.* Never make the reader "enter a
   network." Show the connection where they are and say why it exists. →
   Already the platform's position (ADR-0017); benchmarking **confirms** it and
   argues for finishing the job (P1): an in-place connection that cannot be
   followed is the worst of both worlds. Constitutionally aligned (Knowledge
   Network as infrastructure).
2. *A connection is a doorway only if it is both followable and labelled with
   its reason.* Bare "View"/"Learn more" labels are the museum failure mode. →
   Drives the §7 cross-navigation contract. Aligned with equal dignity and
   narrative/evidence separation.
3. *Empty is a statement, not an absence.* Distinguish undocumented / unknown /
   not-applicable / withheld / inaccessible / planned / not-found. → The
   platform already does this better than the benchmarked systems; the principle
   says *preserve* it, do not collapse states to make pages look fuller (§14).
4. *Provenance available at the moment of assessment, never hover-only, never a
   badge-wall.* → §15; already close, needs a consistency check (P5).
5. *One reading spine.* The reader should not feel the seam between sections. →
   §9/P2 section-rhythm unification.

**Patterns deliberately rejected.** Graph/network canvases as a reading surface
(intellectually weak, orientation-losing); "related content" rails (the museum
dead-end generator — every onward path here must arise from an explicit
canonical assertion, §7); dashboards/activity summaries/metric tiles on
orientation pages (§4, §24); tabbed canonical pages that hide evidence behind
interaction (§9 prefers a continuous spine); hover-only provenance (§15, §27).

**Original Nodes of Knowledge synthesis.** The museum-like answer is a *single
reading spine* down every canonical page — identity, then narrative, then the
documented engines in a fixed rhythm, then reserved architecture, then the
honest withheld note — where **every named entity in that spine is a doorway
that states what it is and why it is connected**, and where provenance sits one
quiet gesture from each claim. The Knowledge Network stays invisible: it is the
thing that makes the doorways possible, never a place you visit.

**Why the result remains museum-like rather than dashboard-like.** Nothing is
added that counts, ranks, scores, recommends, or summarises activity. The only
new interactivity is *following a documented connection* — the most basic
museum affordance (the label beside the object that says "see also, and here is
why"). **Why benchmarking refined implementation without determining
architecture:** every principle above was already latent in the Constitution;
benchmarking told us *where the existing architecture was not yet fully
expressed in the reading experience* (P1, P2), and which tempting "fixes" (graph
views, related-content rails) to refuse. No engine, read model, or Node concept
was reopened.

---

## 5. Target production experience

The reader moves through one world:

**Landing** names what is inside and invites entry, quietly. **Explore** is a
calm three-doorway lobby (People, Institutions, Contributions), no metrics.
**Directories** share one rhythm and honest empty states. **Canonical pages**
are different *views into the same historical world*, each on the same reading
spine: identity band → introductory narrative (or dignified absence) → the
documented engines in a fixed order → reserved architecture → honest withheld
note. Within that spine, **every documented connection is a followable, labelled
doorway**: Participation → Institution, Relationship → Person, Contribution
attribution → Person/Institution, Institution participation → Person,
Institutional relationship → connected Institution. **Continuation** is always
available and always historically justified — never generic "related content."
**Member/Account** are clearly secondary to reading, truthful about state, and —
after an approved claim — offer a path to read one's own canonical record.
**Claim/Review** feel connected to the historical product without weakening
governance or revealing reviewer identity.

Bounded read-model gap to note (not yet a change): P4 requires the *approved*
identity status to carry the linked `personId` so `/member` can offer "read your
linked record." If `getIdentityStatus()` does not already expose it, that is the
one place a minimal, bounded read addition may be justified — to be confirmed
against `src/features/identity/status.ts` before any code is written, and
documented explicitly per §23 if required.

---

## 6. Cross-navigation contract (the one contract, §18)

Every onward link in a canonical reading surface MUST satisfy all of:

1. **Justified by a canonical assertion.** The link exists because a stored
   Entity/Assertion/Provenance record connects the two entities. No link is
   created merely to avoid a dead end; no inferred or "related" link is ever
   shown (§8, §24).
2. **States what the connected record is.** The link *is* the entity's name (a
   person, an institution, a contribution), never a bare "View" / "Learn more" /
   "Details."
3. **States why it is connected.** The reason is carried by the surrounding,
   already-present context — the relationship role group ("Mentors"), the
   participation capacity ("Director"), the attribution capacity, the lineage
   relation label. The link never floats free of its reason.
4. **Goes to the canonical reading page** for that entity
   (`/people/[id]`, `/institutions/[id]`, `/contributions/[id]`), and only when
   that entity is readable (non-merged, resolvable). Never a UUID in view.
5. **Visually identical treatment** to the existing established links:
   `text-... font-medium text-foreground underline underline-offset-2`
   (the pattern already used by `AffiliationGroup`, `ContributionContributors`,
   `ContributionInstitutionalContext`, the network entry links). The headline
   entity name becomes the link; provenance and period stay exactly where they
   are.

Applying the contract closes P1 (relationships counterpart, institution
participation person) by making the existing `<h4>` headline a `<Link>` — the
same move `AffiliationGroup` already makes for the institution direction.

---

## 7. Visual hierarchy & section rhythm (§9, §17)

Keep the existing design system; introduce no second design language and no new
UI dependency. Target rhythm for **every** canonical page:

- One `Container width="content"`, `py-16`. One `h1` (identity header).
- `IdentityHeader` → **`Divider`** → reading spine. Standardise the divider to
  sit *after the identity band* on all three canonical pages (Person currently
  puts it after the narrative — align it).
- Each spine section separated by the same vertical rhythm (`mt-10`), each with
  a section-level `h2` at `text-sm font-medium text-foreground`, group `h3` at
  `text-xs font-semibold uppercase tracking-wide text-muted-foreground`, entry
  headline `h4` at `text-base font-medium`. This hierarchy already exists inside
  the engines; the change is to make the *page-level* wrappers consistent (a
  section landmark per spine block) rather than mixing `<section aria-labelledby>`
  and bare `<div>`.
- Prefer a continuous spine; do **not** move sections behind tabs (§9). Sections
  render only when data exists, except honest-absence states that are important
  enough to remain visible (narrative absence, and the dignified engine empty
  states).
- Provenance stays inline near its claim (never hover-only), consistent tone and
  spacing across engines (P5). Badges present but never dominant.

This unifies the *spine* without touching the *ontology*: Timeline still reads
chronologically, Relationships still group by who-they-were, Participation still
groups by capacity, narrative facets still read as prose.

---

## 8. Prioritised implementation plan

Sequenced low-risk → higher-touch, matching §25. Each item names its guardrail.

1. **P1a — Relationships → Person doorway.** Make the counterpart headline in
   `RelationshipEntry` a `<Link href="/people/[counterpart.id]">` using the
   contract §6. Verify counterparts always resolve to readable person entities;
   if a counterpart can be non-readable, guard the link. Add/extend unit +
   Playwright coverage (link present, meaningful text, navigates). *No data
   change.*
2. **P1b — Institution participation → Person doorway.** Same move in
   `InstitutionParticipationEntry`, mirroring `AffiliationGroup`. Same tests.
   *No data change.*
3. **P2 — Section-rhythm unification.** Standardise divider placement and
   section wrappers across the three canonical pages; keep engine internals
   untouched. Accessibility check: still exactly one `h1`, logical order, one
   landmark per spine block.
4. **P3 — Retained network route role.** Resolved to **retain + document**, not
   redirect: `/network/institutions/[organizationId]` is the Exhibition's
   inspection surface for the M7 network read model and the sole consumer of
   `NetworkView`; nothing in the reading journey links to it. Record the
   intentional asymmetry in the route audit. *No code change; no competing
   production surface, since no reading path reaches it.*
5. **P4 — Post-claim / governance continuation.** If `getIdentityStatus()`
   exposes the linked `personId`, add a single "Read your linked record" link to
   the approved `/member` state; otherwise document the bounded read gap first
   (§23) and decide. One connective line on the reviewer decision result where
   constitutionally appropriate. *Governance unchanged; reviewer identity never
   exposed.*
6. **P5 — Provenance consistency.** Audit the seven `*Provenance` components for
   real divergence. If they differ, converge spacing/disclosure via the shared
   contract; if already equivalent, document the contract and add a copy/shape
   invariant test rather than refactor. *Prefer the lowest-risk resolution.*
7. **Tests & docs.** Vitest: navigation config, copy invariants, empty-state
   distinctions, cross-navigation derivation, Node-neutral language, no
   dashboard/social/ranking language, no obsolete "Soon" for implemented
   features. Playwright: the four journeys (first-time reader, returning reader,
   claimant, reviewer) plus no-dead-ends / meaningful-link-text / honest
   empty-states / light-dark parity / keyboard / 375px / no overflow / no
   duplicate ids / no axe serious+critical. Update README, canonical user
   journey, IA, roadmap, design-system docs, exhibition docs, and any M1–M7 doc
   carrying obsolete UX statements.
8. **Audits.** Constitutional audit (§31) and closing repository audit (§32).
   Then **stop for local Mac validation** (§33) — the Mac is authoritative; do
   not claim blocked validation passed. No commit, push, or tag.

---

## 9. Guardrails (carried from the brief)

Do not: redesign M1–M7; move historical truth into presentation code; infer
missing connections; make incomplete records look complete; add metrics,
ranking, dashboards, or "related content"; add a UI dependency or a second
design language; expose dev routes or the Network as a top-level product;
weaken RLS/grants/governance; reveal reviewer identity; commit, push, or tag.

Do change only: production page composition, navigation, layout, copy, shared
presentational components, cross-navigation, empty states, responsive behaviour,
accessibility, docs, and tests. If a genuine blocker requires a new bounded read
projection (P4 is the only candidate), document the exact gap before adding it.
