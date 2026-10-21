// Domain types for the Revelation Engine (Milestone M8).
//
// M8 REVEALS what the record already demonstrates: it composes several
// already-preserved, already-connected explicit Assertions into the
// deterministic patterns their JOINT truth ENTAILS, each decomposable without
// remainder back to those Assertions. It is NOT inference, recommendation,
// ranking, or interpretation. See the M8 Definitive Specification and
// docs/decisions/0018-revelation-engine.md.
//
// M8.1 implements ONE lens -- co-presence -- on the person: the DOCUMENTED
// COHORTS a person belonged to. M8.2 implements the SAME co-presence relation
// from the institution's vantage: the DOCUMENTED CO-PRESENCE within one
// institution (which participants the record places there at the same time as
// which others). Each cohort member / co-present person carries the exact
// canonical participations Assertion that establishes the overlap (its `source`),
// so the pattern decomposes to evidence. Co-presence is a documented co-presence,
// never an asserted relationship.
//
// The person/organization node shape reuses the M7 ProjectedNode; the temporal
// and provenance shapes are the platform-shared kernels (src/features/shared).

import type { ProjectedNode } from "@/features/network/types";
import type { ProvenanceInfo } from "@/features/shared/provenance";
import type { DatePrecision, TemporalValue } from "@/features/shared/temporal";

/** The generic, data-driven capacity of a participation (from
 * participation_capacities), resolved by the read model. */
export interface RevelationCapacityRef {
  key: string;
  label: string;
}

/** Pointer to the exact canonical row that a revealed element decomposes to.
 * For a cohort member this is the `participations` row establishing the
 * overlap. This is what keeps the revelation decomposable and non-circular: it
 * points at canonical evidence, never at the pattern. */
export interface RevelationSourceRef {
  /** The canonical table the Assertion lives in, e.g. "participations". */
  type: string;
  id: string;
}

/** A documented participation anchor -- a person's own participation that
 * anchors a co-presence (the focal person's participation in a cohort, or an
 * institution participant's participation there), shown so a reader can see both
 * sides of the overlap. */
export interface CohortAnchor {
  id: string;
  capacity: RevelationCapacityRef;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** One co-present person: another person whose documented participation at the
 * shared institution overlaps the anchor's, together with the exact
 * participation that establishes it. In M8.1 this is a cohort member (from the
 * focal person's vantage); in M8.2 it is a co-present participant (from the
 * institution's vantage). The same shape and the same evidence contract. */
export interface CohortMember {
  /** The person as a reading destination (reuses the M7 node shape). */
  person: ProjectedNode;
  capacity: RevelationCapacityRef;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
  /** The canonical participations row that establishes the overlap. */
  source: RevelationSourceRef;
}

// ---- M8.1: person co-presence (documented cohorts) ----------------------

/** A documented cohort at one institution: the institution, the focal person's
 * anchoring participation(s) there, and the members whose documented periods
 * overlap. */
export interface Cohort {
  /** The shared institution as a reading destination (reuses the node shape). */
  organization: ProjectedNode;
  focalParticipations: CohortAnchor[];
  members: CohortMember[];
}

/** The co-presence revelation document for one person (from
 * reveal_person_cohorts): the documented cohorts, in neutral order. An empty
 * cohorts array is an honest absence, not a claim that none exist. */
export interface PersonCohortsDocument {
  personId: string;
  cohorts: Cohort[];
}

// ---- M8.2: institution co-presence (documented co-presence) -------------

/** One participant of a focal institution, as an anchor: the person, ALL of
 * their own documented participations at this institution (both sides of every
 * overlap are decomposable), and the other people the record places here at the
 * same time (each a co-present person, reusing CohortMember). */
export interface GenerationAnchor {
  /** The participant as a reading destination (reuses the M7 node shape). */
  person: ProjectedNode;
  /** All of this participant's documented participations at the focal institution. */
  participations: CohortAnchor[];
  /** Others documented at this institution during a period overlapping theirs. */
  coPresent: CohortMember[];
}

/** The institution co-presence revelation document for one institution (from
 * reveal_organization_generations): the focal institution and its participants
 * (each with the others documented here at the same time), in neutral order. An
 * empty anchors array is an honest absence, not a claim that none exist. */
export interface OrganizationGenerationsDocument {
  organizationId: string;
  /** The focal institution as a reading destination (a doorway back to itself). */
  organization: ProjectedNode;
  anchors: GenerationAnchor[];
}

// ---- M8.3: lineage & institutional evolution (documented descent) --------

/** A relationship-kind reference (mentorship, succession, merger, ...) resolved
 * by the read model -- the structural kind of a lineage step, never a meaning. */
export interface RelationshipKindRef {
  key: string;
  label: string;
  /** The source end's role label from the kind vocabulary (e.g. "Predecessor",
   * "Mentor", "Antecedent body"), used to read a step directionally without
   * hard-coding role words in components. */
  sourceRole: string;
}

/** One documented step in a lineage chain: a single directional relationship
 * Assertion, projected as its two endpoints in the assertion's own direction
 * (`from` = source, `to` = target), with its kind, temporal, provenance, the
 * exact canonical row it decomposes to (`source`), and its position relative to
 * the focal record (`direction` = upstream/downstream ancestor/descendant;
 * `depth` = hop distance, shown for honesty, never as a rank). */
export interface LineageStep {
  source: RevelationSourceRef;
  kind: RelationshipKindRef;
  from: ProjectedNode;
  to: ProjectedNode;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
  direction: "upstream" | "downstream";
  depth: number;
}

/** Institutional succession/formation descent (reveal_organization_lineage): the
 * focal institution, its documented antecedents (upstream) and successors
 * (downstream), each a decomposable LineageStep. Empty arrays are honest
 * absence, not a claim that the institution had no predecessor or successor. */
export interface OrganizationLineageDocument {
  organizationId: string;
  organization: ProjectedNode;
  upstream: LineageStep[];
  downstream: LineageStep[];
}

/** Documented mentorship descent (reveal_person_mentorship_lineage): the focal
 * person, their documented mentors (upstream) and students (downstream), each a
 * decomposable LineageStep. Empty arrays are honest absence. */
export interface PersonMentorshipLineageDocument {
  personId: string;
  person: ProjectedNode;
  upstream: LineageStep[];
  downstream: LineageStep[];
}

// ---- M8.4: continuity & rupture (documented coverage) --------------------

/** One participation inside a coverage span: the person (a doorway), that
 * participation's own dates and provenance, and the exact canonical
 * `participations` row it decomposes to. This is what keeps a coverage span
 * decomposable without remainder -- a span is only ever the union of these. */
export interface CoverageParticipation {
  person: ProjectedNode;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
  source: RevelationSourceRef;
}

/** One documented coverage span in a capacity: the merged interval of a run of
 * overlapping/touching dated participations, summarised by year for the
 * overview, and `isOpen` when its latest participation is open-ended (an
 * explicit CONTINUATION signal -- the only one). `endYear` is null exactly when
 * `isOpen`. The `participations` decompose the span back to its records. */
export interface CoverageSpan {
  startYear: number;
  /** Null exactly when isOpen (an open-ended participation has no documented end). */
  endYear: number | null;
  isOpen: boolean;
  participations: CoverageParticipation[];
}

/** A silence BETWEEN two documented coverage spans in a capacity: the years
 * during which the record documents no participation in that capacity. It is an
 * EVIDENTIARY GAP -- a break in the record -- and is NEVER a demonstrated end. */
export interface CoverageGap {
  fromYear: number;
  toYear: number;
}

/** The documented coverage of ONE participation capacity at the institution: its
 * spans (in reading order, earliest first) and the gaps between them. */
export interface Practice {
  capacity: RevelationCapacityRef;
  spans: CoverageSpan[];
  gaps: CoverageGap[];
}

/** The neutral category the surface reads the institution's own documented
 * status through. Only `ended` carries explicit termination evidence (a
 * documented rupture -- closed/absorbed/succeeded/merged); `active` is
 * continuation of the institution; `paused` is dormant; `historical` is a
 * documented historical state; `unknown` is provisional/status_unknown (the
 * record does not determine the current status). Never inferred from the
 * participation record's shape. */
export type StatusCategory = "active" | "historical" | "ended" | "paused" | "unknown";

/** The institution's own documented status: the raw explicit key from the
 * organizations.status vocabulary and its neutral reading category. */
export interface DocumentedStatus {
  key: string;
  category: StatusCategory;
}

/** A documented closure moment -- a point in time (date + its precision), not an
 * interval. Present only when the record carries a closure date. */
export interface ClosureMoment {
  date: string;
  precision: DatePrecision | null;
}

/** The continuity & rupture revelation document for one institution (from
 * reveal_organization_continuity): the institution, its own documented status
 * and closure, and the documented coverage of each participation capacity over
 * time. An empty practices array with a non-signalling status is an honest
 * absence, not a claim that nothing was sustained. The four honest states
 * (continuation / rupture / evidentiary gap / unknown outcome) are read
 * deterministically from this structure at the surface and never collapsed. */
export interface OrganizationContinuityDocument {
  organizationId: string;
  organization: ProjectedNode;
  status: DocumentedStatus;
  closure: ClosureMoment | null;
  practices: Practice[];
}

// ---- M8.5: documented recurrence (single-entity repetition) --------------

/** The structural category of a recurrence group -- what KIND of documented
 * phenomenon recurred. Structural, never evaluative: `role` = the same
 * participation capacity at the same institution; `event` = documented events of
 * the same kind; `contribution` = documented contributions of the same kind. */
export type RecurrenceCategory = "role" | "event" | "contribution";

/** One documented occurrence within a recurrence group: the exact canonical row
 * it decomposes to (`source`), its own temporal and provenance, and -- where the
 * occurrence points at its own canonical entity -- a `node` doorway (a
 * contribution links to its page; an event carries its title with no page; a
 * role occurrence has no per-occurrence node, its institution being the group
 * anchor). Nothing here is inferred; an undated occurrence keeps its unknown
 * dates. */
export interface RecurrenceOccurrence {
  source: RevelationSourceRef;
  node: ProjectedNode | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** One documented recurrence: a structural phenomenon (the `category` + `label`,
 * e.g. "Director" role, "Expedition" event kind) that the record documents
 * having occurred `count` times -- ALWAYS >= 2 distinct occurrences (a single
 * documented occurrence is not a recurrence). `anchor` is the institution a role
 * recurred at (a ProjectedNode doorway), null for event/contribution kinds. The
 * count is literally the number of `occurrences` and is NEVER a metric, weight,
 * or rank. `occurrences` are in time order (undated last), each decomposable. */
export interface RecurrenceGroup {
  category: RecurrenceCategory;
  label: string;
  anchor: ProjectedNode | null;
  count: number;
  occurrences: RecurrenceOccurrence[];
}

/** The documented-recurrence revelation document for one person (from
 * reveal_person_recurrence): the person, and the phenomena the record documents
 * to have recurred for them (repeated role at an institution, repeated same-kind
 * events, repeated same-kind contributions). An empty groups array is an honest
 * absence, not a claim that nothing recurred. */
export interface PersonRecurrenceDocument {
  personId: string;
  person: ProjectedNode;
  groups: RecurrenceGroup[];
}

/** The documented-recurrence revelation document for one institution (from
 * reveal_organization_recurrence): the institution, and the phenomena the record
 * documents to have recurred for it (repeated same-kind events and contributions;
 * participations are M8.4's continuity lens, not repeated here). An empty groups
 * array is an honest absence. */
export interface OrganizationRecurrenceDocument {
  organizationId: string;
  organization: ProjectedNode;
  groups: RecurrenceGroup[];
}

// ---- M8.6: bounded pathway (C6) ------------------------------------------

/** The structural category of a pathway step -- WHICH kind of explicit assertion
 * forms this link of the chain. Structural, never evaluative. */
export type PathwayStepCategory =
  | "relationship"
  | "institutional_relationship"
  | "participation"
  | "contribution"
  | "event";

/** One step of a documented pathway: a single explicit assertion linking two
 * entities, projected in traversal order (`from` -> `to`), decomposable to its
 * exact canonical row (`source`), with the connecting assertion's category and
 * vocabulary label, its temporal, and its provenance. Both endpoints are
 * ProjectedNode doorways. The step asserts only the documented link it carries;
 * the chain composes steps, and nothing more. */
export interface PathwayStep {
  source: RevelationSourceRef;
  category: PathwayStepCategory;
  label: string;
  from: ProjectedNode;
  to: ProjectedNode;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** The bounded-pathway revelation document for a focal person and a selected
 * target entity (from reveal_person_pathway). Governed by the ENDPOINT RULE: the
 * chain asserts nothing about its endpoints beyond its literal existence.
 *   - `targetResolved` false: the target id did not resolve to a readable entity.
 *   - `found` false: the target resolved but no documented chain of >= 2 and
 *     <= the hop bound connects them (an honest absence, NEVER "not connected").
 *   - `found` true: `steps` is the ordered chain (>= 2), each decomposable, with
 *     `stepCount` its length (a fact, never a rank). */
export interface PersonPathwayDocument {
  fromId: string;
  from: ProjectedNode;
  toId: string;
  to: ProjectedNode | null;
  targetResolved: boolean;
  found: boolean;
  stepCount: number;
  steps: PathwayStep[];
}
