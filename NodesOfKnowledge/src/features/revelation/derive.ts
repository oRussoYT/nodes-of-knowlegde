// Pure presentation derivation for the Revelation Engine. No I/O, no JSX, no
// composition, no ranking. The read models have already done the deterministic
// composition and neutral ordering (M8.1: organization name then member
// display_name; M8.2: participant display_name then co-present display_name);
// these only decide whether anything was revealed. A cohort's / anchor's / a
// member's position is fixed reading order, never importance.

import type {
  Cohort,
  CoverageGap,
  CoverageSpan,
  DocumentedStatus,
  GenerationAnchor,
  LineageStep,
  OrganizationContinuityDocument,
  OrganizationGenerationsDocument,
  OrganizationLineageDocument,
  OrganizationRecurrenceDocument,
  Practice,
  PersonCohortsDocument,
  PersonMentorshipLineageDocument,
  PersonPathwayDocument,
  PersonRecurrenceDocument,
  RecurrenceGroup,
  StatusCategory,
} from "./types";

// ---- M8.1: person co-presence ------------------------------------------

export interface PersonCohortsView {
  isEmpty: boolean;
  cohorts: Cohort[];
}

/** A null document (read failed / absent) and an empty cohorts array both read
 * as the same honest absence -- never an error, never a fabricated cohort. */
export function buildPersonCohortsView(document: PersonCohortsDocument | null): PersonCohortsView {
  if (document === null || document.cohorts.length === 0) {
    return { isEmpty: true, cohorts: [] };
  }
  return { isEmpty: false, cohorts: document.cohorts };
}

// ---- M8.2: institution co-presence -------------------------------------

export interface OrganizationGenerationsView {
  isEmpty: boolean;
  anchors: GenerationAnchor[];
}

/** A null document (read failed / absent) and an empty anchors array both read
 * as the same honest absence -- never an error, never a fabricated co-presence. */
export function buildOrganizationGenerationsView(
  document: OrganizationGenerationsDocument | null,
): OrganizationGenerationsView {
  if (document === null || document.anchors.length === 0) {
    return { isEmpty: true, anchors: [] };
  }
  return { isEmpty: false, anchors: document.anchors };
}

// ---- M8.3: lineage & institutional evolution --------------------------

export interface LineageView {
  isEmpty: boolean;
  upstream: LineageStep[];
  downstream: LineageStep[];
}

function buildLineageView(
  document: { upstream: LineageStep[]; downstream: LineageStep[] } | null,
): LineageView {
  if (document === null || (document.upstream.length === 0 && document.downstream.length === 0)) {
    return { isEmpty: true, upstream: [], downstream: [] };
  }
  return { isEmpty: false, upstream: document.upstream, downstream: document.downstream };
}

/** A null document, or both directions empty, both read as the same honest
 * absence -- never an error, never a fabricated or filled chain. Order is the
 * read model's neutral order (depth, then endpoint name); position is reading
 * order, never importance. */
export function buildOrganizationLineageView(
  document: OrganizationLineageDocument | null,
): LineageView {
  return buildLineageView(document);
}

export function buildPersonMentorshipLineageView(
  document: PersonMentorshipLineageDocument | null,
): LineageView {
  return buildLineageView(document);
}

// ---- M8.4: continuity & rupture ---------------------------------------

/** One capacity's coverage, read for presentation. `latestIsOpen` is the SINGLE
 * explicit continuation signal: the latest documented span is open-ended (an
 * ongoing participation). When it is false the practice's outcome is an UNKNOWN
 * OUTCOME -- the record does not document what followed -- NEVER an ending. Gaps
 * carried through are EVIDENTIARY GAPS (silences), never interruptions proven to
 * be ends. Spans are already earliest-first from the read model, and an open
 * span is always the last, so the latest span is simply the last one. */
export interface ContinuityPracticeView {
  capacity: Practice["capacity"];
  spans: CoverageSpan[];
  gaps: CoverageGap[];
  latestIsOpen: boolean;
}

export interface OrganizationContinuityView {
  isEmpty: boolean;
  status: DocumentedStatus;
  closure: OrganizationContinuityDocument["closure"];
  /** The closure year, pre-computed for a year-level status sentence. */
  closureYear: number | null;
  /** True when the institution's own record says something beyond the default
   * 'active' -- a terminal/dormant/historical status, or a recorded closure.
   * This is why a document with no practices can still be a revelation. */
  hasStatusSignal: boolean;
  practices: ContinuityPracticeView[];
}

const SIGNALLING_CATEGORIES: readonly StatusCategory[] = ["historical", "ended", "paused"];

function buildPracticeView(practice: Practice): ContinuityPracticeView {
  const latest = practice.spans.length > 0 ? practice.spans[practice.spans.length - 1] : null;
  return {
    capacity: practice.capacity,
    spans: practice.spans,
    gaps: practice.gaps,
    latestIsOpen: latest != null && latest.isOpen,
  };
}

/** A null document, or an all-default institution with no coverage, both read as
 * the same honest absence. But an explicit terminal/dormant/historical status or
 * a recorded closure IS a revelation even with no coverage -- the record speaks
 * to the institution's continuity directly -- so the view is not empty then. The
 * four honest states are read from this structure; none is fabricated or filled. */
export function buildOrganizationContinuityView(
  document: OrganizationContinuityDocument | null,
): OrganizationContinuityView {
  if (document === null) {
    return {
      isEmpty: true,
      status: { key: "status_unknown", category: "unknown" },
      closure: null,
      closureYear: null,
      hasStatusSignal: false,
      practices: [],
    };
  }

  const closureYear =
    document.closure !== null && /^\d{4}/.test(document.closure.date)
      ? Number(document.closure.date.slice(0, 4))
      : null;

  const hasStatusSignal =
    SIGNALLING_CATEGORIES.includes(document.status.category) || document.closure !== null;

  const practices = document.practices.map(buildPracticeView);

  return {
    isEmpty: practices.length === 0 && !hasStatusSignal,
    status: document.status,
    closure: document.closure,
    closureYear,
    hasStatusSignal,
    practices,
  };
}

// ---- M8.5: documented recurrence --------------------------------------

export interface RecurrenceView {
  isEmpty: boolean;
  groups: RecurrenceGroup[];
}

/** A null document (read failed / absent) and an empty groups array both read as
 * the same honest absence -- never an error, never a fabricated recurrence. The
 * read model already applied the >= 2 rule and the neutral ordering (category,
 * label, key -- never by count); position here is reading order, never rank. */
function buildRecurrenceView(document: { groups: RecurrenceGroup[] } | null): RecurrenceView {
  if (document === null || document.groups.length === 0) {
    return { isEmpty: true, groups: [] };
  }
  return { isEmpty: false, groups: document.groups };
}

export function buildPersonRecurrenceView(
  document: PersonRecurrenceDocument | null,
): RecurrenceView {
  return buildRecurrenceView(document);
}

export function buildOrganizationRecurrenceView(
  document: OrganizationRecurrenceDocument | null,
): RecurrenceView {
  return buildRecurrenceView(document);
}

// ---- M8.6: bounded pathway --------------------------------------------

/** The reading state of the pathway lens, read from the document (which is null
 * only when no target is selected). Kept as four honest, non-collapsed states:
 * no target chosen; the chosen target is not a readable record; the target is
 * readable but no documented chain within the bound connects them; or a chain is
 * shown. The document already carries the literal chain; derive fabricates and
 * fills nothing, and never re-orders or scores. */
export type PathwayViewState = "no-target" | "target-not-found" | "no-chain" | "chain";

export interface PersonPathwayView {
  state: PathwayViewState;
  document: PersonPathwayDocument | null;
}

export function buildPersonPathwayView(
  document: PersonPathwayDocument | null,
): PersonPathwayView {
  if (document === null) {
    return { state: "no-target", document: null };
  }
  if (!document.targetResolved) {
    return { state: "target-not-found", document };
  }
  if (!document.found || document.steps.length === 0) {
    return { state: "no-chain", document };
  }
  return { state: "chain", document };
}

// Provenance labelling is the platform-shared kernel, re-exported so a revealed
// co-present person reads provenance identically to every other engine.
export { describeProvenance as describeRevelationProvenance } from "@/features/shared/provenance";
export type { ProvenanceDescriptor as RevelationProvenanceDescriptor } from "@/features/shared/provenance";
