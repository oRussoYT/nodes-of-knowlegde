# Application Information Architecture

## Status

Product-design and architectural preparation for **M5 — Application UI /
Design System**. This document defines structure — routes, navigation,
hierarchy, and states — not implementation. Routes and pages marked
"future" or "planned" do not exist in the codebase; see
`docs/development-roadmap.md` for when each is actually scheduled, and
`docs/m5-application-ui-design-system.md` for exactly what M5 itself
builds. Nothing here should be read as already implemented.

## Four audiences, not two

Every screen in NetPDBFF belongs to one of four audiences. This document
uses the same four levels `docs/authentication-implementation.md`
introduced (its "Route-access matrix") and extends them structurally,
rather than redefining them:

1. **Public visitor** — no session. Sees only `Public` information per
   `docs/privacy-model.md`.
2. **Authenticated account** — a real Supabase Auth session exists
   (`auth.users`), fully implemented as of M4. This says nothing about
   *who* the person is — see `docs/decisions/0001-separate-people-from-user-accounts.md`.
3. **Linked NetPDBFF member** *(future)* — an authenticated account with
   an approved `user_person_links` row (`docs/database-schema.md`). Not
   implemented anywhere yet; M5 must not fabricate this state.
4. **Reviewer** — an authenticated account with an active row in
   `public.reviewers` (`docs/decisions/0009-reviewer-authorization-table.md`).
   **Built narrowly in M5.4**: authorization lives entirely in
   PostgreSQL, there is no general "Administrator" role and no
   role-management UI — a reviewer can review and decide identity
   claims, nothing else. The broader "Administrator" audience this
   section used to describe as fully future is now split: the identity-
   claim-review slice of it is real (see "Reviewer application
   structure" below); everything else administrative remains future,
   with no role or mechanism to support it yet (see "Future
   administration structure").

M5 built interface for audiences 1 and 2. M5.4 additionally built a
narrow slice of audience 4 (claim review only). It establishes visual and
structural *placeholders* consistent with audience 3 and the rest of
audience 4 (so later milestones don't require a redesign) without
implementing any gating, content, or workflow for them — this document is
explicit about which parts of the structure below are placeholder-only.

## Public application structure

| Route | Status | Purpose |
|---|---|---|
| `/` | Built (M1–M4); redesigned visually in M5 | Landing page |
| `/login` | Built (M4); redesigned visually in M5 | Sign in |
| `/register` | Built (M4); redesigned visually in M5 | Create an Auth account |
| `/forgot-password` | Built (M4); redesigned visually in M5 | Request a password reset |
| `/auth/confirm` | Built (M4), Route Handler, no UI | Token exchange |
| `/auth/error` | Built (M4); redesigned visually in M5 | Generic "link didn't work" |
| `/about` | **Not built.** Planned public route, structural placeholder only | Project/PDBFF context, in the platform's own voice — not part of M5's scope to write real content for; M5 may reserve the route in navigation without content |
| `/terms`, `/privacy` | **Not built.** Currently placeholder text inline on `/register` | Real legal documents — out of scope for M5 and every milestone until legal review; navigation should not link to routes that don't exist |

## Authenticated application structure

| Route | Status | Purpose |
|---|---|---|
| `/member` | Built (M4); redesigned visually in M5; identity-claim status added in M5.3 | Authenticated home; explicitly explains account-vs-person-record status, and — as of M5.3 — real claim status (no claim / pending / approved / rejected / withdrawn) |
| `/member/claim` | **Built in M5.3.** | Search/browse eligible `people` records and submit a claim — the real workflow `/member`'s claim entry point now links to |
| `/account` | Built (M4); redesigned visually in M5; identity-link status (read-only) added in M5.3 | Minimal Auth-account info, plus a read-only identity-link status section — no claim controls live here |
| `/update-password` | Built (M4); redesigned visually in M5 | Complete a password reset started by email |
| `/account/security` | **Not built.** Named as "coming soon" by both `/account` and `/update-password` today | Voluntary password/email changes while signed in — explicitly deferred past M5 too; M5 may reserve the navigational slot, not the page |

## Reviewer application structure

**Built in M5.4.** Nested under the existing authenticated shell (per
`docs/decisions/0006-static-shell-vs-dynamic-shell.md`'s distinction
between a new shell variant and an additional access gate within an
existing one) — not a separate shell or route group.

| Route | Status | Purpose |
|---|---|---|
| `/review/claims` | **Built in M5.4.** | Claim review queue — claims awaiting a decision (`submitted`/`under_review`), reviewer-authorized only |
| `/review/claims/[claimId]` | **Built in M5.4.** | Claim detail/evidence review, begin-review, and the approve/reject decision — reviewer-authorized only |

An authenticated-but-not-a-reviewer visitor sees a calm permission-denied
state in place of this content, never a redirect and never a claim's
existence disclosed one way or the other — see
`src/app/(protected)/review/layout.tsx`. Nothing beyond these two routes
exists: no bulk actions, no reviewer analytics, no general claim/person
administration.

## Future member structure (placeholder only)

None of the following exist yet. They are listed so M5's shells,
navigation, and dashboard reserve structurally sensible space for them
rather than requiring a later restructure. One item that used to be listed
here — the profile-claim flow — is no longer a placeholder: it was built
in M5.3 as `/member/claim`, per
`docs/decisions/0008-claim-discovery-security-definer-function.md` and
`docs/database-implementation.md`'s "What remains for M3.2" note on
person-record discovery, which this milestone directly resolves (narrowly,
via `SECURITY DEFINER` functions — not the full `profile_visibility_settings`
system that note also anticipated, which remains unbuilt).

Still entirely unbuilt:

- A person-record *view* (`people`, per `docs/database-schema.md`) — the
  future `/[person]` route (see "Route hierarchy" below). Claiming lets a
  claimant assert "this record is me"; it does not yet give anyone a page
  to look at that record on.
- Participation history (`pdbff_participations`, `participation_roles`),
  career/education history, institutional affiliations.
- Relationships/network view (`person_relationships`).
- Publications (`person_publications`).
- Claim *review* (moderator-side) — no longer a placeholder; built in
  M5.4 as `/review/claims` (see "Reviewer application structure" above).
  M5.3 built only the claimant-facing submission/status side.

## Future administration structure (placeholder only)

One item that used to be listed here — the claim-review queue — is no
longer a placeholder: it was built in M5.4 as `/review/claims`, per
`docs/decisions/0009-reviewer-authorization-table.md` (see "Reviewer
application structure" above). Everything else below remains entirely
unbuilt, and no general admin role or role-management mechanism exists
to support it:

- A nomination-review queue (`person_nominations`).
- A duplicate-resolution queue (`duplicate_candidates`).
- A verification-review console (`verification_reviews`).
- A moderation console (`moderation_actions`).
- Controlled-vocabulary management (`controlled_vocabulary_requests`).
- General user/role administration, bulk actions, and reviewer
  analytics — explicitly out of scope for M5.4; `public.reviewers`
  (docs/decisions/0009-reviewer-authorization-table.md) has no
  client-facing grant/revoke path at all, on purpose.

M5 does not build an `/admin` route or an admin shell variant. M5.4 added
one narrow, reviewer-gated slice nested inside the existing authenticated
shell (see "Reviewer application structure" above) — not a new shell
variant and not general role-based UI branching. Where the design system
needs to anticipate a third chrome variant (beyond public and
authenticated), it should note that possibility structurally (see
`AppShell` in `docs/design-system-architecture.md`) without building it.

## Primary navigation

**Public shell** (unauthenticated visitor, current `PublicHeader`
convention retained and formalized): site identity/home, Log in, Register.
`/about` reserved as a future addition once real content exists.

**Authenticated shell** (current `ProtectedNav` convention retained and
formalized): Member, Account, and — once it exists — a future Profile
entry point. The signed-in identity (currently just an email string) and
Log out move into a **user menu** (below) rather than sitting inline as
plain text, now that the design system has a real menu/dropdown
component. As of M5.4, a "Claim review" entry is additionally shown, but
only to an active reviewer — it is account-specific and session-dependent
the same way the email/logout entries are, so it is computed per-request
in `(protected)/layout.tsx` and passed down as a prop, not added to the
static `navigationConfig`. Its visibility is a UI convenience only, never
the authorization boundary — see "Reviewer application structure" above.

Primary navigation never includes a destination that doesn't resolve to a
real, built page — no dead links to `/about`, future member routes, or
admin routes until each is actually built.

## Secondary navigation

Not needed anywhere in M5's actual scope (both `/member` and `/account`
are single, shallow pages today). The pattern is defined now so it's ready
when `/account` grows a second page (`/account/security`): a simple
horizontal tab strip (the `Tabs` component) under the page header,
scoped to a single section of the app, distinct from primary navigation.
Secondary navigation is never more than one level deep.

## Breadcrumbs

Not needed anywhere in M5's actual route set — every current and
M5-planned page is one or two levels deep, and a page title already
communicates "where am I" at that depth. The `Breadcrumbs` component is
defined in the design system (see `docs/design-system-architecture.md`)
because future deep hierarchies will need it (e.g. an institution →
person → participation-period drill-down), but M5 ships the component
without using it in any route it controls, and should not add breadcrumbs
to `/member`, `/account`, or the auth pages just because the component
exists.

## User menu

**New in M5.** Replaces the current inline "email · Log out" text pattern
in `ProtectedNav` with a proper dismissible menu (trigger: avatar
placeholder or the account's email, per `docs/design-system-architecture.md`'s
`Avatar` component) containing: the signed-in email, links to Member and
Account, and Log out. Collapsing this into a menu is what makes room for
mobile navigation (below) and for the future addition of more account-area
links without the header growing unbounded. Fully keyboard-operable
(arrow-key item navigation, `Escape` to close, focus returned to the
trigger on close) — see accessibility requirements in
`docs/design-system-architecture.md`.

## Mobile navigation

**New in M5.** Below the navigation-collapse breakpoint (see
"Breakpoints" in `docs/design-system-architecture.md`), both the public
and authenticated headers collapse their link set into a single disclosure
trigger opening a `MobileNavigation` panel (a full-height drawer or
slide-down panel — exact treatment is a component-implementation
decision, not an architectural one). The panel surfaces the same links as
desktop primary navigation plus the user-menu contents when authenticated
— nothing available on desktop should be unreachable on mobile. The
trigger is a real, labeled control (`aria-expanded`, `aria-controls`), not
an unlabeled icon-only hamburger with no accessible name.

## Route hierarchy

```
/                              public, built
/login                         public, built
/register                      public, built
/forgot-password               public, built
/auth/confirm                  public, built (route handler, no UI)
/auth/error                    public, built
/about                         public, PLANNED (M5 may reserve nav slot only)

/member                        authenticated, built
  /member/claim                 authenticated, built (M5.3)
/account                       authenticated, built
  /account/security            authenticated, PLANNED (post-M5)
/update-password               authenticated, built

/[person]                      FUTURE — person profile (unclaimed/claimed), not scheduled before a later milestone
/[institution]                 FUTURE — institution page, not scheduled before a later milestone
/admin/*                       FUTURE — no admin role exists yet
```

## Page hierarchy

Every page in M5's scope follows the same structural pattern, formalized
as `PageHeader` + content region (see `docs/design-system-architecture.md`):

1. **Page header** — title, optional short description, optional primary
   action. No breadcrumb at this shallow depth (see above).
2. **Status/banner region** — where `FormMessage`-style banners
   (info/success/error), already established in M4, render — confirmation
   banners, expired-session notices, etc.
3. **Primary content region** — the form, the info list, or (for the
   dashboard) the dashboard cards.
4. **Secondary/contextual links** — e.g. "Don't have an account? Register"
   under the login form, already established in M4.

Detail pages for future domain entities (a person, an institution, a
publication) will need a richer pattern (header + tabs + content), which
is why `Tabs`, `SectionHeader`, and `Breadcrumbs` are defined now even
though M5 doesn't use all of them yet — see "Component-composition
principles" in `docs/design-system-architecture.md`.

## Dashboard hierarchy

M5 introduces a **member dashboard shell** at `/member`, replacing today's
single paragraph of explanatory text with a structured (but still
honest) layout. Per the milestone's explicit requirement, it must not
fabricate data that doesn't exist yet. Structure:

1. **Welcome/status header** — signed-in identity, account status
   (already shown today).
2. **"Your account" summary card** — the same minimal facts `/account`
   shows (email, confirmation status), surfaced here too as a real,
   currently-true summary — not a placeholder.
3. **Identity-claim status** — as of M5.3, a real state (see
   `src/features/identity/derive-status.ts`), not just explanatory text:
   no claim (the original "not yet connected" `EmptyState`, now with a
   real link to `/member/claim`), pending, approved, rejected, or
   withdrawn — the exact `profile_claims.status` vocabulary, never
   invented terms. Regardless of which state is shown, this remains the
   single most important constraint on this page: no participation
   summary, network preview, or publication count is ever shown, at any
   claim status — that's still a later milestone, represented, if at all,
   as a clearly labeled "not available yet" empty state, never a zero, a
   skeleton pretending to load real data, or a fabricated example.
4. **Quick links** — to Account and (once it exists) Account → Security.

## Empty, loading, error, and permission-denied states

Defined once, here, as states — not as one-off page copy — because every
current and future page needs a consistent version of each:

- **Empty.** Content that could exist but doesn't yet for this
  user/record (e.g. `/member`'s "not yet connected" state, a future
  "no participation history recorded" state). Uses the `EmptyState`
  component: a short, honest explanation and, where relevant, a next
  action. Never styled identically to an error.
- **Loading.** In-flight data fetches or Server Action submissions.
  `SubmitButton`'s pending state (already built in M4) is the pattern for
  form submission; `Skeleton` is the pattern for content that hasn't
  arrived yet on initial render. Never an unlabeled spinner with no
  accessible status text.
- **Error.** Something failed that the user might retry (`FormMessage`
  tone="error", already built) or that needs a dedicated page
  (`/auth/error`, already built). Error copy is specific about what
  happened where the underlying cause is safe to disclose, and generic
  where disclosing it would leak information (see
  `docs/authentication-implementation.md`, "Account-enumeration review" —
  M5's error-state conventions must not regress this).
- **Permission-denied.** Distinct from "error" — the request succeeded in
  the sense that the system understood it, but the visitor isn't allowed
  to see the result (e.g. a future attempt to view a private field, or a
  non-admin visiting an admin route once one exists). M5 doesn't have a
  real permission-denied scenario yet (route protection today is binary:
  redirect to `/login`, not "show a denied page"), but the visual pattern
  is defined now — a calm, specific explanation, never a bare "403" or a
  generic error page — so it's ready when partial-visibility content
  (per `docs/privacy-model.md`) starts rendering.

---

## M6.1 — Scientific Biography Foundation additions

**New route (built in M6.1):**

| Route | Status | Purpose |
|---|---|---|
| `/people/[personId]` | **Built in M6.1.** Authenticated. | The Scientific Biography read experience for one person — identity header, introductory narrative (or honest absence), provenance surface, and reserved section architecture. Authenticated authorized reading only; a public route is deferred with the public-record policy (M6.V/G1). |

This is a **protected** route (nested in the existing `(protected)` shell), so
the four audiences of "Four audiences, not two" are unchanged — no public or
new shell variant is introduced. The route is keyed by the person-entity UUID
and named generically (`/people/[personId]`), Node-neutral, per the Node
Independence discipline; it is not a PDBFF-specific "profile" route. The
`/[person]` future public route noted under "Route hierarchy" remains future
and distinct from this authenticated read route.

The page follows the standard page hierarchy (header + content region) and the
reserved-section pattern anticipates the later Timeline, Participation,
Scientific Contributions, Relationships, Historical Records, and Legacy
engines as honest "not yet recorded" states — never fabricated modules. Its
not-found state uses the calm, specific empty-state pattern defined under
"Empty, loading, error, and permission-denied states."

## M6.2 — Timeline Engine additions

**No new route.** M6.2 does not add a route; it fills the reserved Timeline
section *inside* the existing `/people/[personId]` biography with the real
Timeline Engine, replacing the M6.1 "will appear here" placeholder. The
timeline renders after the identity/narrative region as a calm, ordered
chronology: decade period groupings appear only when the record spans two or
more decades (otherwise a single ordered list), undated events collect into a
final "Date unknown" group, and each event carries a one-gesture provenance
disclosure — never an audit wall. An empty timeline is the same dignified
empty-state pattern used elsewhere, not an error. The engine is subject-
neutral by construction, so the later institution/project/station/expedition/
collection/record/species clocks reuse this pattern at their own routes as
they are built; the remaining reserved sections (Participation, Relationships,
Historical Records, Legacy) stay honest "not yet recorded" placeholders.

## M6.3 — Participation Engine additions

**No new route.** M6.3 does not add a route; it fills the reserved
Participation section *inside* the existing `/people/[personId]` biography with
the real Participation Engine, after the Timeline, replacing the M6.1 "will
appear here" placeholder. The reading flow becomes identity/narrative →
Timeline ("what happened, when") → Participation ("where and how did this
person belong"). Participation is grouped by **organization** (each a heading,
with the capacities and periods held there beneath it), which reads visibly
differently from the Timeline's decade grouping — the distinction between the
two engines is immediate on the page. Each belonging carries a one-gesture
provenance disclosure; an empty record is the same dignified empty-state
pattern used elsewhere. The remaining reserved sections (Contributions,
Relationships, Historical Records, Legacy) stay honest "not yet recorded"
placeholders. A dedicated organization (institution) read experience is
deferred with the Institution Engine.

## M6.4 — Relationship Engine additions

**No new route.** M6.4 does not add a route; it fills the reserved Relationships
section *inside* the existing `/people/[personId]` biography with the real
Relationship Engine, after Participation, replacing the M6.1 "will appear here"
placeholder. The reading flow becomes identity/narrative → Timeline ("what
happened, when") → Participation ("where and how did this person belong") →
Relationships ("who shaped this life, and whose lives did this person shape").
Relationships are grouped by the **counterpart's role** ("Mentors", "Students",
"Collaborators") — each a heading, with the counterpart's name, the period, an
optional curated narrative, and a one-gesture provenance disclosure beneath it.
Because the read model resolves each bond to the viewed person's perspective
(with inverse labels for directional kinds), the SAME canonical record appears
correctly on both people's pages without duplication. An empty state is a
dignified honest absence — never suggested, inferred, or fabricated
connections; no graph, avatars grid, follower counts, or social features. The
remaining reserved sections (Contributions, Historical Records, Legacy) stay
honest "not yet recorded" placeholders; other-entity relationships (person ↔
institution, ...) are deferred with the universal Entity/Institution engines.

## M6.5 — Institution Engine additions

**New route: `/institutions/[organizationId]`** (protected, authenticated
authorized reading only) — the first-class Institution page. Nested in the
existing `(protected)` shell, so the four audiences are unchanged; keyed by the
organization UUID and named generically (Node-neutral), the `organizations`
table is NOT renamed to match route copy. The reading flow: identity header
(canonical name, type, historical status, operating period, place, external-
identifier availability, provenance) → Introduction (+ Historical overview) →
Names → Historical timeline (the reused M6.2 Timeline, projecting canonical
Events) → People and participation (the SAME M6.3 Participation projected from
the institution's perspective, grouped by capacity with equal dignity) → honest
reserved Institutional-relationships / Scientific-contributions / Historical-
records surfaces → Significance → Legacy. Historical/closed/merged institutions
are readable (never hidden). **Discovery**: the person biography's Participation
links each organization name to its Institution page; a directory/search and a
public (unauthenticated) institution surface are deferred.

## M6.6 — Contribution Engine additions

M6.6 adds the dedicated Contribution reading surface and turns two reserved
placeholders into live projections (ADR-0016, `docs/m6.6-contribution-engine.md`).

- New route `/contributions/[contributionId]` — a first-class historical reading
  experience for a Contribution as a historical object (a scholarly object
  history / archival dossier, never a publication page, grant report,
  project card, impact dashboard, or leaderboard). Protected; Node-neutral
  generic route keyed by UUID; generic `<title>`. Reading flow: identity (title,
  kind, own temporal scope, place, provenance), overview + historical context,
  contributors by capacity, institutional context, related events (only when
  present), significance, legacy, and honest reserved Records / Consequences
  surfaces.
- `/people/[personId]` — the reserved "Scientific contributions" section is now
  the live `PersonContributions` projection (what this person helped make
  possible, in what capacity, when, with provenance; each links to its dedicated
  page). It is no longer a reserved section; the biography reserved architecture
  is now Historical records and Legacy.
- `/institutions/[organizationId]` — the reserved "Scientific contributions"
  section is now the live `InstitutionContributions` projection (the same
  canonical records from the institution's perspective). Institutional
  relationships and Historical records remain honest reserved surfaces.

All three surfaces project one canonical set of attributions, so they are
consistent by construction. Empty, collective, undated, and disputed states are
rendered honestly; contributions are never inferred from participation,
affiliation, or authorship, and are never shown as counts, rankings, or credit
shares.

## M7 — Knowledge Network routes

`/network` (landing), `/network/people/[personId]`, `/network/institutions/[organizationId]`, `/network/contributions/[contributionId]` — authenticated, reading-first one-hop neighbourhoods. "Network" is in the primary navigation, and each canonical Person/Institution/Contribution page links into its network neighbourhood.

## Production Experience Phase I — cross-navigation contract & Member role

An integration pass (between M7 and M8) refined how the completed engines read
as one product; it added no route and no schema change. Two IA points are now
fixed:

**One cross-navigation contract.** Every onward link on a canonical reading
surface (1) is justified by an explicit canonical assertion — never generic
"related content" and never inferred; (2) *is* the connected entity's name
(person, institution, or contribution), never a bare "View"/"Learn more"; (3)
carries its reason through the surrounding context (the relationship role group,
the participation capacity, the attribution capacity, the lineage relation);
(4) targets that entity's canonical reading page (`/people/[id]`,
`/institutions/[id]`, `/contributions/[id]`), with no UUID ever shown; and (5)
uses the one shared link treatment. This closed the two remaining dead ends
(relationship → person, institution participation → person) and matches the
directions already linked (participation → institution, contribution →
person/institution).

**Member and Account are secondary to reading.** They present authentication
status and person-record link state only — never a dashboard, never a second
Explore. The single reading doorway they offer is the correct one: an approved
claimant can follow "Read your linked record" to their own canonical Person
page. Obsolete copy describing claiming/participation/the network as future work
was corrected. See `docs/production-experience-phase-1.md`.

## M8.1 — Revelation (co-presence) reads inline; no new route

**No new route, no navigation entry.** M8.1 adds the co-presence revelation — the
**documented cohorts** a person belonged to — **inline** on the existing
`/people/[personId]` biography, after the person's own engines, through the shared
`ReadingSpine`. Revelation is infrastructure that enriches reading, a vantage that
opens within the reading; it is not a destination. There is no `/discovery` route,
no dashboard, and no visualization. Each cohort's institution and each member are
doorways back into the canonical record (`/institutions/[id]`, `/people/[id]`),
justified by explicit participation assertions, honouring the cross-navigation
contract above. The section states what it shows, holds an honest empty state
where nothing is revealed, and carries the honest "Limits of this view" note when
a cohort is revealed. See `docs/m8.1-co-presence-revelation.md` and
`docs/decisions/0018-revelation-engine.md`.

## M8.2 — Institution co-presence reads inline; no new route

**No new route, no navigation entry.** M8.2 adds the institution-surface
co-presence revelation — the **documented co-presence** within one institution —
**inline** on the existing `/institutions/[organizationId]` page, after its
Participation/Contributions engines, inside the same `ReadingSpine`. It is the
institution-vantage mirror of the person page's documented cohorts (M8.1). Each
participant and co-present person is a doorway to their own canonical page. It is
infrastructure that enriches reading, a vantage that opens within it — not a
destination: no discovery page, no dashboard, no visualization, no metric. It
states plainly that it shows a documented co-presence (a record that people were
here in the same years), not that they knew one another; and it marks its own
limits. See `docs/m8.2-institution-co-presence-revelation.md` and
`docs/decisions/0018-revelation-engine.md`.

## M8.3 — Lineage reads inline; no new route

**No new route, no navigation entry.** M8.3 adds the lineage revelation — the
documented succession/formation **descent** of an institution and the documented
**mentorship** descent of a person — **inline** on the existing institution and person
pages, after their prior engines, inside the same `ReadingSpine`. Each step reads
directionally ("X is a documented predecessor/mentor of Y"), and BOTH of its endpoints
are doorways to their own canonical pages. It is infrastructure that enriches reading, a
vantage that opens within it — not a destination: no discovery page, no dashboard, no
graph, no metric. It records what came before what / who mentored whom, states its
limits, and never claims transmission, a school, or causation. See
`docs/m8.3-lineage-institutional-evolution.md` and `docs/decisions/0018-revelation-engine.md`.

## M8.4 — Continuity & rupture reads inline; no new route

**No new route, no navigation entry.** M8.4 adds the continuity & rupture revelation —
the documented **coverage** of each participation capacity at an institution over time,
and the institution's own recorded status — **inline** on the existing institution page,
after the M8.3 descent, inside the same `ReadingSpine`. Each capacity's coverage reads as
its year-summarised spans and the silences between them, every span decomposable to its
participation records (each person a doorway). It is infrastructure that enriches reading,
a vantage that opens within it — not a destination: no discovery page, no dashboard, no
graph, no metric. It distinguishes four states and never collapses them — documented
continuation, documented rupture (the institution's terminal status), an evidentiary gap
(a silence, never an end), and an unknown outcome (a record that merely stops) — and
states its limits. See `docs/m8.4-continuity-rupture.md` and
`docs/decisions/0018-revelation-engine.md`.

## M8.5 — Recurrence reads inline; no new route

**No new route, no navigation entry.** M8.5 adds the documented-recurrence
revelation — the phenomena the record documents as having occurred more than once
for a person (a role held again at an institution, same-kind events, same-kind
contributions) or an institution (same-kind events and contributions) — **inline**
on the existing person and institution pages, after their prior revelation engines,
inside the same `ReadingSpine`. Each recurrence reads as a plain count ("Documented
N times as …") and a time-ordered list of occurrences, every occurrence decomposable
to its canonical record — a contribution occurrence is a doorway to its page, an
event carries its title, a role anchors its institution. It is infrastructure that
enriches reading, a vantage that opens within it — not a destination: no discovery
page, no dashboard, no graph, no metric. A count is a count of records, never a rank
or a measure of importance; occurrences are never ordered by count; a single
documented occurrence is not recurrence; unknown dates stay unknown. See
`docs/m8.5-recurrence.md` and `docs/decisions/0018-revelation-engine.md`.

## M8.6 — Bounded pathway reads inline; no new route

**No new route, no navigation entry, no console.** M8.6 adds the bounded-pathway
revelation — the documented chain of records linking this person to a SELECTED target
entity through intermediaries — **inline** on the existing person page, after the recurrence
engine, inside the same `ReadingSpine`. The target is chosen via a `?pathwayTo` query
parameter, set by a minimal "trace the documented chain to this person" doorway on people
already revealed on the page (there is no picker, candidate list, or discovery page — that
would be recommendation). With no target the lens shows a calm "choose an entity" state.
When a chain is found it reads as an ordered list of decomposable steps, each entity a
doorway, under the ENDPOINT RULE: "a documented chain of N steps connects A and B", never
"A is connected to B"; length is a fact, never a rank; a no-chain result is an honest
absence, never "not connected". It is infrastructure that enriches reading, a vantage that
opens within it — not a destination: no dashboard, no graph, no metric. See
`docs/m8.6-bounded-pathway.md` and `docs/decisions/0018-revelation-engine.md`.

## M8.7 — Consolidation and constitutional closure; the engine is complete

**No new route, no navigation entry, no new surface.** M8.7 adds no reading
destination. It closes the Revelation Engine: one production correction (a
deterministic tie-break for the bounded pathway, via a new append-only migration),
one fail-closed parser hardening (recurrence deduplicated by source id), two
consolidations behind the existing surfaces (single evidence-contract parsers; the
shared `RevealedProvenanceFooter`/`NodeDoorway` used by every lens), and one total
constitutional-closure test over the whole engine's copy. The information
architecture is unchanged — every revelation still reads inline on the person and
institution pages, after the canonical engines, through the shared `ReadingSpine`,
with no dashboard, console, or diagram. With M8.7 the reading surfaces the engine
contributes (co-presence, lineage, continuity & rupture, recurrence, bounded
pathway) are complete; comparison (C5) is deferred and interpretation is M9's.
