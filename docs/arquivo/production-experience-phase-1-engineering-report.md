# Production Experience Phase I — Engineering Report

Companion to `docs/production-experience-phase-1.md` (the accepted audit,
problem map, target experience, cross-navigation contract, and visual-hierarchy
spec). This report records what was changed, why, the required Benchmarking
Synthesis, the full experience walkthrough, and the constitutional and closing
audits.

Baseline: `HEAD = 65f17f034306092d99070f8d5c2178d36220ee88`
(`feat: implement M7 knowledge network engine`). Working tree clean at start.
**Nothing is committed, pushed, or tagged by this phase.** No schema, migration,
RLS, grant, or controlled-vocabulary change was made.

---

## 1. Summary of changes

Twenty-nine files across production source, tests, and documentation (24
modified, 5 added). No schema, migration, RLS, grant, or vocabulary change; no
production capability duplicated, no engine redesigned, no data added, no
inference introduced. Two of the accepted refinements (§0 below) superseded the
report's original conservative resolutions of P5 and P2.

### §0. Accepted addendum — refinements that supersede the original report

- **Canonical Provenance component (supersedes P5 "document + invariant").**
  Provenance presentation is now consolidated into ONE canonical component,
  `src/features/shared/ProvenanceAffordance.tsx`. Each engine's `*Provenance`
  component became a thin adapter that supplies only its subject phrase and
  delegates all presentation to it. Every deterministic accessible name,
  vocabulary, semantic, and read model is preserved exactly (verified against
  the e2e suite's accessible-name assertions). Presentation drift is now
  structurally impossible.
- **Deeper page composition (supersedes P2 "divider + rhythm").** All three
  canonical pages now compose their sections through one shared reading-spine
  primitive, `src/components/ui/ReadingSpine.tsx`, so the rhythm from the
  identity band down through the engines is identical on Person, Institution,
  and Contribution — one continuous narrative, not three page templates. The
  ontology is untouched: each engine keeps its own section, heading, semantics,
  and provenance.

Production source (presentation / composition / copy / cross-navigation only):

| File | Problem | Change |
|---|---|---|
| `src/features/shared/ProvenanceAffordance.tsx` (new) | P5 | THE canonical provenance affordance — owns all presentation, interaction, the deterministic aria-label, and the network `projectedFrom` phrasing. |
| 7× `*Provenance.tsx` (Event, Participation, Relationship, Institution, Contribution, NetworkConnection, biography ProvenanceDisclosure) | P5 | Rewritten as thin adapters delegating to `ProvenanceAffordance`; each holds only its engine subject phrase, zero presentation. |
| `src/components/ui/ReadingSpine.tsx` (new) | P2 | The shared reading-spine rhythm primitive used by all three canonical pages. Pure vertical rhythm; imposes no style; never flattens a section. |
| `src/features/relationships/components/RelationshipEntry.tsx` | P1a | Counterpart name is now a `Link` to `/people/[counterpart.id]` — a person-to-person doorway. Mirrors the existing `AffiliationGroup` pattern. |
| `src/features/institution/components/InstitutionParticipationEntry.tsx` | P1b | Participant name is now a `Link` to `/people/[person.id]` — an institution→person doorway, the mirror of the person page's participation→institution link. |
| `src/app/(protected)/people/[personId]/page.tsx` | P2 | Composed through `ReadingSpine`: identity → divider → one continuous spine; narrative's anomalous extra padding removed so rhythm is uniform. |
| `src/app/(protected)/institutions/[organizationId]/page.tsx` | P2 | Composed through `ReadingSpine`; per-block `mt-10` removed; every section, heading id, and conditional preserved. |
| `src/app/(protected)/contributions/[contributionId]/page.tsx` | P2 | Composed through `ReadingSpine`; per-block `mt-10` removed; every section preserved. |
| `src/app/(protected)/member/page.tsx` | P4 | Approved-claim state now offers "Read your linked record" → the reader's own canonical Person page. Stale comment refreshed to state the Member area is deliberately secondary to reading. |
| `src/features/identity/copy.ts` | P6 | `no_claim` copy rewritten from "…will be available in a later milestone" (false: claiming shipped in M5.3) to honest present-tense copy matching the available "Claim a person record" action. Approved copy gains a one-line pointer to the canonical page. |
| `src/features/institution/copy.ts` | P6 | Removed the dead `relationships.deferred` block ("Institutional relationships are not yet available") — false since M7 reads institutional lineage inline; unreferenced by any component. |

Tests (added / revised to match, never weakened):

| File | Change |
|---|---|
| `tests/e2e/relationships.spec.ts` | New test: a relationship counterpart name links to `/people/[id]` and navigating lands on that biography (no dead end, meaningful link text). |
| `tests/e2e/institution.spec.ts` | Extended the "both perspectives" test: the participant name on the institution page is a doorway to `/people/[id]`. |
| `tests/e2e/claim-review.spec.ts` | Extended the approve-workflow test: the approved claimant's `/member` offers "Read your linked record" → the canonical Person page, and navigating works. |
| `tests/unit/identity-copy.test.ts` | New invariant: no claimant-facing status copy describes a shipped capability (claiming/participation/network) as a future milestone. Refreshed a now-stale comment. |
| `tests/unit/institution-copy.test.ts` | Replaced the assertion on the removed deferred copy with a guard that institution copy never says "not yet available". |
| `tests/unit/provenance-presentation-consistency.test.ts` | New (P5): asserts the canonical `ProvenanceAffordance` owns the whole presentation (shared trigger class, real focusable control, full provenance in the accessible name — never hover-only) and that every one of the seven engine components is a pure delegator holding no competing affordance (drift guard). |
| `tests/e2e/workspace-pages-quality.spec.ts` | Refreshed a stale explanatory comment that referenced the removed member copy (no assertion change). |

Documentation: `docs/production-experience-phase-1.md` (added), this report
(added), plus the targeted updates in §6 below.

Resolved without code change (documented decisions):
- **P3** — `/network/institutions/[organizationId]` is retained as the
  Exhibition's inspection surface for the M7 network read model (its sole
  consumer of `NetworkView`); nothing in the reading journey links to it, so it
  is not a competing production surface. Redirecting it would break Exhibition
  inspection and orphan `NetworkView`. The intentional asymmetry with the
  redirecting person/contribution network routes is documented (§4 route audit).
- **P5** — Now consolidated into one canonical component (§0), per the accepted
  refinement. Presentation lives in exactly one place; the seven engine
  components are pure delegators; the invariant test enforces this. The residual
  §15 hover-only tension now sits on a single component and is recorded as a
  small validation-gated follow-up (§5).

---

## 2. Benchmarking Synthesis (required)

**Problem landscapes studied.** Digital scholarly editions; online museum
collection interfaces; knowledge-graph visualization; biographical/archival
authority records. Benchmarking was used to discover *problems* and extract
*principles*, never to copy layouts, IAs, or interaction patterns.

**Fragmentation problems discovered.** Scholarly editions fragment when each
apparatus (text, variants, notes, facsimile, indices) is a self-contained module
with its own navigation, so consulting evidence feels like *leaving the text*;
the evaluative-framework literature treats continuity-of-reading-across-apparatus
as a first-order quality. Museum collections fragment into "record silos" — an
object page lists related people/places/exhibitions as bare labels that dead-end
or dump the user into an unrelated search, and reverse-IA studies show
exploratory paths collapsing exactly at those hand-off points.

**Orientation and reading problems discovered.** Knowledge-graph canvases look
impressive but read poorly: users lose orientation in a node-link space and
cannot tell *why* two things connect; recent HCI work (contextual-views research)
finds in-place, justified views outperform raw graph rendering for
comprehension. Authority records degrade into directory entries — a name, coded
fields, and empty slots that read as "nothing here" rather than distinguishing
undocumented / unknown / withheld; uncertainty either vanishes (a guess shown as
fact) or overwhelms. Timelines degrade the mirror way, into flat event lists that
carry no narrative of a life. Provenance fails in two opposite directions:
buried in hover-only tooltips (invisible when a reader needs to assess a claim,
and to screen readers) or splattered as badge-walls that dominate the content.

**Principles extracted (evaluated against the Constitution).**
1. Read the connection in place, justified — never "enter a network." *Already
   the platform's position (ADR-0017); benchmarking confirms it and argues for
   finishing the job: an in-place connection that cannot be followed is the worst
   of both worlds (→ P1).*
2. A connection is a doorway only if it is both followable and labelled with its
   reason; bare "View"/"Learn more" is the museum failure mode (→ the
   cross-navigation contract, §3 of the phase doc).
3. Empty is a statement, not an absence — keep the seven honest states distinct;
   never collapse them to look fuller. *The platform already does this better
   than the benchmarked systems.*
4. Provenance available at the moment of assessment — never hover-only, never a
   badge-wall (→ P5; the current affordance is keyboard-operable and
   screen-reader-complete, and the residual visual-hover tension is recorded).
5. One reading spine — the reader should not feel the seam between sections
   (→ P2).

**Patterns deliberately rejected.** Graph/network canvases as a reading surface
(orientation-losing, intellectually weak); "related content" rails (the museum
dead-end generator — every onward path here arises from an explicit canonical
assertion); dashboards / activity summaries / metric tiles on orientation pages;
tabbed canonical pages that hide evidence behind interaction; hover-only
provenance.

**Original Nodes of Knowledge synthesis.** A single reading spine down every
canonical page — identity, narrative, the documented engines in a fixed rhythm,
reserved architecture, honest withheld note — where every named entity in that
spine is a doorway that states what it is and why it is connected, and provenance
sits one quiet, keyboard-operable gesture from each claim. The Knowledge Network
stays invisible: it makes the doorways possible; it is never a place you visit.

**Why the result remains museum-like rather than dashboard-like.** Nothing was
added that counts, ranks, scores, recommends, or summarises activity. The only
new interactivity is *following a documented connection* — the most basic museum
affordance (the label beside the object saying "see also, and here is why").

**Why benchmarking refined implementation without determining architecture.**
Every principle above was already latent in the Constitution. Benchmarking told
us *where the existing architecture was not yet fully expressed in the reading
experience* (P1, P2) and which tempting "fixes" to refuse (graph views,
related-content rails). No engine, read model, or Node concept was reopened.

---

## 3. Final experience walkthrough (required)

For each stage: what the user understands, the primary action, the next doorway,
and why it is not a dead end.

1. **First landing (`/`).** Understands what NoK preserves (scientific lives, the
   institutions they worked through, the contributions they made) and that
   reading needs a free account. Primary action: create an account / sign in.
   Next doorway: `/register` or `/login`. Not a dead end: two clear calls to
   action; quiet, honest, no metrics.
2. **Registration (`/register`).** Understands what's required to create an
   account. Action: submit. Doorway: email confirmation. Not a dead end:
   confirmation path is explicit.
3. **Email confirmation (`/auth/confirm`).** Understands the account is active.
   Doorway: lands on `/member?confirmed=1` with a success message. Not a dead
   end: the Member area itself points onward to reading and to the claim flow.
4. **Explore (`/explore`).** Understands this is the calm lobby of the reading
   experience with three entrances. Action: choose People, Institutions, or
   Contributions. Doorway: the three directories. Not a dead end: three live
   doorways; no dashboard, no metrics.
5. **Browsing People (`/people`).** Understands this is the index of scientific
   lives, each with an honest verification badge. Action: pick a person. Doorway:
   `/people/[id]`. Not a dead end: every row links; honest empty state when
   empty.
6. **Reading a Scientific Identity (`/people/[id]`).** Understands who the person
   is, what is known of their scientific life, and what remains unknown, read
   down one spine: identity → narrative → timeline → participation →
   relationships → contributions → reserved architecture → withheld note. Action:
   read; assess any claim via its provenance affordance. Doorways: **participation
   → institution, relationships → person (new), contributions → contribution.**
   Not a dead end: multiple historically-justified onward doorways.
7. **Following Participation → Institution.** Understands where and in what
   capacity the person participated. Action: follow the institution name. Doorway:
   `/institutions/[id]`. Not a dead end: the affiliation name is a link.
8. **Following a Relationship → Person (new).** Understands who shaped this life
   and whose lives it shaped, grouped by role ("Mentors", "Students",
   "Collaborators"). Action: follow the counterpart's name. Doorway:
   `/people/[id]` of the counterpart. Not a dead end: the counterpart name is now
   a doorway (was plain text) — the fix at the heart of this phase.
9. **Opening an Institution (`/institutions/[id]`).** Understands the institution
   as a historical actor: identity, name history, timeline, the people who
   participated, its institutional relationships, and associated contributions.
   Action: read; follow onward. Doorways: **participation → person (new),
   lineage → connected institution, contributions → person/institution.** Not a
   dead end: every participant and every lineage relation is followable.
10. **Reading institutional lineage.** Understands documented predecessor /
    successor / parent / affiliation relationships, read inline (never a graph,
    never "enter the network"). Action: follow a connected institution. Doorway:
    `/institutions/[id]`. Not a dead end: each connection is a labelled link;
    honest absence when none.
11. **Opening a Contribution (`/contributions/[id]`).** Understands what was made
    possible, its kind, who and which institutions contributed and in what
    capacities, the period if known, and contextualising events. Action: read;
    follow onward. Doorways: **contributors → person, institutional context →
    institution.** Not a dead end: every credited actor is a doorway.
12. **Continuing to another record.** From any person, institution, or
    contribution the reader lands on another canonical page and continues, because
    every onward path is a documented assertion, not "related content." Not a dead
    end by construction — this is the phase's quality standard.
13. **Member and Account.** Understands these are secondary to reading:
    authentication status and person-record link state, never a dashboard or a
    second Explore. Action: manage claim state; read account facts. Doorway:
    `/member/claim`, `/account`, and — once approved — the reader's own canonical
    Person page (new). Not a dead end: the approved state is no longer terminal.
14. **Claim workflow (`/member/claim`).** Understands person records exist
    independently of accounts and that claiming submits a match for review, which
    does not itself create history. Action: search, select, submit. Doorway: back
    to `/member` with pending status; on approval, on to the canonical Person
    page. Not a dead end: honest states throughout; duplicate prevention mirrored
    server-side.
15. **Review workflow (`/review/claims`).** (Reviewers only.) Understands the
    queue, the claim detail with scoped evidence, and the decision, with a durable
    recorded outcome. Action: begin review, decide. Doorway: the durable decision
    view. Not a dead end: the recorded decision is the terminal, correct state;
    reviewer identity is never exposed to the claimant, and the claimant's own
    onward path (to their linked record) lives on `/member`.

---

## 4. Route audit

| Route | Status | Verdict |
|---|---|---|
| `/`, `/register`, `/login`, `/forgot-password`, `/auth/confirm`, `/auth/error` | canonical | Unchanged; correct. |
| `/explore`, `/people`, `/institutions`, `/contributions` | canonical reading | Unchanged; three-doorway lobby + directories. |
| `/people/[id]`, `/institutions/[id]`, `/contributions/[id]` | canonical reading | Refined (P1, P2); onward doorways complete. |
| `/member`, `/member/claim`, `/account` | personal | Refined (P4, P6); secondary to reading; approved-claim doorway added. |
| `/review/claims`, `/review/claims/[id]` | governance | Unchanged; reviewer-gated; identity never exposed. |
| `/network` | redirect → `/explore` | Correct; no parallel product homepage. |
| `/network/people/[id]` | redirect → `/people/[id]` | Correct. |
| `/network/contributions/[id]` | redirect → `/contributions/[id]` | Correct. |
| `/network/institutions/[id]` | renders `NetworkView` | **Retained by design**: the Exhibition's inspection surface for the M7 network read model and the sole consumer of `NetworkView`; unreachable from any reading path (no nav entry, no canonical-page link). Intentional asymmetry with the redirecting siblings, which had no distinct infrastructure to inspect. |
| `/dev/exhibition`, `/dev/design-system` | dev inspection | Inspection-only; never linked from production nav. Unchanged. |

No route was removed. Every redirect remains intentional. No retained route
appears as a competing product surface to a reader.

---

## 5. Recommendation for a validated follow-up (P5 residual tension)

The provenance affordance is now one canonical component and is accessible: full
source + verification is in the trigger's server-rendered accessible name
(`aria-label`), the trigger is a real focusable `button`, and disputed/provisional
network states additionally render a visible badge. This satisfies "keyboard-
operable, one gesture away, screen-reader-complete." A residual tension remains
for a *sighted mouse* reader: the source/verification detail is revealed on
hover/focus via the tooltip, which §15/§27 discourage ("no tooltip-only
provenance"). Because presentation is now consolidated, resolving this — e.g.
surfacing the verification status inline as quiet text while keeping the calm
source disclosure — is a change to exactly ONE component (`ProvenanceAffordance`)
that instantly applies to all seven engines. It is nonetheless a visible change
to every canonical page's reading rhythm and should be verified with the
authoritative axe / visual / e2e suite; it is therefore recommended as a small,
ADR-worthy follow-up rather than executed blind in this pass. The consolidation
is what makes that follow-up a one-file change instead of a seven-file sweep.

---

## 6. Documentation updated

- `docs/production-experience-phase-1.md` — the audit/design foundation (added).
- `docs/production-experience-phase-1-engineering-report.md` — this report (added).
- `docs/canonical-user-journey.md` — records the now-complete onward doorways
  (relationship → person; institution participation → person; approved claim →
  canonical Person page).
- `docs/application-information-architecture.md` — notes the cross-navigation
  contract and the corrected Member-area role/copy.
- `docs/development-roadmap.md` — logs Production Experience Phase I as an
  integration/refinement pass between M7 and M8.
- `docs/design-system-architecture.md` — documents the two new presentational
  primitives: `ReadingSpine` (the canonical reading-spine rhythm) and
  `ProvenanceAffordance` (the canonical provenance affordance every engine
  delegates to).
- No ADR was created: the durable decisions (retain the institution network route
  for Exhibition inspection; the P5 residual follow-up recommendation) are
  documented here; the provenance/composition consolidations reuse existing
  patterns and introduce no new architecture or dependency (§28). The Constitution
  and Blueprint were not modified — no genuine contradiction was found.

---

## 7. Constitutional audit (required)

Audited against each ratified principle:

- **Museum-like reading** — preserved and strengthened: one reading spine, calm
  doorways, no dashboard/metrics/graph added.
- **Entity / Assertion / Provenance** — untouched; every new doorway is justified
  by an existing canonical assertion; no historical truth moved into UI code.
- **Temporal honesty / Many-Clocks** — untouched; no date semantics changed.
- **Honest uncertainty** — preserved; the seven empty/absence states remain
  distinct; no incomplete record made to look complete.
- **Narrative / evidence separation** — preserved; narrative facets and evidence
  engines keep their distinct treatment; the engines were not flattened.
- **Equal dignity** — preserved; every participant/counterpart is an equally
  reachable doorway regardless of capacity or role.
- **Institutional sovereignty** — preserved; institution pages remain first-class
  histories, not directory entries.
- **Node Independence** — preserved; all new copy and links are engine/Node-
  neutral (no PDBFF-specific routes or strings introduced).
- **Deny-by-default security** — untouched; no RLS, grant, or auth change; new
  links target already-authorized reading routes.
- **Bounded read architecture** — untouched; the approved-claim doorway reuses
  the `personId` already present in `getIdentityStatus()`; no new read model, no
  new projection, no data added.
- **Knowledge Network as infrastructure** — preserved; no nav entry, no "enter
  the network" step; the one retained network route is inspection-only.
- **Benchmarking Discipline** — followed; used to discover problems and reject
  incompatible patterns, not to source solutions; M1–M7 architecture not
  reopened.
- **Prohibition on reopening settled questions / M8 boundary** — honoured; no
  discovery, recommendation, inference, ranking, metric, dashboard, feed, or new
  engine.

On the two accepted consolidations specifically: the **provenance
consolidation** unified only *presentation* — it moved no provenance data,
changed no provenance meaning or vocabulary, moved provenance into no other
layer, preserved every deterministic accessible name, and touched no read model
(verified against the e2e accessible-name assertions). The **reading-spine
composition** unified only *rhythm* — every engine keeps its own section,
heading, semantics, and provenance; Biography stays narrative, Timeline stays
chronology, Participation stays institutional history, Relationships stay
explicit assertions, Contributions stay contributions, evidence stays evidence.
Neither introduced a new dependency, a second design language, or new
architecture beyond two thin presentational primitives.

Explicit statements: **no engine was redesigned; no canonical truth was moved
into UI code; no inferred connection was added; no ranking or metric was added;
no dashboard was added; no production capability was duplicated in the Exhibition;
and the application now presents M1–M7 as one coherent reading experience.**

---

## 8. Closing repository audit (required)

- Clean baseline preserved; `HEAD` unchanged; nothing staged, committed, pushed,
  or tagged.
- No schema, migration, RLS, grant, or controlled-vocabulary change
  (`git diff --stat` touches only presentational code under `src/app`,
  `src/features/*/components`, the two new primitives `src/components/ui/
  ReadingSpine.tsx` and `src/features/shared/ProvenanceAffordance.tsx`, copy
  modules, `tests`, and `docs`).
- Provenance consolidated to one canonical component with seven pure delegators;
  reading rhythm consolidated to one canonical `ReadingSpine`. Both preserve all
  behaviour, semantics, and accessibility (§7).
- All canonical pages remain functional; all redirects remain intentional.
- Obsolete copy removed where it described shipped capabilities as unavailable
  (identity `no_claim`; institution `relationships.deferred`).
- No generic "related content" exists; every cross-link is justified by a
  canonical assertion; no unjustified cross-link added.
- No dead ends remain on the principal seeded reading journeys (relationship →
  person, institution participation → person, approved claim → canonical Person
  page all now lead on).
- No duplicated navigation destination; M7 remains invisible infrastructure;
  Exhibition remains inspection-only.
- Tests updated to match the real experience; no existing assertion weakened.
- `git diff --check` clean. No truncated files, no heredoc markers, no stray
  transfer archives introduced by the change set.

Environment note (device bridge, not a repository defect): this cloud session
edits the repository over a device bridge whose mount cannot `unlink`, so `git`
leaves a 0-byte `.git/index.lock` after an index-refreshing command and a
`git`-status warning is printed. This is a bridge artifact — it clears normally
on the authoritative Mac (native `unlink`), and it is **not** a lock held by a
running git process. Two stray artifacts created while probing this limitation
(a 0-byte test file and the stale lock) were moved out of the working tree into
`.git/nok-trash/` (invisible to git). Run the validation below on the Mac, where
these limitations do not apply.

---

## 9. Local validation (authoritative — run on the Mac)

```bash
npm run supabase:reset
npm run supabase:test
npm run supabase:types
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit
npm audit --omit=dev
git diff --check
git status
```

The Mac remains authoritative. These commands were **not** run in this cloud
session (the mount's `node_modules` are macOS-native and the device shell runs in
a Linux VM, so the toolchain cannot execute here); no blocked validation is
claimed to have passed. Review the diff, run the suite, and only then commit.
