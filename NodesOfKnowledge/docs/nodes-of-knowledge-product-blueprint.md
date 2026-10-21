> **Nodes of Knowledge**
>
> # The Product Blueprint
>
> ### First Constitutional Edition
>
> **Version 1.1**
>
> *The bridge between the Design Bible and the built platform — Product Architecture, not software architecture.*

---

> *Nodes of Knowledge preserves not only scientific information,*
> *but the history of how scientific knowledge is created.*

---

## How to read this blueprint

This document has one job: to translate *The Nodes of Knowledge Design Bible,
Volume I* into Product Architecture — the definitive conceptual blueprint from
which every remaining implementation milestone should emerge almost mechanically.
It sits deliberately between two kinds of document it is not. It is not the Design
Bible, which says *why* the platform exists and is now constitutional law; and it
is not an engineering specification, which will say *how* the software is built in
a particular framework in a particular year. This is the middle layer: *what the
product is,* described so precisely that the engineering becomes a matter of
execution rather than invention, and so faithfully that no engineer, designer, or
institution reading it could mistake the platform for the ordinary software it
must never become.

A note on discipline, stated once and binding throughout. This blueprint defines
no database tables, no API, no route, no component, no migration, no schema. Where
it must name a concept that will one day have an implementation — an *assertion,*
a *participation,* a *verification state* — it names the concept and stops at the
concept, leaving the mechanism to the milestone that builds it. When this document
appears to constrain engineering, it is constraining *product behaviour;* the
engineering means to achieve that behaviour remain the engineers' to choose. The
test the authors held themselves to: describe the product so clearly that
implementation is nearly mechanical, while leaving every genuinely technical
decision open.

The Design Bible is treated here as settled. Its seventeen principles are not
reopened, softened, reframed, or traded for a tidier framework. They are assumed,
cited, and *implemented conceptually.* Where this blueprint adds structure the
Bible did not — the product primitives, the engines, the capability roadmap — that
structure is scaffolding *for* the constitution, never an amendment to it. If a
reader ever finds this document in tension with Volume I, Volume I governs, and
this document is the thing to correct.

The method is uniform and worth stating up front, because it recurs. For each
major principle of the Design Bible, the blueprint answers six questions, and only
these six:

1. **How does this become software — conceptually, not technically?**
2. **What are the primary user experiences?**
3. **What are the secondary user experiences?**
4. **What information must exist for this to be true?**
5. **What information can arrive later without breaking it?**
6. **What must absolutely never exist?**

The sixth question matters as much as the first. A platform is defined as much by
its refusals as by its features, and this one has more consequential refusals than
most. Throughout, the *negative space* — what must not be built — is treated as
load-bearing architecture, not as a caveat.

Finally, the horizon discipline the Bible itself insisted on carries into every
page here. This blueprint describes the platform Nodes of Knowledge is *becoming,*
across many Nodes and many capabilities. Today one Node exists as running
software, deliberately. Describing the whole is the right work for a constitutional
document; building the whole ahead of real, concrete need is the wrong work for any
milestone. Read the capabilities as a map of the territory, and build them only in
the order, and at the moment, that a real need makes them concrete.

---

# Part I — The Product Primitives

## The constitutional grammar

Most software is designed in *pages* — a profile page, a search page, a settings
page — and its concepts are discovered afterward, by noticing what the pages happen
to need. Nodes of Knowledge must be designed the other way around. Pages are
temporary; the framework of 2026 will be gone long before the record is. What
endures is a small set of **product primitives** — the permanent conceptual
building blocks from which every page, every Node, and every future capability is
composed. Get the primitives right and the pages almost design themselves, in this
generation of software and the next. Get them wrong and no amount of beautiful
interface will save the record.

This part defines that grammar. The primitives are few on purpose. Each is
defined by what it *means* in the product, not by how it is stored, and each earns
its place by being something the Design Bible cannot be honoured without. The
examples the brief offered — Entity, Assertion, Event, Participation, Relationship,
Narrative, Provenance, Institution, Node — are all here, refined, with a few
additions the Bible makes necessary. Together they form a language: a sentence in
the platform is an *entity* about which an *assertion* is made, carrying its
*provenance* and its *verification state* and its *visibility,* placed in time as
an *event,* given meaning by *narrative* and support by *evidence,* and read along
a *timeline* within a *Node* that will *steward* it after its subject is gone.

### The three atoms: Entity, Assertion, Provenance

Three primitives sit beneath all the others. If this blueprint has a single
intellectual claim, it is that these three, taken together, *are* the trusted
record — and that everything else is their elaboration.

**Entity.** An entity is any subject that can hold a story. A person is an entity.
So is an institution, a project, a field station, a species, a publication, a
collection, an expedition, and — this is the reach of "every object has a story" —
a photograph, a map, a letter, an oral history. Entities are the nouns of the
platform. The constitutional move, made once here and relied on everywhere, is that
**there is no privileged class of "real" entities and secondary class of
"attributes."** A photograph is not a decoration on a person's page; it is an
entity with its own story, its own timeline, its own evidence, that happens to
connect to that person. Some entities will be richly developed and some will be a
single line, but the *kind* of thing they are is the same, and any of them can
become the subject the reader is reading. This single decision is what makes the
platform a fabric enterable from any thread rather than a set of profile pages with
media attached.

**Assertion.** An assertion is the atomic unit of the record: one claim, about one
entity or between two, that could in principle be true or false, right or wrong,
confirmed or disputed. "This person held this role at this station from 1982"
is an assertion. "These two people collaborated" is an assertion. "This
photograph shows this expedition" is an assertion. Even a person's name is,
underneath, an assertion. The reason to name this primitive at all — the reason it
is the keystone of the grammar — is that **nothing in Nodes of Knowledge is ever a
free-floating fact.** Everything shown is an assertion, and an assertion is
meaningless without the two things it must always carry: where it came from, and
how far it has been trusted. A platform that let facts exist without those two
things would be a database of claims pretending to be a record of truth, which is
precisely the failure the Bible exists to prevent.

**Provenance.** Provenance is not a separate object so much as the *mandatory
envelope* every assertion travels in. It answers, for any claim in the system: who
submitted it, and when; whether it came from the person it concerns, from a third
party, from a document, from an inference, or from a bulk import; what evidence
supports it; whether anyone with authority has reviewed it; and, if it was ever
corrected, what it said before. Provenance is the record's claim to be believed —
the apparatus of a critical edition, not the fine print of a marketing page. The
constitutional rule is absolute: **an assertion may never exist without its
provenance.** There is no path, anywhere in the product, by which a claim enters
the record stripped of where it came from. This is the software form of Design
Principle 7, and it is non-negotiable because it is the whole difference between
this platform and the feeds it replaces.

### The facets every assertion carries

Provenance travels with three further facets, each a primitive concept in its own
right because each encodes a specific constitutional principle. They are described
as *facets* rather than *atoms* because they never appear alone — they are always
qualities *of* an assertion.

**Verification State.** Where an assertion stands in its journey from claim to
trusted fact: *unreviewed,* the honest default for most historical data;
*supported,* when evidence exists or a party has responded; *confirmed,* the only
state that reads as settled, reachable only through an actual confirming act;
*disputed,* a legitimate and retained state, never a failure; *rejected,* kept for
history rather than deleted. Verification is a lifecycle, and the product must
carry every assertion's position in it, visibly. This is where "inference is never
promoted to confirmation" lives: the state changes only through the defined path,
never by a system's confidence alone.

**Origin.** *How* an assertion came to be known — declared by the subject,
submitted by another, drawn from a document, inferred by the system, imported in
bulk. Origin is descriptive and fixed at creation; it is not a workflow. It exists
as a distinct facet because the Bible's tenth principle demands it: *how a thing
was known* and *whether it is verified* are two axes that must never collapse into
one. A machine-inferred claim and a self-declared claim can both be unverified;
strong documentary origin does not by itself mean confirmed.

**Confidence.** An advisory, optional strength — low, medium, high — describing how
good the supporting evidence is, curated by whoever assesses it. It is deliberately
*not* a verification mechanism: high confidence never promotes an assertion to
confirmed, and a confirmed assertion can rest on low confidence if the confirming
act was genuinely performed. Confidence informs a reader's judgment; it does not
substitute for the human act of confirmation.

**Visibility & Consent.** The facet governing who may see an assertion: public,
registered community, administrators, or the subject alone. Its constitutional
default is *restrictive* — an assertion about an unregistered person is never
public by accident — and it changes only by the subject's deliberate choice or an
accountable, recorded decision. Visibility is a property of the assertion, not only
of the whole biography, because different facts about one life legitimately carry
different sensitivities. This is Design Principle 8 made structural.

### The primitives of time, people, and connection

**Event.** An assertion with a time: a dated or datable occurrence involving one or
more entities — a founding, an arrival, an expedition, a publication, a return, a
retirement, a death. The event is the atom of the timeline, and it carries not just
a date but a *temporal precision* — exact, approximate, a range, open-ended, or
frankly unknown — because in this domain the shape of a date is itself information.
An event is the natural junction of the fabric: it binds the people who were there,
the place it happened, the project it belonged to, and the evidence that records
it.

**Participation.** The primitive of institutional memory at human scale: a bounded
involvement of a person with an institution, project, or place, across a span of
time, expressed through one or more roles, and — this is essential and
constitutional — *never* reducible to a single date range or a single role. A
person may have many participations, with gaps and returns; a single participation
may hold concurrent roles. Participation is how a life is woven into an
institution's memory, and its irregular real shape is content to be preserved, not
mess to be tidied.

**Role.** The character in which a person participated — researcher, field
assistant, *mateiro,* technician, director, student, volunteer, community
collaborator, and every other. Role is a primitive because the Bible's sixth
principle depends on it: roles are drawn from a curated, extensible vocabulary, and
they carry *equal dignity* by construction, never an encoded hierarchy of persons.

**Relationship.** A narrative connection between two entities — most often two
people, but also a person and an institution, or a person and a project — carrying
origin, context, duration, evidence, meaning, and its own verification state. A
relationship is a primitive precisely so that it can never be reduced to a bare
edge in a graph. It is a small story with a shape, and the product treats it as
one.

### The primitives of meaning, evidence, and continuity

**Narrative.** Human-authored prose bound to an entity or an event, giving meaning
to structured facts. Narrative is the warm centre of a biography and the voice of
an institution's page. It is named as a primitive to protect two rules: that
narrative is a first-class part of the record, not an afterthought to the
structured data; and that narrative is *authored by people,* never fabricated by
the system to fill a frame. Where narrative is absent, the product holds the space
honestly and lets structured facts carry the story until a human writes the prose.

**Evidence / Historical Record.** An archival object — a photograph, a letter, a
roster, a map, a recording, a publication — that supports assertions and is itself
an entity with a story and a provenance of its own. Evidence is what turns a claim
into something a reader can weigh. The product's stance, following the Bible's
choice of *Historical Records* over *media,* is that these are not files decorating
pages; they are the documentary base of the whole record, treated with archival
seriousness.

**Timeline.** Not a stored thing but a *projection:* the ordered assembly of all
events touching an entity, or many entities at once, into the temporal spine along
which the record is read. The timeline is named as a primitive because it is the
platform's central organising act — the lens through which biographies,
institutions, and projects all become legible — even though it holds no facts of
its own that the events do not already carry.

**Node / Institution.** An institution's sovereign instance of the platform,
which is two things at once: an *entity* with its own biography, timeline,
relationships, and legacy; and the *governing container* of a body of memory —
the people, participations, projects, and records it owns and presents under its
own identity. The Node is where the platform's whole architecture of many
connected-but-autonomous institutions ultimately rests, and it is named as a
primitive so that "connect institutions without replacing them" has a first-class
concept to attach to.

**Legacy / Stewardship.** The primitive of continuity — the state and the ongoing
act by which an entity's record is tended beyond the participation, and beyond the
life, of its subject. Stewardship is what lets a biography be completed and kept
true after the person can no longer keep it themselves, most often by the
institution whose memory they were part of. It is a primitive, not a feature,
because Design Principle 14 makes it the very thing that distinguishes this
platform from every system built around the active user, and a platform cannot
distinguish itself by an afterthought.

### How everything composes from these

The point of naming these primitives is that the rest of the architecture *emerges*
from them rather than being invented page by page. A Scientific Biography is not a
bespoke design; it is a *reading* of one person-entity — their participations,
relationships, events, narrative, and evidence — projected along a timeline and
governed by visibility. An Institution Page is the same reading of a Node-entity.
A project, a station, a species, an expedition each gets a page by the identical
logic, because each is an entity and the grammar does not privilege one kind over
another. "Every object has a story" is not a slogan bolted on; it is the direct
consequence of making *entity* a single primitive with no second-class members.
When a future milestone asks "how do we build the page for X," the answer is
already given: X is an entity; assemble its assertions, project its events, honour
its provenance and visibility, and let a human write its narrative. The pages are
downstream of the grammar, which is why the grammar, and not the pages, is the
thing this document spends its first and most careful part defining.

> **Primitive Principle** — Design the platform from a small permanent grammar of
> primitives — entities described by provenance-bearing, verifiable, visibility-
> governed assertions, placed in time, given meaning by narrative and evidence,
> read along timelines, governed by Nodes, and carried forward by stewardship — and
> let every page, Node, and capability emerge from that grammar rather than the
> reverse.

### On the status of Participation — the primitive of belonging

A refinement of the grammar, prompted by a fair architectural question: given how
often participation recurs — people participate, but so do institutions in
collaborations, projects in programmes, collections in expeditions, expeditions in
an institution's history, and species in the studies built around them — does
Participation deserve to stand among the foundational primitives, alongside Entity,
Assertion, and Provenance?

The answer is yes, with a precision that makes the grammar stronger rather than
merely longer. The precision is this: the primitives sit on two distinct planes,
and Participation is foundational on one of them but not the other.

Entity, Assertion, and Provenance are the primitives of the *epistemic* plane — the
plane that answers *what is claimed, and how far can it be trusted.* They define the
trustworthiness of the record, and nothing joins them there, because Participation
does not answer their question: a participation is not a different kind of trust; it
is a thing that is asserted and trusted like anything else. To place Participation
among the epistemic atoms would blur the one distinction that makes the record
honest — the distinction between *a claim* and *what the claim is about.*

Participation is instead the foundational primitive of the *structural* plane — the
plane that answers *how do entities compose into histories.* On that plane it is not
one connective primitive among several; it is the primary one. It is the mechanism
by which any entity enters institutional memory: the bounded, capacity-qualified,
time-shaped belonging of an entity to something larger than itself. That is why it
recurs everywhere the questioner observed it does — not because the word is loosely
used, but because belonging-in-time is genuinely the shape through which histories
are made, and preserving how histories are made is the platform's whole purpose. A
grammar built to preserve history needs a named primitive for the act of taking
part in it, and Participation is that primitive.

Recognising this has real architectural consequences, and they are refinements of
the existing grammar rather than departures from it.

First, Participation generalises beyond the person. Its earlier definition in this
part — a person's involvement with an institution, project, or place — is the most
common instance, not the whole of it. In its general form, Participation is *any
entity's bounded, capacity-qualified involvement in a larger context or event across
time*: an institution participating in a founding collaboration, a project
participating in a research programme, a collection participating in an expedition, a
species participating in the studies that orbit it. Role, correspondingly,
generalises to *capacity* — the character in which an entity took part — while
remaining, for people, exactly the role vocabulary that carries equal dignity.

Second, the Participation Engine (Capability 3) is therefore broader than a career
engine. It is the general engine of belonging-over-time, through which the
institutional collaborations, the project lineages, and the expedition histories all
flow — built out, as ever, only as real needs make them concrete, never ahead of
them.

Third, the boundary between Participation and Relationship is sharpened rather than
blurred. A Relationship is a narrative bond *between two entities* — mentorship,
collaboration, field partnership. A Participation is an entity's belonging *to a
larger context* — an institution, a project, an expedition, an event. Keeping the
two distinct is what prevents institutional memory from collapsing into a generic
graph of edges: belonging and bond are different shapes, and the platform needs
both, named separately.

And fourth, none of this disturbs the epistemic atoms. Every participation is,
underneath, expressed as assertions carrying provenance and a verification state —
which is precisely why naming Participation a foundational structural primitive costs
the grammar nothing. It does not compete with Entity, Assertion, and Provenance; it
composes from them, on a different plane. The grammar gains a clearly named
structural keystone and keeps its epistemic core exactly as elegant as before.

**The semantic boundary of Participation** (constitutional clarification CC1, ratified
at M6.V). To keep the structural primitive precise, its boundary is made explicit.
Participation represents an entity's bounded, capacity-qualified *belonging or
inclusion* within a larger context across time — and only that. It must **not** be
used to represent:

- production,
- authorship,
- causation,
- ownership,
- object-of-study, or
- the representation of one entity by another.

Those meanings belong to Relationships, Events, Assertions, or another appropriate
primitive — never to Participation. The distinction in practice:

- A person participating in PDBFF — **Participation.**
- An institution participating in a collaboration — **Participation.**
- A project belonging to a wider programme — **Participation.**
- A collection produced by an expedition — **not** Participation; this is a production
  Relationship or Event.
- A species studied by a project — **not** Participation; this is an object-of-study
  Relationship.

This clarification narrows what Participation *means* without diminishing what it
*is.* It remains the foundational structural primitive of the platform — the primary
shape through which entities enter institutional memory — now with a semantic boundary
that prevents it from absorbing relations of production, authorship, causation,
ownership, study, or representation, each of which has its own proper primitive.

> **Structural Primitive Principle** — Participation is the foundational primitive of
> the structural plane — any entity's bounded, capacity-qualified belonging to a
> larger context across time — and it earns that standing without joining the
> epistemic atoms of Entity, Assertion, and Provenance, because belonging is how
> histories are composed, while those three remain how every claim is trusted.

### Node Independence — the architecture is universal

One principle has been implicit in every part of this grammar and is fundamental
enough to the long-term vision to be made explicit: the architecture of Nodes of
Knowledge must be *universal.* Every primitive, every engine, and every capability
must be designed so that any future Node can adopt the platform without requiring a
change to the underlying product architecture.

The Nodes that might one day exist are deliberately unalike — PDBFF, Cocha Cashu
Biological Station, Instituto Mamirauá, Instituto Juruá, the Smithsonian Tropical
Research Institute, INPA, the Museu Paraense Emílio Goeldi, Harvard, McGill, the
American Museum of Natural History, and institutions we cannot yet anticipate. A
century-and-a-half-old museum, a remote biological station, a community-based
conservation institute, and a global research university are not the same kind of
thing, and the architecture must never assume they are. What makes them all Nodes is
not that they resemble one another but that a single grammar of primitives can hold
any of their histories.

The discipline is a bright line between what varies per Node and what never does. A
Node differs from every other Node in exactly five dimensions, and only these:

- its **history** — the events, participations, and lives it has accumulated;
- its **data** — the specific record it owns and governs;
- its **visual identity** — its brand, wordmark, imagery, and the character of its
  presentation;
- its **governance** — who administers, reviews, stewards, and decides within it; and
- its **institutional culture** — its vocabulary, its emphases, and the norms and
  language by which it understands its own work.

Everything else — the primitives, the engines, the capabilities, the honesty
disciplines, the reading experience, the librarian's boundary — is *universal:*
shared identically across every Node, and never forked or special-cased for one
institution. When a new Node is adopted, the work is the configuration of those five
dimensions on top of an unchanged architecture; it is never a modification of the
architecture to accommodate the institution. If adopting a Node ever appeared to
require altering a primitive or an engine, that would be a signal that the primitive
or engine had a hidden institutional assumption baked into it — a defect to be
removed, not a change to be made. Node Independence thus doubles as a design test:
any capability that could not be adopted unchanged by a museum, a field station, an
institute, and a university alike is not yet finished.

And here the horizon discipline must be restated, because Node Independence is the
principle most easily misread as a mandate. Designing the architecture to be
universal is *not* the same as building the machinery of many Nodes now. No
multi-tenancy, no institution tables, no cross-Node federation is authorised by this
principle; those become real work only when a real second Node makes their
requirements concrete. The way Node Independence is honoured today, with exactly one
Node in existence, is by keeping the generic core free of any assumption specific to
PDBFF — naming and shaping every reusable thing for what it generically is, never for
the first institution that happens to use it. The architecture is kept universal from
the first Node onward; the machinery of many Nodes is built when, and only when, a
genuine second Node makes it concrete.

> **Node Independence Principle** — Design every primitive, engine, and capability to
> be universal, so that any Node — a century-old museum, a remote field station, a
> community institute, a global university, or an institution not yet imagined — can
> adopt the platform unchanged, differing only in its history, data, visual identity,
> governance, and institutional culture; keep the architecture free of every
> institutional assumption from the first Node onward, without building multi-Node
> machinery before a real second Node makes it concrete.

---

# Part II — The Constitutional Translation

This part takes the Design Bible principle by principle and puts each through the
six-question lens. It is the connective tissue of the blueprint: the place where a
constitutional sentence becomes a set of product commitments. The engines and
experiences designed in later parts are the elaboration of what is decided here.

The principles are grouped by the constitutional themes the brief named, rather
than marched through one by one, because several principles act together and
are best translated together. Each treatment answers, in order: how it becomes
software conceptually; the primary experiences; the secondary experiences; what
information must exist; what may arrive later; and what must never exist.

One principle stands apart from this translation by its nature. The seventeenth — the
benchmarking discipline — describes how the platform is *designed* rather than what it
*is*, and so it does not resolve into product commitments through the six-question lens;
its translation into operational method is given its own treatment in Part XIV.

---

## 2.1 The trusted record (Principles 1, 2, 7)

**How it becomes software, conceptually.** The record becomes a body of
*assertions,* each carrying provenance and a verification state, and the product
becomes, at bottom, an instrument for *reading assertions honestly.* Every fact a
reader sees is presented together with — or one gesture away from — where it came
from and how far it is trusted. "Preserving the history of how knowledge was made"
becomes the commitment that events, participations, and relationships are kept
alongside the conclusions, not discarded once a publication exists. The trusted
record is not a feature of the platform; it is the substance the platform is a lens
onto.

**Primary experiences.** Reading a fact and being able to ask, without friction,
"how do we know this?" — and getting an honest answer: a source, a date, a
submitter, an evidence trail, a verification state. Encountering uncertainty and
finding it marked rather than hidden.

**Secondary experiences.** Following provenance from a claim to the historical
record that supports it, and from that record onward to the other claims it
supports; seeing the correction history of a fact that was revised.

**Must exist.** Provenance on every assertion; a verification state on every
assertion; the ability to attach evidence to a claim.

**Can arrive later.** Rich review tooling; sophisticated evidence linking; the full
correction-and-dispute apparatus. The *presence* of provenance is founding; the
depth of the tools that act on it can mature over milestones.

**Must never exist.** A fact without provenance. A confident-looking claim whose
basis cannot be inspected. Any path by which an assertion is displayed as more
certain than its verification state warrants. The trusted record has exactly one
unforgivable failure — presenting the untrusted as trusted — and the product is
built to make that failure impossible, not merely discouraged.

---

## 2.2 The Node and institutional sovereignty (Principles 3, 12, 13)

**How it becomes software, conceptually.** A Node becomes a first-class entity that
is also a governing container: it owns a body of memory, presents it under its own
identity and vocabulary, and connects to other Nodes without dissolving into them.
The three layers — generic core, per-Node vocabulary, per-Node identity — become a
standing product commitment that the *shape* of things is shared while the *words*
and the *look* are the institution's own. "Institutional memory as the organising
principle" becomes the decision that the platform is entered and understood through
institutions and their histories, not through a global directory of people.

**Primary experiences.** Arriving at a Node and immediately understanding *which
institution's memory this is;* reading its people, participations, and records in
its own language.

**Secondary experiences.** Following a person or a species or a method from one
Node to another and seeing the connection without either institution's identity
being flattened.

**Must exist.** The concept of a Node as an entity with its own identity and
vocabulary; the discipline that keeps the generic core free of any single
institution's assumptions.

**Can arrive later.** Actual multiple Nodes; cross-Node navigation; any mechanism
of federation or connection between institutions. These become real work only when
a real second Node makes their requirements concrete — the Bible's horizon
discipline, restated as a build rule.

**Must never exist.** Multi-tenant machinery, institution tables, cross-Node
synchronisation, or federation built ahead of a real second Node. A homogenising
template that erases institutional identity into a default skin. Vocabulary from one
Node leaking into the generic core. Sovereignty is architectural, and premature
platform machinery is the way it is most easily lost.

---

## 2.3 The Scientific Biography (Principles 4, 5)

**How it becomes software, conceptually.** The biography becomes the *reading* of a
person-entity — the assembly of their participations, relationships, events,
narrative, and evidence into a single legible account, projected along a timeline
and governed by visibility. It is produced by the community and stewarded by the
institution, not maintained by the subject as self-presentation. The design target
is a page that reads like a curated historical record, where the reader instinctively
knows how to move without being taught.

**Primary experiences.** Opening a person and understanding, within seconds, the
arc of a scientific life — who they were, where and when they worked, what they
contributed — and then reading downward into as much depth as the record holds.

**Secondary experiences.** Stepping from the biography into any of its threads — a
participation, a relationship, a record — and back, without losing one's place;
a living subject taking stewardship of their own identity through a verified claim.

**Must exist.** A person-entity that can exist with no account; a name; the ability
to hold participations, relationships, events, narrative, and evidence; a visibility
default that protects the unregistered.

**Can arrive later.** Rich narrative; extensive media; network views; the fuller
depth of every section. A biography of three honest facts is already a valid
biography.

**Must never exist.** A "profile" the subject performs for an audience. Fabricated
facts, plausible-looking placeholders, invented careers, zeros standing in for
unknowns, or skeletons pretending to load real data. Engagement metrics of any
kind. The biography is an archive of a life, and anything that turns it back into a
profile is a constitutional breach.

---

## 2.4 The dignity of labour (Principle 6)

**How it becomes software, conceptually.** Equal dignity becomes a property of the
*role* primitive and of the rendering of every biography: roles carry no encoded
hierarchy, and the biography of a *mateiro* is composed from the same primitives,
rendered with the same care, as the biography of a principal investigator.
"Contribution over authorship" becomes the decision that *Scientific Contributions*
is a category larger than publications — holding sustained fieldwork, the
maintenance of a long census, the training of a generation, a method carried
between stations — and that the platform values and displays these as
contributions, not as acknowledgements in small type.

**Primary experiences.** Finding an uncredited field assistant or technician
present in the record with a real biography; reading a contribution that no journal
ever printed, treated as a genuine part of a scientific life.

**Secondary experiences.** Following a contribution to the project and people it
belonged to; recovering a forgotten participant surfaced from a scanned roster.

**Must exist.** A role vocabulary broad enough to hold every kind of participant; a
notion of contribution wider than authorship; equal rendering across roles.

**Can arrive later.** Sophisticated recovery of the uncredited from historical
sources; fine-grained contribution types.

**Must never exist.** Any visual or structural hierarchy of persons by academic or
institutional rank. Contribution asserted without evidence or without an honest
mark of its uncertainty — the recovery of the forgotten must never become the
fabrication of the flattering. Metrics that re-privilege the already-celebrated.

---

## 2.5 Consent and the ethics of remembering (Principle 8)

**How it becomes software, conceptually.** Consent becomes the *visibility* facet on
every assertion, with a restrictive default, changed only by the subject or by an
accountable, recorded decision. The separation of *person* from *account* becomes
the structural guarantee that no one owns a life they did not live: a person-entity
exists independently, and an account is bound to it only through a reviewed claim.
Stewardship of the dead becomes a first-class concept rather than an edge case — a
biography can be tended, on evidence and with dignity, by the institution after the
subject is gone.

**Primary experiences.** A living person claiming their own record through
verification and choosing, field by field, what the world may see; a visitor seeing
only what has been made public, a community member seeing more, the subject seeing
all of their own.

**Secondary experiences.** An accountable decision to publish a well-documented
historical figure, recorded as part of the auditable history; an institution taking
stewardship of a deceased participant's legacy.

**Must exist.** Person–account separation; a per-assertion visibility facet; a
restrictive default for the unregistered; a reviewed path for a person to claim
their record.

**Can arrive later.** Fine-grained visibility controls; the full apparatus of
posthumous stewardship; consent-withdrawal flows.

**Must never exist.** Public-by-default exposure of an unregistered person's
information. An account silently seizing a record by matching a name or email.
Any automated decision to publish a person's memory — such decisions are made by
accountable humans, on the record, always. Optimising for a full page at the cost
of a person's dignity.

---

## 2.6 Time as the spine (Principle 9)

**How it becomes software, conceptually.** Time becomes the *timeline* projection at
the centre of every biography and every institution, and the *event* becomes a
first-class primitive rather than a date attribute. Every event is a junction that
binds people, institutions, projects, and evidence. The timeline shows the real,
irregular shape of history — ranges, gaps, returns, open ends, and honest
uncertainty — rather than smoothing it into an even line. This principle is
important enough that a whole engine is designed for it in Part IV.

**Primary experiences.** Reading a life or an institution *as time* — following its
sequence, feeling its rhythm, seeing where it paused and resumed.

**Secondary experiences.** Moving from an event to everything it connects; seeing
one event appear on several timelines at once; navigating across decades without
losing orientation.

**Must exist.** Events as entities in time; temporal precision as content; the
timeline as a readable projection with a structured, non-visual equivalent.

**Can arrive later.** Rich interactive navigation; dense multi-entity timeline
views; visual sophistication.

**Must never exist.** A timeline that renders only clean, evenly spaced, precise
points — one that flatters the record's regularity is misrepresenting its subject.
A timeline reachable only as an interactive visual, with no equivalent path to the
same history.

---

## 2.7 Relationships and the connected fabric (Principles 10, 11)

**How it becomes software, conceptually.** A relationship becomes a small narrative
carrying origin, context, duration, evidence, and meaning, with its own verification
state — never a bare edge. "Every object has a story" becomes the single-class
*entity* primitive: people, places, collections, publications, species, and
documents are all potential subjects, and the platform is one fabric enterable from
any thread. Suggestion and confirmation are kept rigorously distinct: the system may
surface likely connections, but a suggestion is drawn and labelled as such and never
rendered as an established relationship.

**Primary experiences.** Reading a relationship as a story — a mentorship with a
beginning and a legacy, a collaboration with a context — rather than a line; entering
the record through a photograph or a place and finding one's way to everything it
touches.

**Secondary experiences.** Weighing a relationship's evidence; seeing a system-
surfaced suggestion clearly marked as unconfirmed and awaiting a human act.

**Must exist.** The relationship primitive with its narrative facets; the single-
class entity model; the strict separation of suggestion from confirmation.

**Can arrive later.** Network visualisation; large-scale discovery of connections;
rich per-object pages for every kind of entity.

**Must never exist.** Relationships rendered as anonymous graph edges. A suggestion
displayed as a confirmed connection. A class of "attribute" entities that can never
become subjects — a photograph or a species reduced permanently to a field on
someone else's page.

---

## 2.8 Legacy and stewardship (Principle 14)

**How it becomes software, conceptually.** Legacy becomes the *stewardship*
primitive: a biography is designed from the first to be tended beyond its subject's
participation and life, most often by the institution. Retirement becomes an event
on the timeline, not the end of a record; death becomes the moment institutional
guardianship becomes the whole of the guardianship. The two clocks — the mortal
clock of a life, the enduring clock of an institution — become the reason the
platform assumes its subjects will one day be silent and resolves that their
silence will not be the loss of their memory.

**Primary experiences.** Encountering a completed life, held with dignity by its
institution, long after the person is gone; understanding what a scientist left
behind — students, methods, programmes, the record itself.

**Secondary experiences.** An institution taking up stewardship of a legacy; a
biography moving gracefully from self-stewardship to institutional stewardship.

**Must exist.** The concept that a record persists and is stewarded independent of
its subject's account or life; the preservation of a person's documented footprint
regardless of account deletion.

**Can arrive later.** The full workflows of stewardship transfer; legacy-specific
presentation.

**Must never exist.** A biography that decays into an abandoned profile. Deletion of
a historical record as a side effect of account deletion. Any treatment of a
deceased subject as merely an inactive user.

---

## 2.9 The museum and the librarian (Principles 15, 16)

**How it becomes software, conceptually.** The museum becomes a set of standing
behaviours — calm, restraint, honesty, generous space, documentary imagery,
accessible and multilingual and mobile-first reading — that the product always
observes and a set it never violates (both are designed in Part XI). The librarian
becomes the bounded role of artificial intelligence: powerful in discovery,
invisible in authority, never the author of the record (designed in Part XII).
Together they translate the Bible's aesthetic and its intelligence into product
behaviour rather than decoration.

**Primary experiences.** Reading long-form history that feels effortless and calm;
being helped to *discover* by an intelligence that never pretends to *decide.*

**Secondary experiences.** Reading equally well in the dark, on a phone, and — in
time — in another language; encountering AI-surfaced suggestions that are always
labelled and always deferred to human confirmation.

**Must exist.** The calm, honest, accessible reading experience as a floor; the
absolute boundary that AI may suggest but never assert into the record.

**Can arrive later.** Advanced discovery intelligence; refined typography and
motion; additional languages.

**Must never exist.** Urgency patterns, engagement loops, alarm, or chrome for its
own sake. AI that fabricates, that authors the record, or whose output enters the
record as anything other than a labelled, human-governed suggestion. Beauty
deployed against truth rather than in service of it.

> **Translation Principle** — Every constitutional principle resolves into the same
> four commitments: what the product must always do, what it must never do, what
> information must exist for the principle to be true, and what may deepen later —
> and the "never" list is as load-bearing as the "always" list.

---

# Part III — The Scientific Biography

This part designs the definitive Scientific Biography — not its visual form, which
belongs to a later milestone, but its conceptual form: its structure, its
information hierarchy, its reading flow, and the several rhythms that make it read
like a curated historical record rather than a piece of software. The test is
simple and demanding: someone opening *Bruce Williamson* for the first time should
instinctively understand how to read the page, without instruction, the way one
instinctively understands how to read a well-made exhibit or a well-set book.

## The structure

A Scientific Biography is organised as a descent from *whole life* to *single
fact,* in one continuous readable movement. It opens at the widest frame — who this
person was, seen at a glance — and lets the reader descend, at their own pace, into
progressively finer grain, until at the deepest level they are looking at a single
assertion and its evidence. Nothing about the structure requires the reader to
descend; a reader who reads only the top has read something true and complete at its
level. This is the architectural expression of Design Principle 5: the page is built
to be legible at every depth, not to be filled to a uniform density.

Four bands compose the descent, and they are always in the same order, because a
consistent order is what lets a reader learn the page once and know every page.

The **identity band** is the widest frame: the portrait, the name, and a single
line that situates the life — its span, its principal institution, the character of
its work. It is what a reader sees in the first two seconds, and from it alone they
should grasp the shape of a scientific life. Where there is no portrait, the band is
still calm and complete, because the absence of a photograph is a true fact of the
historical record, not a broken state.

The **narrative band** is the warm centre: the written life, in prose, in the
register of a biographical essay. This is where a retired technician's entry becomes
readable by their own grandchild. It is authored by people, never generated to fill
space; where it does not yet exist, the band yields gracefully and lets the
structured bands below carry the story until a human writes it.

The **structured bands** are the body of the record: participation, scientific
contributions, relationships, historical records, publications — each a section that
can be read on its own or in sequence, each honest about its own emptiness. These
are designed in Part V as the Biography Engine.

The **evidence band** is the deepest frame: for any assertion above, the provenance
and the historical records that support it, reachable without leaving the page. The
evidence band is not a separate destination; it is the floor beneath every fact,
one gesture down.

Running vertically through all four bands, binding them, is the timeline — not a
band of its own but the spine the bands hang from, so that any fact can be located
in time and any moment in time can be followed to the facts it holds.

## The information hierarchy

The hierarchy is ordered by *what makes a scientific life legible,* never by the
subject's rank or fame. At the top sits the minimum that situates a life: name,
span, principal affiliation, the character of the work. Below that, the arc:
participation and contribution over time. Below that, the connections: the people
and institutions the life was woven into. Below that, the documentary base: the
records and publications. And beneath everything, always, the evidence and
provenance that let a reader trust what they have read.

The hierarchy is honest about absence at every level. A biography with a full
identity band and three structured facts is displayed as exactly that — a true,
partial record — with its emptiness shown plainly and never disguised by a
placeholder, a zero, or a fabricated example. An honest, sparse biography ranks
above a full-looking, inferred one, always.

## The reading flow

The flow is *calm descent with easy return.* A reader enters at the identity band
and moves downward as far as their curiosity carries them, and at any point can step
sideways into a thread — a participation, a relationship, a record — and back again
without losing their place. The biography is the home a reader always returns to;
the threads are excursions that begin and end at it. No part of the flow demands a
decision, manufactures urgency, or interrupts reading with a prompt. The reader is
always the one setting the pace.

## The four rhythms

What makes the page feel like a historical record rather than software is not any
single feature but the interplay of four rhythms, each of which the product must
compose deliberately.

The **emotional rhythm** is scholarly, unhurried, and quietly warm — never somber,
never celebratory, never anxious. It rises gently at the narrative and at moments of
human weight (a mentorship, a return after years away, a legacy) and rests in the
calm of the structured record between them. The reader should feel they are in the
reading room of a great archive: taken seriously, and left in peace.

The **narrative rhythm** alternates prose and structure. Long-form narrative gives
meaning; structured sections give precision; and the page moves between them so that
a reader is never made to scan an unbroken wall of fields nor to wade through prose
looking for a fact. Meaning and precision take turns.

The **evidence rhythm** is the steady presence of provenance beneath the reading.
It is quiet by default — the reader is not made to look at footnotes they did not
ask for — but it is *always one gesture away,* so that any moment of "how do we know
this?" is answered immediately and in place. The rhythm is: read in confidence,
verify on demand, return to reading. Evidence is the ground, not the foreground, but
it is never absent.

The **temporal rhythm** is the pulse of the timeline through the whole page: the
sense, as one reads, of moving through decades — of a life that began, developed,
paused, resumed, and closed. It is what turns a list of facts into a story with a
shape, and it is why the timeline is a spine rather than a section.

## The interaction philosophy

Interaction serves reading and nothing else. Every interactive affordance exists to
let a reader *go deeper, follow a thread, or verify a claim* — never to entertain,
never to solicit engagement, never to demand a response. Motion clarifies a change
of state and then subsides. Disclosure reveals depth the reader asked for and hides
depth they did not. The page has no notifications, no counts, no prompts competing
for attention. The guiding sentence: **the interface's highest achievement is to
make itself unnoticed, so that what the reader notices is the life.**

> **Biography Principle** — Compose the Scientific Biography as a calm descent from
> whole life to single fact, ordered always the same way, honest at every depth, and
> carried by four rhythms — emotional, narrative, evidence, and temporal — so that a
> first-time reader instinctively knows how to read it and feels they are reading a
> curated historical record, not operating software.

---

# Part IV — The Timeline Engine

The timeline is the heart of the platform, and this part designs it as an *engine* —
a single conceptual mechanism that produces the temporal spine of every biography,
every institution, and every project alike, from the same primitives, by the same
logic. The timeline is not a component that some pages include; it is the way the
platform renders history, and every page that has a history has one.

## What kinds of events exist

The engine is fed by *events* — assertions with a time — and the kinds are drawn
from an extensible vocabulary rather than a fixed list, because different Nodes will
have different histories. But the founding kinds are clear from the domain: the
*institutional* events of a Node (a founding, a milestone, a change of direction, a
closure); the *participatory* events of a life (an arrival, an appointment, a change
of role, a departure, a return, a retirement); the *scientific* events (an
expedition, a field season, a discovery, a publication, a method established); the
*relational* events (a mentorship begun, a collaboration formed); the *documentary*
events (a photograph taken, an interview recorded, a letter written); and the
*biographical* events of a life beyond the institution (a birth, a death). Each
event is a junction: it names the entities it involves, the place it happened, the
work it belonged to, and the evidence that records it. An event is never a bare
label on a line; it is a doorway into the fabric.

## How uncertainty works

Uncertainty is not an error state to be resolved before display; it is a normal,
expected, first-class property of historical events, and the engine renders it as
such. Every event carries not only a time but a *confidence in that time* and a
*confidence in the event itself,* and the engine has honest visual registers for
each. An event known to have happened but not exactly when is shown as certainly
real and temporally approximate. An event whose very occurrence is uncertain is
shown as such, distinct from one that is merely imprecisely dated. The engine never
collapses "we are unsure when" and "we are unsure whether" into one ambiguous mark,
because they are different facts and a reader must be able to tell them apart.

## How approximate dates work

Dates in this domain come in many precisions, and the engine treats *precision
itself as information* rather than forcing everything to a false exactness. A date
may be exact (a known day), coarse (a known year or decade), bounded (known to fall
within a range), open (a beginning with no known end, or an end with no known
beginning), or unknown (the event is placed in sequence but not on the calendar).
The engine renders each precision in its own register — a year is shown as a year,
never silently padded to a day; a range is shown as a range, never collapsed to its
midpoint; an open end is shown as open, never quietly closed. A reader should always
be able to read, from the rendering alone, *how precisely we know when.*

## How overlapping histories work

Lives are not tidy sequences; they overlap themselves. A person may hold two roles
at once, participate in two institutions in the same years, or run a project while
mentoring a student and publishing a paper. The engine represents concurrency
honestly, showing overlapping spans as genuinely overlapping rather than forcing
them into a single non-contradictory line. The irregular real shape of a life — its
simultaneities as much as its gaps — is content the engine preserves, exactly as the
participation model (Part VI) requires.

## How personal, institutional, and project histories intersect

The engine's deepest power is that the *same event belongs to many timelines at
once.* The founding of PDBFF is an event on the institution's timeline, on the
timeline of everyone present at it, on the timeline of the science it began. A
single field season sits on the station's timeline, the project's timeline, and the
timeline of every person who worked it. The engine does not store these as separate
copies; it *projects* one set of events onto whichever entity is being read. This is
what makes the platform a single fabric of connected memory rather than a set of
parallel records: time is the shared axis on which every entity's history is written,
and an event is a point where several histories touch.

## How multiple timelines coexist

Because any entity can be read as a timeline, the engine must let timelines
*coexist and compose.* A reader looking at a person sees that person's timeline; a
reader looking at an institution sees the institution's; and the engine can lay one
against another — a life against its institution's history, a project against the
station that hosted it — so that a reader sees how a single life sat within a larger
history. Timelines are not isolated views but layers that can be read together,
which is how the platform shows a life *in its context* rather than in isolation.

## How users navigate decades

A history spanning forty or a hundred years cannot be read at one zoom. The engine
is built to let a reader move fluidly between *the whole span at a glance* and *a
single year in detail,* and back, without losing orientation — the long view for
grasping the arc, the close view for reading the moment. Navigation across decades
is calm and continuous, never a jarring jump, and the reader always knows where in
time they are standing. And because the timeline is the spine, this navigation is
also navigation of the biography itself: to move to a moment in time is to move to
the facts that moment holds.

## How the timeline becomes the natural spine of every biography

The timeline is the spine not because every page includes a timeline widget but
because *time is the organising axis of the record itself.* Participation is time.
Relationships have duration. Events are time. Contributions accrue over time. When
the engine projects an entity's events into a readable temporal order, it is not
decorating the biography with a timeline; it is revealing the biography's own
underlying shape, which was temporal all along. This is why the timeline is a
primitive-level projection and not a section: it is the form the record takes when
it is read as what it is — a history.

> **Timeline Principle** — Build one timeline engine that projects events onto any
> entity, renders temporal precision and uncertainty in honest registers, represents
> overlap and gaps as real, lets personal, institutional, and project histories
> intersect through shared events, and lets a reader move calmly across decades — so
> that the timeline is not a widget on the biography but the biography's own shape
> made visible.

---

# Part V — The Biography Engine

If Part III designs how a Scientific Biography *reads,* this part designs how it is
*composed:* the conceptual sections that make it up, how they relate, how they
reinforce one another, and how reading flows between them. These sections are not a
menu of pages; they are movements of one continuous record, and the engine's job is
to make them cohere into a single legible life.

## The conceptual sections

**Biography** is the narrative movement — the written life and the identity that
frames it. It is the interpretive centre, where structured facts are gathered into
meaning. It answers *who this person was.*

**Participation** is the institutional movement — the person's involvements with
institutions, projects, and places over time, through their roles. It is the
backbone of institutional memory at the human scale, and it answers *where and when
and in what capacity they worked.* It is designed in full as its own model in Part
VI.

**Scientific Contributions** — the movement the Bible insists we not call merely
*Projects* — is the work movement: what the person gave to the science, in the broad
sense that holds sustained fieldwork and the training of a generation alongside
named projects. It answers *what they contributed,* and it deliberately exceeds the
publication list.

**Relationships** is the connective movement — the people and institutions the life
was woven into, each rendered as a narrative. It answers *whom they worked with, and
what those bonds meant.* It is designed in Part VII.

**Historical Records** — the movement the Bible insists we not call merely *Media* —
is the documentary movement: the photographs, letters, rosters, maps, and recordings
that evidence and illustrate the life, each an entity with its own provenance. It
answers *what survives that shows this life,* and it is the visible face of the
evidence band.

**Publications** is the authored-output movement: the works the person wrote or
contributed to, held as one honest kind of contribution among others rather than as
the measure of the life. It answers *what they published.*

**Legacy** is the closing movement: what remains after the life — students trained,
methods carried forward, programmes made possible, the record itself, stewarded on.
It answers *what endured,* and it is the hinge from the biography of a person to the
memory of an institution.

## How they relate

The sections are not independent tabs; they are *facets of one life, bound by shared
primitives.* A participation and a contribution are often the same span of work seen
from two angles — the institutional and the scientific. A relationship and a
participation frequently share a context: two people who overlapped at a station in
the same years. A historical record evidences a participation, illustrates a
relationship, and marks an event on the timeline all at once. A publication is both
a contribution and, often, the evidence for a collaboration. The engine's task is to
let these connections be *felt and followed* — so that reading one section
illuminates the others — rather than presenting seven disconnected lists that happen
to concern the same name.

Time is what binds them. Every section is, underneath, a set of events and spans, and
the timeline is the shared axis on which they all fall. A reader moving down the
biography is also moving through a life in time, and the sections are the different
kinds of thing that were happening in those years. This is why the timeline is the
spine of the Biography Engine and not merely one of its sections: it is the thread on
which all the others are strung.

## How they reinforce one another

The sections reinforce one another by *corroboration and by depth.* Corroboration:
a participation asserted in the structured record is supported by a historical
record in another section and narrated in the biography — three views of one truth,
each strengthening the others, all sharing one provenance. Depth: the narrative
gives meaning that the structured sections give precision to, and the evidence
section gives ground to; a reader who wants the story reads the narrative, a reader
who wants the facts reads the structure, a reader who wants proof reads the evidence,
and all three are reading the same life at different grains. The reinforcement is
what makes the biography feel *whole* rather than assembled — the sense that every
part is speaking about the same person, and that the parts agree.

## How reading flows between them

Reading flows between the sections by *thread and by return.* A reader in the
participation section encounters a collaborator and can step into that relationship,
and from the relationship into the collaborator's own biography, and back. A reader
in the historical records encounters a photograph and can follow it to the
expedition it belonged to, the people in it, the moment on the timeline it marks. A
reader in the narrative encounters a claim and can drop to the evidence beneath it.
Every section is porous to the others through the shared primitives — entities,
events, evidence — and the biography is the home the reader always returns to after
each excursion. The flow is never linear-only and never maze-like: it is a calm hub
(the biography) with well-marked threads out and back.

> **Biography Engine Principle** — Compose the biography from bound movements —
> Biography, Participation, Scientific Contributions, Relationships, Historical
> Records, Publications, Legacy — that share primitives and a timeline so they
> corroborate and deepen one another, and let reading flow by thread and return
> through a calm central hub, so the life reads as one whole rather than seven lists.

---

# Part VI — The Participation Model

Participation is fundamental. It is the primitive through which a human life is woven
into an institution's memory, and it is the one the Bible and the working rules guard
most explicitly: a person may have many participations, and participation is *never*
a single date range or a single role. This part designs the model conceptually — the
concepts it must hold, what each means, and how each contributes to preserving
institutional memory.

## The shape of participation

A participation is a *bounded involvement of a person with an institution, project,
or place, across a span of time, expressed through one or more roles.* Three
properties of this shape are constitutional and must never be compromised.

First, a person may have *many* participations. A student who left and returned a
decade later as staff has two participations, not one record edited twice, and not a
promotion — two distinct involvements, each with its own span, its own roles, its own
context. The model preserves the returns, the gaps, and the second beginnings that
are the true shape of long scientific lives.

Second, a single participation may hold *concurrent* roles. A
person who was at once a technician and a part-time student held two roles in one
involvement, and the model distinguishes that from two separate involvements. The
distinction matters because the two situations mean different things about a life,
and the record must be able to tell them apart.

And third, a participation has *temporal shape* — a beginning, sometimes an end,
sometimes an open continuation, often imprecise — and that shape is content, carried
onto the timeline, not administrative metadata to be normalised away.

## The concepts the model must hold

**Appointments.** The formal fact of being taken on, in a capacity, for a period — the
institutional act that begins (and sometimes ends) a participation. An appointment is
the skeleton of a participation: the recorded, often documented, fact that an
institution and a person entered into an involvement. Multiple appointments over a
life are the norm, not the exception.

**Roles.** The character in which a person served during a participation, drawn from
an extensible, curated vocabulary and carrying equal dignity by construction. Roles
are how the model expresses *what someone actually did,* and the model must hold as
many kinds of role as the community actually contained. The founding vocabulary
spans the whole of a field community, and each role carries a specific meaning worth
naming:

- **Researchers** — those who designed and conducted the scientific work. Recorded
  fully, but never as the only class that matters.
- **Directors** — those who led an institution or programme, whose participation is
  as much stewardship and continuity as science.
- **Students** — those who trained within the institution, whose participation is
  often the beginning of a scientific life and the seed of a future legacy.
- **Technicians** — those who kept the instruments, the data, and the methods honest,
  without whom the science is not reproducible.
- **Field assistants** — those who did the physical, skilled, daily work of the
  fieldwork, on whose labour the findings rest and whose names rarely reached the
  papers.
- **Mateiros** — the local forest guides whose knowledge of the land made the work
  possible and often shaped it, a role the platform records with particular care
  because it is the one most thoroughly lost by every system that came before.
- **Community collaborators** — the members of local and riverine communities whose
  knowledge, consent, and partnership made the research possible and legitimate,
  especially in the community-based tradition of institutions like Instituto Juruá
  and Instituto Mamirauá.
- **Volunteers** — those who gave time without formal appointment, whose contribution
  is real and whose participation the model must be able to hold even when it was
  never formally recorded.
- **Support staff** — cooks, drivers, camp managers, administrators — without whom no
  one stays in the forest long enough to learn anything, and whose participation is
  part of how the knowledge was made.
- **Assistants** — those in supporting scientific and administrative capacities not
  captured by the roles above.

The list is founding, not closed; the model holds it as vocabulary a Node can extend,
never as an enumeration baked into the product. What is constitutional is not the
exact set but the principle: the vocabulary must be broad enough to hold *everyone
who was actually there,* and no role may be encoded as lesser than another.

**Multiple appointments.** The model's first-class handling of a life with more than
one involvement — the returns and second beginnings — preserved as distinct
participations rather than flattened into a single span. This is where a life's real
irregularity is kept.

**Temporary visits.** Short, bounded involvements — a visiting researcher, a season's
guest, a passage through Camp 41 — held with the same seriousness as long
appointments, because a scientific community is shaped by its visitors as well as its
residents, and the visitor who passed through once may be the connection that
explains a later collaboration.

**Volunteer work.** Participation given without formal appointment, which the model
must be able to represent precisely because so much real contribution was never
formalised, and a model that could only hold the formally appointed would lose
exactly the uncredited labour the Bible exists to recover.

**Institutional affiliations.** The broader, often concurrent, belonging of a person
to institutions beyond the Node — the university that employed them, the museum that
held their collection — which situate a life in its full professional context and are
the threads by which one Node's memory connects to another's. Affiliation is
participation seen at the widest frame: the whole set of institutions a life touched.

## How each contributes to institutional memory

Each concept exists because institutional memory fails in a specific way without it.
Without *multiple participations,* the returns and second acts of long lives are lost,
and a forty-year community looks like a series of unrelated one-term records. Without
*concurrent roles,* the real texture of what people did is flattened into a single
title. Without a *broad role vocabulary,* the field assistants and *mateiros* and
support staff vanish exactly as they have vanished from every prior record, and the
memory becomes a memory of the credited few. Without *temporary visits* and
*volunteer work,* the connective visitors and the informal contributors disappear, and
the community looks smaller and more formal than it was. Without *institutional
affiliations,* each Node's memory is sealed off from the others, and the person who
linked two institutions is remembered by neither as a link. Participation, modelled
fully, is how an institution remembers *everyone who made it,* in the real and
irregular way they actually made it — which is the whole purpose the platform serves.

> **Participation Principle** — Model participation as many bounded involvements per
> life, each holding one or more concurrent roles across an honest temporal shape,
> with a role vocabulary broad enough to hold researchers and directors alongside
> mateiros, field assistants, community collaborators, volunteers, and support staff
> in equal dignity — because an institution's memory is only as complete as the range
> of participation it can hold.

---

# Part VII — Relationships as Historical Narratives

Relationships are the connective tissue of a scientific community, and the Bible is
categorical that they are *narratives,* not graph edges, not database connections.
This part designs them conceptually: what makes a relationship historically
meaningful, how different kinds of relationship differ in nature, how institutions
take part in relationships, and how evidence shapes them.

## What makes a relationship historically meaningful

A relationship is meaningful, in the historical sense this platform cares about, when
it carries the five things the Bible names: an *origin* (how it came to be known), a
*context* (the project, place, or period it lived within), a *duration* (relationships
begin, persist, and sometimes end — they are not timeless facts), *evidence* (what
attests that it existed), and *meaning* (what kind of bond it was, and what it
signified in the two lives). A connection stripped of these — a mere assertion that
two names are linked — is not yet a historical relationship; it is a hint that one
might exist. The product's task is to hold relationships at the level of narrative,
where they have shape and significance, and never to let them collapse to the level
of the edge, where they have neither.

Crucially, a relationship lives *in time* like everything else. It has a beginning
and often an end; it belongs on the timelines of both people; it overlaps with the
participations and events that gave it its context. A mentorship is not a static link
between two nodes — it is a span, with a start (a student arrives), a texture (years
of supervision, a dissertation, a first paper), and a consequence (the student trains
students of their own). Rendering that as a line would discard everything that made it
matter. Rendering it as a narrative in time is the whole point.

## How mentorship differs from collaboration

Different kinds of relationship have genuinely different *natures,* and the product
must let each be itself rather than forcing all into one symmetric shape. Mentorship
is *directional and formative:* it flows from mentor to student, it is asymmetric by
nature, and its meaning is developmental — one life shaping another, often at the
beginning of a scientific career, with a legacy that extends into the students the
student later trains. Collaboration is *symmetric and conjoint:* two people working
as peers on shared work, its meaning lying in what they made together, with no
inherent direction. Co-authorship is a particular, documented form of collaboration.
Field partnership — a researcher and the field assistant or *mateiro* who worked
beside them for years — is another kind again, often long in duration and deep in
mutual dependence, and often exactly the relationship most thoroughly lost by prior
records. The model must carry the *kind* of relationship as meaning, must know which
kinds are directional and which symmetric, and must render each in a way true to its
nature — never displaying a mentorship as if it were symmetric, nor a collaboration
as if it had a hierarchy.

## How institutions participate in relationships

Relationships are not only person-to-person. A person stands in relationship to an
*institution* — as a director stands to the Node they led, as an affiliate stands to
the university that employed them — and these relationships are as historically
meaningful as those between people. An institution also stands in relationship to
*other institutions:* the collaboration of INPA and the Smithsonian that made PDBFF
possible is itself a relationship, with an origin, a duration, and a meaning. The
product's relationship primitive therefore connects entities of any kind, not only
persons, so that the institutional relationships that structure a research community
— who founded with whom, who hosted whom, who collaborated across borders — are held
with the same narrative seriousness as the human ones. This is also how the fabric of
Nodes connects: a person affiliated with two institutions, or two institutions bound
by a shared programme, are the threads by which one Node's memory reaches another's.

## How evidence shapes relationships

Evidence is what moves a relationship along its verification path, and the product
keeps *how a relationship was known* rigorously separate from *whether it has been
verified* — the two-axis discipline of Design Principle 10. A relationship may
originate as self-declared, submitted by another, drawn from a document, inferred by
the system, or imported; and independently of its origin, it stands somewhere on the
path from unreviewed through supported to confirmed, with disputed available
throughout. Evidence — a co-authored paper, a shared roster, a testimony, a letter —
is what supports a relationship and what a reader weighs in judging it. But evidence,
however strong, is not confirmation: a relationship reaches *confirmed* only through
an actual confirming act, by a party or an authorised reviewer, never by the weight
of evidence or the confidence of the system alone. And a relationship is displayed
*as confirmed* only when it truly is; a suggested, supported, or disputed relationship
is shown honestly as what it is, never dressed as an established bond, however
entitled the viewer. The system may surface a likely connection — that is a genuine
service to discovery — but a suggestion drawn from shared data is drawn and labelled
as a suggestion, and it becomes a relationship in the record only when a human affirms
it.

> **Relationship Principle** — Hold every relationship as a narrative in time, with
> origin, context, duration, evidence, and meaning; let mentorship be directional and
> collaboration symmetric and field partnership its own kind; let institutions stand
> in relationships too; and keep how a relationship was known forever separate from
> whether it is confirmed, so that a suggestion is never rendered as an established
> bond.

---

# Part VIII — Every Object Has a Story

The Bible's eleventh principle is, in product terms, the most structurally
consequential thing in this blueprint, because it is the one that determines the
*shape* of the whole system. This part expands it: how treating every object as an
entity with its own story changes the conceptual design of each kind of thing the
platform holds.

The general move is the one made in Part I: there is a single *entity* primitive with
no second-class members, so anything the platform holds can be a subject — with its
own portrait, timeline, relationships, evidence, and narrative — and not merely an
attribute on someone else's page. What follows is what that means, concretely, for
each kind.

**Projects** become entities with lives of their own: an origin, a span, a cast of
participants across roles, a set of contributions and outputs, a place, and a legacy.
A project is read the way a person is read — as a story in time — and a person's
participation in it is a thread connecting two entities, each of which can be entered
from the other. Held under the Bible's language, projects are the formal core of the
broader category of *Scientific Contributions.*

**Stations** — field stations and research sites — become places with histories:
Camp 41 is not a coordinate on a map but an entity with its own timeline, its own cast
of everyone who passed through it, its own findings and records. A station read as an
entity lets a reader enter the community through *place* — to stand at Cocha Cashu or
in the flooded forest of Mamirauá and follow outward to the people and work it held.

**Collections** become entities: the specimens, samples, and physical residue of
decades of work, each collection with its own provenance, its own history of who
assembled it and how, its own connections to the expeditions and people that produced
it. A collection is memory in material form, and the platform treats it as a subject,
not a stockroom.

**Species** become entities around which research programmes orbit — the understory
birds of the fragmentation plots, the uakari monkeys of Mamirauá, the arapaima whose
community-managed recovery is the story of Instituto Juruá. A species read as an
entity gathers the people, projects, places, and publications that concern it into a
single thread, and lets a reader enter the community through the *organism* the
science was about.

**Publications** become entities rather than citations: works with authors and
contexts and consequences, connected to the people who made them, the projects they
came from, the relationships they evidence. A publication is one honest kind of
contribution and also, often, the evidence for a collaboration — a single entity
serving several threads.

**Archives** become entities: the bodies of documentary material an institution
holds, each with its own provenance and its own history of accession, the documentary
foundation from which much of the rest of the record is reconstructed.

**Photographs** become entities with provenance — who took them, when, of whom, how
they entered the archive — and their own connections to the people in them, the place
they were taken, the expedition they belong to, the moment on the timeline they mark.
A photograph is never decoration on a biography; it is a historical record that may
knit together several biographies, a place, and a decade.

**Documents** — letters, rosters, reports, field notebooks — become entities and
evidence at once: subjects with their own stories, and the documentary base that
supports assertions across the record. The roster that names a forgotten field
assistant is both a record with its own history and the evidence that recovers a life.

**Expeditions** become entities: bounded stories of who went where and what they
found, with a crew, a span, a place, and a set of records and findings — a natural
unit of scientific narrative that gathers people, place, time, and evidence into one
readable episode.

**Maps** become entities: representations with their own provenance and their own
history, connected to the places they depict and the work that produced or used them,
treated as archival objects rather than illustrations.

**Oral Histories** become entities of particular weight: recorded or transcribed
personal accounts that are at once narrative (a person's own telling), evidence (a
primary source for other assertions), and historical record (an archival object with
provenance). The interview on Bruce Williamson's timeline is not a media file; it is a
voice preserved, a source to be weighed, and a story in itself.

**Scientific Contributions** and **Historical Records** are the two category-level
entities the Bible's vocabulary elevates — the first gathering projects and the
broader forms of contribution beyond authorship, the second gathering photographs,
documents, maps, recordings, and the rest of the documentary base. Naming them as
first-class categories is itself part of "every object has a story": it insists that
contribution and record are subjects the platform is organised around, not
by-products of the pages about people.

The cumulative effect of treating every object as an entity is that the platform
becomes *enterable from any thread and traversable along all of them.* A reader can
begin at a person and arrive at a species; begin at a photograph and arrive at an
expedition; begin at a station and arrive at a *mateiro* and from there at another
scientist. Every object having a story is not a feature added to the pages; it is the
property that turns a set of pages into a single fabric of connected memory.

**Datasets and the knowledge-history boundary** (constitutional clarification CC2,
ratified at M6.V). Because every object can be an entity, scientific datasets can be
entities too — and the boundary of that inclusion must be made explicit, so that
"every object has a story" is never mistaken for a mandate to become a data
warehouse. Nodes of Knowledge preserves the *history of knowledge-making.* Within that
purpose, the platform may represent:

- datasets as scientific contributions or referenced entities;
- who created or maintained them;
- when and where they were produced;
- the projects, methods, institutions, sites, and people connected to them; and
- their provenance, custodianship, and access information.

What the platform does **not** become, in its initial scope, is a raw scientific-data
repository, an analytical environment, or a replacement for specialist data
infrastructure. A dataset enters the record as a documented contribution carrying its
provenance and custodianship — the history of its making — not as raw data to be
stored, queried, or analysed here. This boundary preserves the possibility of future
integrations with specialist data infrastructure without expanding the platform's
current scope: because a dataset-entity is represented as a contribution with
provenance rather than as the data itself, it can later point to, or be enriched by,
external systems without any change to what the platform fundamentally is.

> **Every-Object Principle** — Give every kind of thing the platform holds — project,
> station, collection, species, publication, archive, photograph, document,
> expedition, map, oral history — the standing of a full entity with its own story,
> timeline, relationships, and provenance, so the platform is one fabric of connected
> memory enterable from any thread, not a set of person-pages with attributes
> attached.

---

# Part IX — The Institution

Institution Pages are first-class, and this part designs them conceptually by way of
a thought experiment the brief sets: imagine someone spending a full hour reading the
PDBFF page. What should they understand? What should they remember? What should they
feel? And how should such a page differ, fundamentally, from a Wikipedia article?

## What they should understand after an hour

After an hour with the PDBFF page, a reader should understand PDBFF not as a set of
facts but as a *living institution with a history.* They should understand what it is
and why it exists — one of the longest-running fragmentation experiments on Earth,
born from a theory of island biogeography carried out of Harvard, conducted in the
forest north of Manaus since 1979, a collaboration rooted at INPA and the
Smithsonian. They should understand its arc in time: its founding, its major periods,
its findings, its continuities and its changes. They should understand that its
science rested on the labour of technicians, drivers, field assistants, and
*mateiros* as much as on its researchers — because the page gave those people equal
presence. They should understand the shape of its human community across generations,
and how it connects outward to the other institutions its history touched. And they
should understand, throughout, *how we know* what the page tells them, because the
page carried its provenance as it went.

## What they should remember

They should remember *people* — not only the famous, but a field assistant or a
*mateiro* whose story the page let them meet. They should remember the *place* — the
forest, Camp 41, the fragments themselves — as somewhere with a history, not a
backdrop. They should remember the *arc* — that this was decades of continuous,
physically demanding work, irregular and human, not a tidy institutional summary.
And they should remember a *feeling* of having been in the presence of a real
institutional memory, kept with care. The measure of the page is not how much a
reader retains but *what kind* of thing they retain: not trivia, but an understanding
of a scientific community as a living, peopled, evidenced history.

## The emotional journey

The hour should move through a deliberate emotional arc. It should open in *calm and
seriousness* — the institution presented with dignity, unhurried, without spectacle.
It should deepen into *absorption* as the reader descends from the institution's arc
into its people, its places, its work, following threads at their own pace. It should
rise, at moments, into *human warmth and even moving recognition* — meeting an
uncredited life, reading a mentorship, encountering an oral history in a person's own
voice. And it should close in *trust:* the sense, built over the hour by the constant
honest presence of provenance and the constant honest marking of what is uncertain,
that this record can be believed. Calm, to absorption, to warmth, to trust — never
excitement, never urgency, never the manufactured emotions of an engagement product.

## How Institution Pages differ fundamentally from Wikipedia

A Wikipedia article and an Institution Page can describe the same institution and yet
be different *kinds of thing,* and the difference is constitutional.

A Wikipedia article is a *summary* written from secondary sources toward a neutral
general reader; an Institution Page is a *primary institutional memory,* governed by
the institution, built from its own people, participations, records, and evidence.
The article distils; the page *holds.*

A Wikipedia article is organised as *prose about a topic;* an Institution Page is
organised as a *fabric of connected entities* — every person, place, project, and
record a subject in its own right, enterable and traversable — with narrative as one
movement among several, not the whole.

A Wikipedia article generally records the *notable;* an Institution Page records the
*whole community,* with the deliberate inclusion of the uncredited that is the moral
centre of this platform. The field assistant who would never merit a Wikipedia
mention has a full presence here.

A Wikipedia article carries provenance in *footnotes to external sources;* an
Institution Page carries provenance as the *native property of every assertion,* with
its own verification states, its own evidence, its own honest marking of the
uncertain and the disputed — the apparatus of a primary archive, not the citations of
an encyclopaedia.

And a Wikipedia article is *authored about* an institution by outsiders; an
Institution Page is *stewarded by* the institution as its own living memory, under
its own identity and vocabulary, carried forward across the generations by the
enduring clock of the institution itself. The page is not a description of the
institution; in a real sense it *is* the institution's memory, made legible.

> **Institution Principle** — Design the Institution Page as an institution's own
> living, primary memory — a fabric of connected entities carrying native provenance,
> recording the whole community including the uncredited, stewarded under the
> institution's identity — so that an hour with it leaves a reader understanding a
> peopled history, remembering real lives, and trusting the record, in a way an
> encyclopaedia article about the same institution never could.

---

# Part X — The Reading Experience

The platform is, above all, a place to *read.* This part describes how the experience
should deepen over time — what a person should feel and understand after five
minutes, after thirty, after two hours — and how, across that arc, understanding
grows, curiosity evolves, and trust is earned. These are not usage metrics; they are
a description of the experience the product must be shaped to produce.

## After five minutes

In the first five minutes, a reader should feel that they have entered *somewhere
serious and calm,* and should grasp one whole thing. Opening a single Scientific
Biography — Bruce Williamson — they should, without instruction, understand how to
read the page: the identity band situates the life, the narrative offers the story,
the sections offer the depth, the timeline gives the shape. They should come away
with the arc of one scientific life and the distinct sense that this is not a
profile and not a social network — that they are reading a curated historical record.
The five-minute experience is *orientation and first trust:* the reader learns the
grammar of the page and feels the calm, and nothing has rushed them, alarmed them, or
asked anything of them.

## After thirty minutes

By thirty minutes, the reader has begun to *follow threads,* and understanding shifts
from a single life to a *web of connected memory.* From Bruce they have stepped into
a participation and met a collaborator; into a relationship and understood a
mentorship; into a historical record and found a photograph from Camp 41; perhaps
into the station itself, or into the institution. Curiosity has evolved from "who was
this person" to "what was this community, and how are these people connected." The
reader has started to feel the fabric — that every object opens onto others — and has
begun to notice the honest presence of provenance and the honest marking of the
uncertain. Trust is deepening because the record keeps showing its work. The
thirty-minute experience is *immersion and traversal:* the reader is no longer on a
page but moving through a history.

## After two hours

After two hours, the reader has come to understand the platform as *an institution's
living memory,* and their relationship to it has changed in kind. They have read
across people, places, projects, and records; they have seen the same event appear on
several timelines; they have met the uncredited alongside the celebrated and felt the
equal dignity that is the platform's moral centre; they have followed the community's
history across decades and outward toward the institutions it touched. Curiosity has
matured from discovery into *understanding* — a sense of the community as a whole,
peopled, evidenced, and real. And trust has become *settled confidence:* two hours of
the record being consistently honest — about what it knows, what it doesn't, and how
it knows — has earned a belief that what this record asserts can be relied upon. The
two-hour experience is *comprehension and trust:* the reader leaves understanding not
just facts but a scientific community, and believing the account they were given.

## How understanding deepens, curiosity evolves, trust grows

Across the arc, three things move together, and the product is shaped to move them.
*Understanding* deepens by descent and traversal — from a life, to a web, to an
institution — because the fabric of connected entities always offers a next thread
and the timeline always offers a longer view. *Curiosity* evolves from person to
connection to community because every entity opens onto others and the reader is
never at a dead end. And *trust* grows by accumulation — every honest provenance,
every marked uncertainty, every suggestion correctly held back from being asserted,
is a small deposit, and two hours of them is a foundation. The experience is
designed so that the longer one reads, the more one trusts, which is the exact
inverse of an engagement product, where the longer one stays the more one is
manipulated. Here, time spent is trust earned, because the record spends that time
proving itself honest.

> **Reading Principle** — Shape the experience so that understanding deepens from a
> life to a web to an institution, curiosity evolves from person to connection to
> community, and trust grows by the steady accumulation of honesty — so that the
> longer someone reads, the more they understand and the more they trust, the
> opposite of an engagement product.

---

# Part XI — The Museum

The Bible asks that opening a Scientific Identity feel like entering a museum. This
part translates that philosophy into *software behaviour:* what the product must
always do, what it must never do, and how beauty, typography, and space are made to
serve truth and memory rather than decoration. These are behavioural commitments, not
visual specifications; the visual system is a later milestone's work, but it must be
built to honour these.

## What the software must always do

The software must **always be calm.** It defaults to quiet; it never manufactures
urgency; it lets the reader set the pace. It must **always be honest** — showing what
is known, unknown, uncertain, and disputed each in its own true register, and never
disguising absence with a placeholder or a plausible default. It must **always carry
provenance** — keeping the basis of every assertion one gesture away. It must
**always give reading room** — generous space around framing and headings, so the
content can be read without strain. It must **always treat imagery as archival** —
real, credited, dated, with provenance — never as mood. It must **always be
reachable** — every reader, by keyboard, by screen reader, on a phone, in the dark,
and in time in another language, able to read the same history by an equivalent path.
And it must **always keep the interface subordinate to the content** — the highest
achievement of the chrome is to go unnoticed so that what is noticed is the life.

## What the software must never do

The software must **never alarm** — no red badges, no urgent dots, no
attention-demanding chrome; even the colours that mark verification and dispute
inform rather than warn, and a disputed record is never coloured as a failure. It
must **never manufacture engagement** — no follower counts, no like counts, no
"who viewed you," no reads, no recommendation feeds, no notifications competing for
attention, nothing that turns a memory into a metric or a reader into a user to be
retained. It must **never fabricate** — no invented facts, no plausible placeholders,
no zeros standing for unknowns, no skeletons pretending to load real data. It must
**never decorate against truth** — no ornamental rainforest imagery, no mood
photography, no visual flourish that makes the record look more certain, more
complete, or more finished than it is. And it must **never rush the reader** — no
interruptions, no prompts, no urgency, no pace but the reader's own.

## How beauty supports truth

Beauty on this platform is not applied to the record; it is the *form honesty takes
when it is done with care.* A museum feels beautiful because someone removed
everything that did not serve the object on the wall, and the platform earns its
beauty the same way — through restraint, not ornament. Beauty supports truth by
making the true easier to read correctly: the calm that lets a reader concentrate,
the space that lets a fact stand clear, the register that lets certainty and
uncertainty be told apart at a glance. When beauty and truth ever seem to compete —
when a flourish would make a sparse record look fuller, or a smoothing would make an
irregular history look tidier — truth governs, and the flourish is removed. Beauty is
in service; it is never in charge.

## How typography supports memory

Typography is the platform's primary instrument, because in an archive type is not
styling but *voice.* A clean, legible interface face carries the chrome, the labels,
the dense structured history; an optional text serif carries the long-form reading —
the narrative, the oral-history transcript — giving the content genuinely meant to be
read the feel of a printed scholarly page. Typography supports *memory* specifically
by making long-form reading effortless and dignified: a life read in a well-set
column at a comfortable measure is a life the reader can dwell in, and dwelling is
how reading becomes remembering. And the type must hold the whole community's names —
Portuguese diacritics, compound surnames, Indigenous names — without clipping or
transliteration, because a name rendered wrong is a memory kept wrong.

## How silence, spacing, and visual rhythm support long-form reading

Silence, spacing, and rhythm are what make two hours of reading possible without
fatigue. *Silence* — the absence of competing elements, notifications, and chrome —
lets the reader's attention rest entirely on the content. *Spacing* — generous
whitespace around sections and headings, a comfortable reading measure, room around
the framing — gives the eye rest and the content clarity, and signals, the way a
museum's space around an object signals, that what is shown deserves attention.
*Rhythm* — the deliberate alternation of narrative and structure, of density in the
content and calm in the chrome, of reading and the option to verify — keeps a long
descent from becoming either an unbroken wall or a scattered jumble. Together they do
for the screen what a well-made book and a well-hung gallery do for their material:
they make long, deep, unhurried attention feel natural, which is the precondition for
the platform's whole purpose, because memory is made by attention.

> **Museum Principle** — Translate the museum into behaviour: always calm, honest,
> provenance-bearing, spacious, archival, reachable, and self-effacing; never
> alarming, engagement-seeking, fabricating, decorative-against-truth, or hurried —
> with beauty, typography, and space deployed as the form careful honesty takes, in
> service of long, unhurried attention, because attention is how memory is made.

---

# Part XII — The AI Librarian

Artificial intelligence has a place in Nodes of Knowledge, and the Bible fixes it
precisely: AI is the librarian, not the protagonist. This part translates that
boundary into product architecture — what the librarian does, what it must never do,
and how its work enters the record without ever becoming the record.

## What the librarian does

The librarian's proper work is *discovery,* and within that work AI is genuinely
valuable and the product should use it. It helps a reader find what they did not know
to look for — surfacing a possible connection between two scientists who overlapped
at a station, a candidate co-authorship, a pattern across expeditions that no person
could hold in their head. It helps recover the lost — surfacing a forgotten field
assistant buried in a scanned roster, reading a name from a document no one had
indexed. It helps the stewards of the record — assisting an archivist to draft,
summarise, translate, and organise. It makes a vast fabric of connected memory more
findable, more navigable, more alive. All of this is the librarian knowing the
collection deeply and helping a reader through it, which is exactly what a great
librarian does and exactly what the product wants from AI.

## What the librarian must never do

The boundary is absolute, and it is the same boundary that governs the whole
platform, now applied to its most seductive tool. **AI supports discovery; it never
replaces evidence, and it never replaces historical interpretation.** The librarian
does not rewrite the documents, does not invent holdings that do not exist, does not
substitute its own account for the evidence on the shelf. Whatever a model produces
is, in the product's terms, a *suggestion* — an assertion of machine-inferred origin,
in the unreviewed state, drawn and labelled as such — and it is subject to exactly the
confirmation every other inference is subject to: it becomes part of the record only
when a human affirms it, never by the model's fluency or confidence. A generated
summary is a convenience laid *beside* the evidence, always traceable to it, never a
replacement standing in front of it. History belongs to people and institutions, and
the librarian, however capable, is never given authorship of it.

## How the librarian's work enters the record

The architecture that keeps the librarian in its place is the same architecture that
keeps every inference in its place, which is why no special machinery is needed for
AI — only the disciplined application of the existing grammar. A model's output enters
the system as an assertion whose *origin* is machine-inferred and whose *verification
state* is unreviewed. It is rendered, always, as a suggestion — visually and in
label distinct from a confirmed fact — and it carries its provenance (that a model
produced it, when, on what basis) exactly as any other assertion carries its
provenance. It can be surfaced to a reader as a discovery and to a steward as a
candidate, but it cannot be displayed as an established fact, and it cannot cross into
the confirmed record without the human confirming act the platform requires of every
claim. Thus the most powerful tool on the shelf is bound by the same rule as the
humblest: it may suggest, and only a person may assert.

## Why the boundary holds

The librarian stays in its role not because AI is unwelcome but because the
collection's integrity is the whole point. The platform's value is trust, and trust
is asymmetric — accumulated slowly over years of being right about provenance,
destroyed quickly by a single confident fabrication presented as memory. An archive
whose AI could author even occasionally would forfeit the one thing that makes it
worth more than the feeds it replaces. So nothing — least of all the most capable
tool available — is permitted to stand above the evidence. The librarian is powerful
in discovery and invisible in authority, and that is exactly the arrangement that
lets the platform use AI fully without ever letting it endanger the record.

> **Librarian Principle** — Give artificial intelligence the librarian's full power
> over discovery and none of the author's authority over the record: every model
> output enters as a labelled, machine-inferred suggestion in the unreviewed state,
> governed by the same human confirmation as any other inference, so AI can make the
> fabric of memory more findable without ever being permitted to assert into it.

---

# Part XIII — The Capability Roadmap

This part sets out the long-term shape of the platform as a sequence of
*capabilities* — not milestones, not dates, but the durable powers the platform
acquires and the order in which they naturally build on one another. It is a map of
dependency and rationale: what each capability is, what it rests on, why it comes
when it does, and why it enables the next. It authorises nothing and schedules
nothing; it explains the architecture's own internal logic, so that when milestones
are planned they follow the grain of the platform rather than cutting across it.

The order below is not arbitrary. It follows the primitives of Part I from the
innermost outward: each capability makes real a layer of the grammar, and each rests
on the layers beneath it. A capability built out of order — a network before the
entities it connects exist, a librarian before there is a collection to know — would
be built on air.

**Capability 1 — The Scientific Biography.** The foundation. It makes the *entity,
assertion, and provenance* atoms real for the platform's central subject, the person,
and establishes the reading experience, the honesty disciplines, and the
person–account separation. Everything else is read through the biography or connects
to it. It depends on nothing above it, which is why it comes first: it is the ground
the rest stands on.

**Capability 2 — The Timeline Engine.** The spine. Once biographies exist, they must
be read as histories, and the timeline engine makes the *event* primitive real and
gives every biography its temporal shape. It depends on the biography (there must be
lives and events to place in time) and it enables everything after it, because
participation, relationships, and institutional history are all read along time. The
timeline comes second because it is the form the record takes when read, and
everything later is read.

**Capability 3 — The Participation Engine.** The institutional weave at human scale.
It makes *participation and role* real — the many involvements, the concurrent roles,
the broad vocabulary that holds the *mateiro* beside the director. It depends on the
biography (a participation is a person's involvement) and the timeline (participation
has temporal shape), and it enables the institution, because an institution's memory
is, in large part, the sum of its participations. It comes third because you cannot
weave people into institutions before you can hold the people and place them in time.

**Capability 4 — The Relationship Engine.** The human connective tissue. It makes the
*relationship* primitive real as narrative — mentorship, collaboration, field
partnership — with the strict separation of suggestion from confirmation. It depends
on biographies (the entities related) and the timeline (relationships have duration)
and draws context from participation (shared involvements are where relationships
form). It enables the knowledge network, which is relationships at scale. It comes
fourth because a relationship presupposes the lives and the shared contexts that give
it meaning.

**Capability 5 — The Institution Engine.** The sovereign container and subject. It
makes the *Node* primitive real — the institution as an entity with its own
biography, and as the governing home of a body of memory under its own identity. It
depends on biographies, timelines, and participations (an institution's memory is
composed of them) and on relationships (institutions stand in relationships too). It
enables the connecting of Nodes and, eventually, the network across institutions. It
comes fifth because an institution is the gathering-up of everything beneath it; there
must be something to gather.

**Capability 6 — Historical Records.** The documentary base made first-class. It makes
*evidence* real as a body of entities — photographs, documents, maps, oral histories —
each with its own story and provenance, supporting assertions across the record.
Records are woven through everything from the start as evidence, but as a *capability*
— a full archive of first-class documentary entities — they deepen once there are
biographies, timelines, participations, relationships, and institutions for the
records to evidence and connect. Historical Records turn the whole record from
asserted to *documented,* and they are the raw material the network and the librarian
draw on.

**Capability 7 — The Knowledge Network.** The fabric made traversable at scale. It is
the emergent capability that arises when entities, relationships, participations,
institutions, and records are all present and connected: the ability to move through
the whole web of connected memory — person to record to expedition to *mateiro* to
another institution — and to see the shape of a community, and eventually to connect
Nodes to one another. It depends on all the capabilities beneath it, because a network
is nothing without the nodes and edges the earlier capabilities create. It comes
seventh because it is not a thing built but a power that emerges once the fabric is
whole.

**Capability 8 — The AI Librarian.** Discovery over the whole collection. It comes
last not because it is least but because a librarian is only as good as the collection
it knows, and the collection must substantially exist first. Once there is a rich
fabric — biographies, timelines, participations, relationships, institutions, records,
and the network binding them — the librarian can help readers and stewards discover
across it, always as suggestion, never as authority. It depends on everything before
it and it endangers nothing, because the confirmation discipline established in
Capability 1 and carried through every layer governs the librarian exactly as it
governs every other inference. The librarian is the platform's intelligence turned
loose on a collection worth knowing — which is why it is built when there is one.

## The logic of the sequence

Each capability enables the next because each makes real a layer of the grammar that
the next layer needs beneath it. Biographies give the entities; the timeline gives
them shape; participation weaves them into institutions; relationships connect them;
institutions gather them; records document them; the network makes the whole
traversable; and the librarian, at last, helps a reader through a collection that now
exists to be known. The rationale is architectural, not managerial: build from the
innermost primitive outward, never asking a capability to stand on one that does not
yet exist. A platform built in this order grows the way the grammar is structured, and
each milestone, when it comes, finds its foundation already poured.

> **Roadmap Principle** — Sequence the platform's capabilities from the innermost
> primitive outward — Biography, Timeline, Participation, Relationship, Institution,
> Historical Records, Knowledge Network, AI Librarian — so that each rests on the
> layers beneath it and enables the layer above, and no capability is ever asked to
> stand on one that does not yet exist.

---

# Part XIV — The Benchmarking Discipline

The Design Bible's seventeenth principle commits the platform to a particular
intellectual method: to learn from the best of every relevant discipline, to benchmark
for *problems* rather than *solutions,* and to hold that benchmarking always beneath the
Constitution, never above it. This part translates the principle from philosophy into
operational governance — the place benchmarking occupies in the platform's chain of
authority, the disciplined workflow performed at each major milestone, and the
safeguards that keep the discipline from drifting into imitation or scope creep. It is
performed before every major architectural milestone, so that each capability on the
roadmap of Part XIII is approached by understanding the field deeply and then designing
past it, never by importing what already exists. The method is neither optional nor
occasional; it is the standing discipline by which the platform advances — and, precisely
because it is powerful, it is fenced.

## The governance hierarchy

Every design decision in Nodes of Knowledge answers to a chain of authority, and
benchmarking has a fixed and deliberately modest place within it:

```
        Constitution               —  the Design Bible; why the platform exists
             |
             v
        Architectural Vision       —  the conceptual model and product primitives
             |
             v
        Ratified Milestone Goals   —  what this milestone must build, and its bounds
             |
             v
        Benchmarking               —  understanding the problem landscape
             |
             v
        Original Design Synthesis  —  the platform's own answer
             |
             v
        Implementation             —  the software of the year
```

Authority flows downward. Each layer is governed by the ones above it and governs the
ones below. The Constitution answers to nothing; the Architectural Vision serves the
Constitution; the ratified goals of a milestone serve the vision; and only then does
benchmarking begin its work — in service of a milestone whose purpose and boundaries are
already settled.

Benchmarking sits **below ratified milestone goals on purpose.** It is not a peer of the
milestone that can renegotiate what the milestone is for; it is a servant of the
milestone that deepens the team's understanding of the problem the milestone already
exists to solve. A benchmarking exercise may reveal that a problem is harder, richer, or
more connected than first understood — and that is its value. It may not conclude that
the milestone should therefore aim at a different goal, adopt a different conceptual
model, or abandon a constitutional commitment, because those decisions were made above it
by authorities it does not outrank. What benchmarking discovers flows *upward only as
understanding,* never as a mandate; if a discovery genuinely seems to challenge a ratified
goal, that is a matter to be raised with the authorities that own the goal, through
whatever amendment process governs them — never resolved inside the benchmarking step by
the person performing it.

## What benchmarking may never redefine

Because the discipline reaches out toward systems often larger and older than this one,
the boundary of its authority is stated explicitly. Benchmarking may refine *design* and
*implementation* — it may sharpen a mechanism, improve a workflow, clarify a model,
deepen the understanding of a problem. It may **never** redefine, reopen, or override any
of the following:

- the constitutional architecture;
- the conceptual model;
- the accepted product primitives;
- the ratified goals of a milestone;
- Node Independence;
- the provenance-first model;
- historical and temporal honesty;
- institutional sovereignty;
- equal dignity across roles;
- the separation of Narrative from evidence;
- the long-term vision of Nodes of Knowledge.

These are first principles, not implementation hypotheses awaiting a competitor's better
idea. No quantity of evidence that another platform does otherwise reopens them, because
they were never claims about what merely works — they are decisions about what this
platform *is.* A benchmarking finding that appears to argue against one of them has not
discovered a flaw in the Constitution; it has discovered the edge of benchmarking's
authority, and must stop there.

## When the discipline applies

The discipline is triggered by scale, not by frequency, and by sequence, not by whim. It
is performed before every *major architectural milestone* — the design of a new
capability, a new primitive, a new engine, or any decision large enough to shape what the
platform fundamentally is — but only *after* that milestone's constitutional purpose and
major goal have already been established. Benchmarking does not open a milestone; it
serves one already opened. Small, local, reversible decisions do not require it at all;
the machinery is reserved for decisions whose consequences are hard to undo and long to
live with.

One rule protects the milestone from the discipline meant to serve it: **benchmarking
must not delay or reopen an already ratified milestone merely because another product
uses a different model.** The existence of a different approach elsewhere is information
about the problem, not an instruction to change course. A ratified milestone proceeds;
what benchmarking learns informs the design *within* it, and is carried to the milestone's
owners only if it rises to a genuine constitutional question — which is rare, and is their
decision, not the benchmarker's.

## The milestone workflow

At each major milestone, the discipline proceeds in nine steps, always in this order,
because each depends on the one before it:

1. **Re-read the Constitution and the ratified architecture** — begin by restoring the
   destination and the vision to memory, so that everything studied afterward is weighed
   against them.
2. **Establish the milestone's accepted purpose and boundaries** — state plainly what
   this milestone is for and where it ends, before any outside system is consulted.
3. **Study relevant disciplines and infrastructures to discover the problem landscape** —
   benchmark broadly across science and software engineering, archives, museums,
   libraries, biodiversity informatics, the digital humanities, knowledge graphs,
   research infrastructures, scientific cyberinfrastructure, and any other mature
   knowledge infrastructure that has faced something like the problem.
4. **Extract the underlying principles and trade-offs** — for each system, look past what
   it built to the problem it recognised, the principle it used, and the trade-off it
   accepted.
5. **Evaluate them against the Constitution** — hold every extracted principle up to the
   Design Bible and the architecture, and keep only what is compatible.
6. **Deliberately reject incompatible patterns** — record what is rejected and why, as a
   first-class outcome of the work rather than a failure of it.
7. **Synthesise an original design** — from the understood problems and the compatible
   principles, create the platform's own answer, one that advances beyond the state of
   the art rather than merely matching it.
8. **Document what was learned, rejected, and created** — leave a durable record of the
   problems discovered, the principles refused, and the synthesis reached, so the
   reasoning outlives the milestone.
9. **Implement only after the synthesis is complete** — build once the design is settled,
   never in parallel with a benchmarking exercise still deciding what the design should
   be.

The order is itself the safeguard. Steps one and two anchor the work to the Constitution
and the milestone before a single external system is opened; steps three through six are
the study; steps seven and eight are the original synthesis and its record; step nine is
the software. Sequenced this way, it becomes structurally difficult to reach
implementation by way of imitation, because imitation has no place to enter a process
that studies problems, judges them against first principles, and only then designs.

## Problem discovery, not solution discovery

The maxim the Constitution fixes — *use benchmarking to discover problems, never to
discover solutions* — resolves, in practice, into a specific discipline of attention:

- study what problems other disciplines recognised;
- understand why those problems mattered to them;
- extract the principles they used and the trade-offs they accepted;
- then deliberately forget their implementations;
- and create an original Nodes of Knowledge solution from the Constitution.

The forgetting is the crucial and counter-intuitive step. Once the principle and its
trade-off are understood, the other system's actual schema, interface, or workflow is set
aside on purpose, so that the synthesis is built from the understood problem and the
platform's own first principles rather than from a remembered answer. The guiding
question is the test of whether attention has been placed correctly. It is never *"How
did they solve this?"* It is always *"What problem did they recognise that we should also
understand?"* A benchmarking exercise that ends with a catalogue of other platforms'
solutions has failed, however thorough it looks; one that ends with a clear statement of
the problems they recognised, a judgment of which principles this Constitution can accept,
and an original design, has succeeded.

## What this discipline must never become

The negative space of this method is as load-bearing as its steps. The discipline must
never become imitation. Nodes of Knowledge does not copy — not interfaces, not
workflows, not schemas, not database structures, not products, not implementation
patterns, not visual design, not the shape of a user experience — merely because another
platform already does it and appears to succeed. It does not adopt a feature to reach
parity with a system it is not trying to become. And it does not treat the existence of
a solution elsewhere as evidence that the same solution belongs here, because the
platforms it studies were built for purposes that are not its own. The moment
benchmarking produces a solution to copy rather than a problem to understand, it has
inverted into the very thing this discipline exists to prevent.

From this it follows that Nodes of Knowledge must never become any of the things
imitation produces:

- a composite of existing platforms;
- a prettier version of existing infrastructure;
- a feature-by-feature response to competitors;
- an architecture chosen by consensus or popularity;
- product management by imitation.

Popularity is not evidence of fitness, and prevalence is not best practice; that many
systems solve a problem a certain way is a fact about them and their purposes, never an
argument about this platform and its own. Held correctly, benchmarking is not a threat to
originality but its richest source: intellectual humility made operational — the
recognition that others have understood real problems worth learning from, and the
discipline to learn the problems without inheriting the answers. The platform becomes more
original the more deeply it understands the field, not less, because originality here is
understanding carried far enough to transcend what it understood.

> **Benchmarking Principle** — Place benchmarking beneath the Constitution, the
> architecture, and the ratified goals of the milestone it serves; perform it only after
> a milestone's purpose is set, never to reopen it; study the field to discover the
> *problems* others recognised, extract and judge their principles against the
> Constitution, reject what is incompatible, forget their implementations, and synthesise
> an original design that advances the state of the art — so that benchmarking refines the
> path without ever redefining the destination, and increases the platform's originality
> rather than eroding it into imitation.

---

# Coda — The Negative Space, and What This Document Is

Two things remain to be said plainly, because the platform depends on both.

The first is the *negative space,* gathered in one place because it is architecture,
not caveat. Across this blueprint the same refusals recur, and they are as
constitutional as anything the platform builds. There must be no engagement
machinery — no followers, likes, reads, view-counts, recommendation feeds, or
notifications that turn memory into metric. There must be no fabrication — no invented
facts, plausible placeholders, zeros standing for unknowns, or skeletons miming data
that is not there. There must be no dishonesty of certainty — no suggestion rendered
as confirmation, no inference dressed as fact, no machine output asserted into the
record. There must be no exposure — no unregistered person made public by default, no
account seizing a life it did not live, no automated decision about a person's memory.
There must be no premature platform machinery — no multi-tenancy, institution tables,
or federation built before a real second Node makes them concrete. And there must be
no decoration against truth — no ornament, imagery, or flourish that makes the record
look more certain, complete, or finished than it honestly is. And there must be no
imitation — no interface, workflow, schema, database structure, product, or pattern
copied from another platform merely because it exists and appears to work, for the
systems this one studies were built for purposes that are not its own; benchmarking
serves to discover the problems others recognised, never to borrow the solutions they
chose. These refusals are not limitations on the platform; they are the shape of the
platform, the discipline that keeps it an archive and not a feed.

The second is what this document *is.* It is the First Constitutional Edition of the
Product Blueprint: the faithful translation of the Design Bible into Product
Architecture, the bridge from why to what, the definitive blueprint from which the
remaining implementation milestones are meant to emerge almost mechanically. It does
not amend the Bible; where the two ever differ, the Bible governs. It does not author
software; it describes the product so clearly that the software becomes execution. And
it is written, like the Bible before it, to outlast the technology it will first be
built in — so that engineers, designers, historians, museum professionals, and partner
institutions reading it many years from now can understand not only how Nodes of
Knowledge works, but what it is, and why it was built to be nothing less than a
faithful memory of how scientific knowledge is made.

*The Nodes of Knowledge Product Blueprint — First Constitutional Edition, Version 1.1.
The bridge between philosophy and implementation. To be deepened as the platform grows,
and never quietly overwritten. Version 1.1 adds Part XIV, the benchmarking discipline,
translating Design Principle 17 into operational governance; Parts I–XIII are unchanged.*
