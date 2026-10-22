# Canonical User Journey

This document defines the canonical reading experience of Nodes of Knowledge
— the path a first-time reader takes from the landing page through the
People, Institutions, and Contributions of the record of science. It is the
reference experience the product is built around, and it should guide every
future milestone: new work earns its place by extending or deepening this
journey, not by sitting beside it.

Two things make this the *canonical* journey. First, it is expressed entirely
through the production application, using the completed engines and their
real read models — no developer knowledge, no UUIDs, no hidden URLs.
Second, it is honest: it shows provenance, verification, absence, and
disagreement as first-class parts of reading, never hiding them behind a
polished surface.

## The journey

1. **Landing (`/`).** The public entrance. It names what is inside — a
   reading record of scientific lives, the institutions they worked through,
   and the contributions they made — and invites the visitor in. Reading is
   authenticated (the deny-by-default security model is unchanged), so the
   entrance is honest that a free account is needed and offers to register or
   sign in. It stays quiet: no dashboard, statistics, or decorative product
   features.

2. **Explore (`/explore`).** After signing in, the reader arrives at the
   reading hub — the "lobby". Three doorways lead into the completed engines:
   People, Institutions, and Contributions. Explore is pure navigation; the
   directories do the reading.

3. **Directories (`/people`, `/institutions`, `/contributions`).** Each lists
   records **by name**, most-legible first, with honest verification badges
   and — when a directory has nothing yet — an honest empty state. Records are
   reached by their human-readable name; a UUID never appears as visible text.
   These directories are backed by the bounded `list_people` /
   `list_organizations` / `list_contributions` read models and are the only
   place general browsing lives.

4. **A scientific life (`/people/[id]`).** Opening a person reveals the
   Scientific Biography and the reader's main path outward: the Biography
   (with its provenance and verification, or an honest absence where no
   narrative exists), the Timeline (exact through unknown dates, shown
   truthfully), Participation in institutions (each institution a doorway to its page), and
   Relationships to other people (directional and symmetric, verified through
   disputed) — each counterpart a doorway to that person's own canonical page.

5. **An institution through time (`/institutions/[id]`).** Opening an
   institution reveals its identity and name history, its founding period,
   external identifiers, narrative facets, its timeline, the people who
   participated in it (each a doorway to that person's page), its documented
   institutional relationships read inline (predecessor/successor, parent,
   affiliation, and the like — never a graph, never an "enter the network"
   step), and the contributions associated with it — including historical and
   closed institutions, shown with honest reserved states where later facets
   are not yet recorded.

6. **A contribution (`/contributions/[id]`).** Opening a contribution reveals
   it as a first-class historical object: the people and institutions
   credited with it, each in their own capacity, with no rankings,
   percentages, or inferred credit.

7. **Following curiosity.** From any of these, the reader follows the
   connections — a person to their institution, a person to another person
   through a documented relationship, an institution to any of its
   participants, a contribution to everyone credited — and the same canonical
   records reappear from new angles without ever being duplicated. Every onward
   path arises from an explicit canonical assertion; there is no generic
   "related content". Navigation rewards curiosity; historical exploration
   feels natural.

Throughout, the application's chrome (the authenticated navigation) keeps
Explore, People, Institutions, and Contributions one click away on every
page, so the reader is never stranded.

## Governing rules

These rules follow from making the production application the canonical
product:

- **Production is the canonical product.** The reading experience above is
  the primary way to experience Nodes of Knowledge. Functionality that
  belongs in the normal user experience must exist **only** in production.

- **Production first, for every future engine.** Every future engine (M7
  onward) must first integrate into the production application — its reading
  surfaces and its place in this journey and the navigation — **before** it
  receives any representation in the developer inspection environment. A
  capability never debuts in the exhibition.

- **The exhibition inspects; it never duplicates.** `/dev/exhibition` is a
  deterministic developer inspection environment (see
  `docs/m6-system-exhibition.md`). It exists only to inspect deterministic
  examples, edge cases, reviewer demonstrations, architectural concepts, and
  fictional showcase data. It must never re-create a production browse or any
  other production capability.

- **Truthful representation.** The application should represent its current
  capabilities honestly: where a capability exists, expose it; where it does
  not, show an honest planned/empty state rather than a fabricated one.

## The Knowledge Network is invisible infrastructure (ADR-0017)

The Knowledge Network is not a destination and has no step of its own in this
journey. A reader never "enters the network". Documented connections are read
**inline** on the canonical pages — a person's timeline, participation,
relationships, and contributions; an institution's participants, lineage, and
contributions; a contribution's contributors and institutional context — and
each is a doorway to another canonical record. The network read models simply
make those doorways possible.

## Production Experience Phase I — one continuous reading world

Landing → Register / Sign in → Explore → People / Institutions / Contributions →
a canonical record → its documented connections read inline → a doorway to
another canonical record → continued reading. Every doorway states what the
connected record is and why it is connected, and arises from an explicit
canonical assertion. The doorways this phase completed: **relationship →
person**, **institution participation → person**, and **approved claim → the
reader's own canonical Person page**. The Member and Account areas are
deliberately secondary to reading. See `docs/production-experience-phase-1.md`
and `docs/production-experience-phase-1-engineering-report.md`.

## M8.1 — Revelation (co-presence) deepens the reading, without a new step

The eighth milestone **reveals** what the preserved, connected record already
demonstrates, and it does so **within** the canonical journey, never beside it. A
reader opening a scientific life (`/people/[id]`) now finds, after the person's
own engines, the **documented cohorts** that life belonged to — other people the
record places at the same institution during overlapping years — each a doorway
onward to that person's page and to the shared institution. The reader never
"enters discovery"; the biography simply grows a further vantage, composed from
the same participation assertions and decomposable back to them. It is offered,
not injected; it states plainly that it shows a documented co-presence (a record
that people were there in the same years) and not that they knew one another; and
it marks its own limits. This is revelation as the M8 Design Bible intends it: a
reading, not a reckoning — the interpretation of what a cohort meant is left to
the reader and to M9. See `docs/m8.1-co-presence-revelation.md`.

## M8.2 — Revelation (institution co-presence) deepens institution reading, without a new step

The institution page now grows a further vantage, within the canonical journey and
never beside it. A reader opening an institution (`/institutions/[id]`) finds, after
its people and contributions, the **documented co-presence** the record holds — which
participants it places there at the same time as which others — each a doorway onward
to that person's page. The reader never "enters discovery"; the institution simply
grows a further vantage, composed from the same participation assertions M8.1 composes
from the person's side, and decomposable back to them. It is offered, not injected; it
states plainly that it shows a documented co-presence (a record that people were here
in the same years) and not that they knew one another; and it marks its limits. This is
the institution-vantage mirror of M8.1 — a reading, not a reckoning; the interpretation
of what a co-presence meant is left to the reader and to M9. See
`docs/m8.2-institution-co-presence-revelation.md`.

## M8.3 — Revelation (lineage) deepens institution and person reading, without a new step

The institution and person pages each grow a further vantage, within the canonical
journey and never beside it. Opening an institution, a reader now finds — after its
people, contributions, and documented co-presence — its **documented institutional
descent**: the succession and formation records that place it after some institutions
and before others, each a doorway onward. Opening a person, a reader finds — after their
relationships, contributions, and cohorts — their **documented mentorship lineage**: the
mentors the record places before them and the students it places after them, each a
doorway onward. The reader never "enters discovery"; the page simply grows a further
vantage, composed from the same explicit directional records M7 connects one hop at a
time, and decomposable back to them. It records what followed what — never what followed
from what, which it leaves to the reader and to M9. See
`docs/m8.3-lineage-institutional-evolution.md`.

## M8.4 — Revelation (continuity & rupture) deepens institution reading, without a new step

The institution page grows one further vantage, within the canonical journey and never
beside it. Opening an institution, a reader now finds — after its people, contributions,
documented co-presence, and documented descent — its **documented continuity and
rupture**: for each capacity people were recorded in, the years the record covers and the
silences between them, and the institution's own recorded status. A span that runs to an
open-ended record reads as still current; a break between spans is shown as a gap in the
record, never as an ending; where the record simply stops, the reader is told plainly
that what followed is not documented — not that it ended; and where the institution's own
record says it closed, merged, or was succeeded, that is shown as its own explicit status,
never used to date the end of any one capacity. The reader never "enters discovery"; the
page simply grows a further vantage, composed from the same dated participation records
and decomposable back to them. It records what the record covers — never why it continued
or ceased, which it leaves to the reader and to M9. See `docs/m8.4-continuity-rupture.md`.

## M8.5 — Revelation (documented recurrence) deepens person and institution reading, without a new step

The person and institution pages each grow one further vantage, within the canonical
journey and never beside it. Opening a person, a reader now finds — after their
cohorts and mentorship lineage — the phenomena documented to have RECURRED for them:
the same role held again at the same institution, events of the same kind,
contributions of the same kind, each shown with how many documented times and when,
each occurrence a doorway back into the record. Opening an institution, a reader
finds — after its documented continuity — the same-kind events and contributions the
record documents more than once. The reader never "enters discovery"; the page
simply grows a further vantage, composed from the same explicit records and
decomposable back to them. It answers "what has happened repeatedly?" — never "what
seems similar?"; a count is a count of records, never a rank or a measure of
standing, and a single documented occurrence is not recurrence. It reveals THAT the
record documents a repetition, and how many times, leaving what it means to the
reader and to M9. See `docs/m8.5-recurrence.md`.

## M8.6 — Revelation (bounded pathway) completes the reading, without a new step

The person page grows one last vantage, within the canonical journey and never beside it,
and only when the reader asks for it. Reading a life, a reader can choose another entity
already revealed on the page — a co-present person, for instance — and ask what documented
records link the two. The bounded pathway answers with the shortest documented chain of two
or more recorded steps that connects them through intermediaries (an institution they both
worked at, a person who mentored a third, a contribution they both touched), each step a
doorway onward and decomposable to its record. The reader never "enters discovery"; the
page simply traces a chain the record already holds, and only when a second entity is
chosen. It is governed by the endpoint rule: a chain of steps is shown as exactly that — "a
documented chain of N steps connects A and B" — never as a connection between the two, and a
longer chain is given more reserve, not more weight. Where no chain of up to four steps
exists, the honest reading is that the record documents none within that reach, never that
the two are unconnected. It reveals THAT the record composes a chain, and which steps —
leaving what the chain MEANS to the reader and to M9. With this, M8 reveals every documented
collective pattern the specification named, and infers, ranks, and interprets nothing. See
`docs/m8.6-bounded-pathway.md`.

## M8.7 — Consolidation and constitutional closure; the reading is whole

M8.7 adds no new step to the journey and no new vantage. It closes the Revelation
Engine: it makes the bounded pathway's chosen chain deterministic (so the same
record always yields the same decomposable chain), guarantees a duplicated record
can never fabricate a recurrence, unifies the evidence-disclosure the reader
gestures toward so it is identical across every lens, and proves — with one total
sweep of the engine's whole reader-facing surface — that the reading never crosses
from revealing into ranking, similarity, recommendation, or asserting a connection
between a chain's ends. The reader's experience is unchanged and now provably
whole: every documented pattern the specification named is revealed, and nothing
is inferred, ranked, or interpreted. What a pattern *means* remains the reader's
question, and M9's.
