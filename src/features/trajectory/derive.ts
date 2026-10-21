// Trajectory (PRODUTO.md, screens 01 and 10): a person's documented
// belonging drawn as lanes through time, plus "stop at a year and see who was
// there". Pure derivations over the existing read documents (participation,
// cohorts, mentorship lineage) -- nothing new is stored, nothing is inferred,
// nothing is ranked. Every bar is one participation Assertion; every person in
// a year comes from a documented cohort overlap.

import type { Participation, ParticipationDocument } from "@/features/participation/types";
import type { PersonCohortsDocument, PersonMentorshipLineageDocument } from "@/features/revelation/types";
import type { TemporalValue } from "@/features/shared/temporal";

export interface YearSpan {
  startYear: number;
  /** Inclusive. Equals currentYear for ongoing spans. */
  endYear: number;
  isOngoing: boolean;
  isApproximate: boolean;
  isUncertain: boolean;
}

function yearOf(dateISO: string | null): number | null {
  if (!dateISO) {
    return null;
  }
  const match = /^(\d{4})/.exec(dateISO);
  return match ? Number(match[1]) : null;
}

/** Converts the shared temporal kernel into a drawable inclusive year span,
 * never inventing precision: a decade-precision point covers the whole decade,
 * a single point covers its own year, an unknown date yields null. */
export function toYearSpan(temporal: TemporalValue, currentYear: number): YearSpan | null {
  if (temporal.dateIsUnknown || temporal.startDate === null) {
    return null;
  }
  const start = yearOf(temporal.startDate);
  if (start === null) {
    return null;
  }
  const startYear = temporal.startPrecision === "decade" ? Math.floor(start / 10) * 10 : start;

  let endYear: number;
  if (temporal.isOngoing) {
    endYear = Math.max(currentYear, startYear);
  } else if (temporal.endDate !== null) {
    const end = yearOf(temporal.endDate);
    endYear = end === null ? startYear : temporal.endPrecision === "decade" ? Math.floor(end / 10) * 10 + 9 : end;
  } else {
    endYear = temporal.startPrecision === "decade" ? startYear + 9 : startYear;
  }

  return {
    startYear,
    endYear: Math.max(endYear, startYear),
    isOngoing: temporal.isOngoing,
    isApproximate: temporal.isApproximate,
    isUncertain: temporal.dateIsUncertain,
  };
}

export interface TrajectorySegment extends YearSpan {
  participationId: string;
  capacityLabel: string;
}

export interface TrajectoryLane {
  organizationId: string;
  organizationName: string;
  segments: TrajectorySegment[];
}

export interface TrajectoryView {
  isEmpty: boolean;
  lanes: TrajectoryLane[];
  /** Participations with no usable date -- listed, never drawn at a guessed place. */
  undated: Participation[];
  minYear: number;
  maxYear: number;
  /** Decade ticks inside [minYear, maxYear]. */
  ticks: number[];
}

export function buildTrajectory(document: ParticipationDocument | null, currentYear: number): TrajectoryView {
  const lanesById = new Map<string, TrajectoryLane>();
  const undated: Participation[] = [];

  for (const participation of document?.participations ?? []) {
    const span = toYearSpan(participation.temporal, currentYear);
    if (!span) {
      undated.push(participation);
      continue;
    }
    const orgId = participation.organization.id;
    let lane = lanesById.get(orgId);
    if (!lane) {
      lane = {
        organizationId: orgId,
        organizationName: participation.organization.shortName ?? participation.organization.name,
        segments: [],
      };
      lanesById.set(orgId, lane);
    }
    lane.segments.push({ participationId: participation.id, capacityLabel: participation.capacity.label, ...span });
  }

  // Lanes in the order the life reached them (earliest start first), ties by
  // name -- chronological, never by importance.
  const lanes = [...lanesById.values()]
    .map((lane) => ({ ...lane, segments: [...lane.segments].sort((a, b) => a.startYear - b.startYear) }))
    .sort((a, b) => {
      const diff = (a.segments[0]?.startYear ?? 0) - (b.segments[0]?.startYear ?? 0);
      return diff !== 0 ? diff : a.organizationName.localeCompare(b.organizationName);
    });

  if (lanes.length === 0) {
    return { isEmpty: undated.length === 0, lanes, undated, minYear: currentYear, maxYear: currentYear, ticks: [] };
  }

  const allSegments = lanes.flatMap((lane) => lane.segments);
  const rawMin = Math.min(...allSegments.map((s) => s.startYear));
  const rawMax = Math.max(...allSegments.map((s) => s.endYear));
  const minYear = Math.floor(rawMin / 5) * 5;
  const maxYear = Math.max(Math.ceil((rawMax + 1) / 5) * 5, minYear + 5);

  const ticks: number[] = [];
  for (let year = Math.ceil(minYear / 10) * 10; year <= maxYear; year += 10) {
    ticks.push(year);
  }

  return { isEmpty: false, lanes, undated, minYear, maxYear, ticks };
}

/** Position of a year on the axis, as a percentage of its width. */
export function percentOf(year: number, view: Pick<TrajectoryView, "minYear" | "maxYear">): number {
  const range = view.maxYear - view.minYear;
  if (range <= 0) {
    return 0;
  }
  return ((year - view.minYear) / range) * 100;
}

// ---- "Stop at a year" ---------------------------------------------------

/** A flat, serializable row of documented co-presence, safe to hand to a
 * Client Component. */
export interface PresenceRow {
  personId: string;
  personLabel: string;
  personHref: string | null;
  organizationId: string;
  organizationLabel: string;
  capacityLabel: string;
  startYear: number;
  endYear: number;
}

export function buildPresenceRows(cohorts: PersonCohortsDocument | null, currentYear: number): PresenceRow[] {
  const rows: PresenceRow[] = [];
  for (const cohort of cohorts?.cohorts ?? []) {
    for (const member of cohort.members) {
      const span = toYearSpan(member.temporal, currentYear);
      if (!span) {
        continue;
      }
      rows.push({
        personId: member.person.id,
        personLabel: member.person.label,
        personHref: member.person.href,
        organizationId: cohort.organization.id,
        organizationLabel: cohort.organization.label,
        capacityLabel: member.capacity.label,
        startYear: span.startYear,
        endYear: span.endYear,
      });
    }
  }
  return rows;
}

export interface YearPresenceGroup {
  organizationId: string;
  organizationLabel: string;
  people: { personId: string; personLabel: string; personHref: string | null; capacityLabel: string }[];
}

/** Who the record documents alongside this person in one year, grouped by
 * institution. Alphabetical inside each group -- never ranked. */
export function presentInYear(rows: PresenceRow[], year: number): YearPresenceGroup[] {
  const groups = new Map<string, YearPresenceGroup>();
  for (const row of rows) {
    if (year < row.startYear || year > row.endYear) {
      continue;
    }
    let group = groups.get(row.organizationId);
    if (!group) {
      group = { organizationId: row.organizationId, organizationLabel: row.organizationLabel, people: [] };
      groups.set(row.organizationId, group);
    }
    if (!group.people.some((p) => p.personId === row.personId)) {
      group.people.push({
        personId: row.personId,
        personLabel: row.personLabel,
        personHref: row.personHref,
        capacityLabel: row.capacityLabel,
      });
    }
  }
  return [...groups.values()]
    .map((g) => ({ ...g, people: [...g.people].sort((a, b) => a.personLabel.localeCompare(b.personLabel)) }))
    .sort((a, b) => a.organizationLabel.localeCompare(b.organizationLabel));
}

// ---- Overview band (screen 01) -------------------------------------------

export interface PersonOverview {
  institutions: number;
  documentedAlongside: number;
  mentoredBy: number;
  mentored: number;
  firstYear: number | null;
  lastYear: number | null;
}

function uniqueDirectNeighbours(lineage: PersonMentorshipLineageDocument | null, direction: "upstream" | "downstream") {
  if (!lineage) {
    return 0;
  }
  const steps = direction === "upstream" ? lineage.upstream : lineage.downstream;
  const ids = new Set<string>();
  for (const step of steps) {
    if (step.depth !== 1) {
      continue;
    }
    const other = step.from.id === lineage.personId ? step.to : step.from;
    if (other.id !== lineage.personId) {
      ids.add(other.id);
    }
  }
  return ids.size;
}

export function buildPersonOverview(
  trajectory: TrajectoryView,
  cohorts: PersonCohortsDocument | null,
  lineage: PersonMentorshipLineageDocument | null,
): PersonOverview {
  const alongside = new Set<string>();
  for (const cohort of cohorts?.cohorts ?? []) {
    for (const member of cohort.members) {
      alongside.add(member.person.id);
    }
  }
  const segments = trajectory.lanes.flatMap((lane) => lane.segments);
  return {
    institutions: trajectory.lanes.length,
    documentedAlongside: alongside.size,
    mentoredBy: uniqueDirectNeighbours(lineage, "upstream"),
    mentored: uniqueDirectNeighbours(lineage, "downstream"),
    firstYear: segments.length ? Math.min(...segments.map((s) => s.startYear)) : null,
    lastYear: segments.length ? Math.max(...segments.map((s) => s.endYear)) : null,
  };
}
