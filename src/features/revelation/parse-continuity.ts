// Defensive parser for the M8.4 continuity document (documented coverage &
// rupture of one institution): untyped revelation jsonb -> typed reading
// projection, or null on an unrecognizable shape. Same fail-closed discipline as
// parse.ts / parse-organization.ts / parse-lineage.ts: an individual malformed
// participation, span, gap, or practice is dropped (the rest still reads);
// parsing only ever REMOVES, never invents. Reuses the shared node/temporal/
// provenance primitives (./parse-shared). The four honest states are NOT decided
// here -- this only shapes the raw structure; derive.ts reads the states from it.

import {
  isRecord,
  asString,
  asNonBlankString,
  asPrecision,
  parseCapacity,
  parseNode,
  parseProvenance,
  parseSourceRef,
  parseTemporal,
} from "./parse-shared";
import type {
  ClosureMoment,
  CoverageGap,
  CoverageParticipation,
  CoverageSpan,
  DocumentedStatus,
  OrganizationContinuityDocument,
  Practice,
  StatusCategory,
} from "./types";

const STATUS_CATEGORIES: readonly StatusCategory[] = [
  "active",
  "historical",
  "ended",
  "paused",
  "unknown",
] as const;

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/** A participation inside a coverage span: a person node, its own temporal and
 * provenance, and the exact canonical participations row it decomposes to. A
 * malformed one is dropped so the span still reads from its valid records. */
function parseCoverageParticipation(input: unknown): CoverageParticipation | null {
  if (!isRecord(input)) return null;

  const person = parseNode(input.person);
  if (person === null || person.type !== "person") return null;

  const temporal = parseTemporal(input.temporal);
  if (temporal === null) return null;

  const provenance = parseProvenance(input.provenance);
  if (provenance === null) return null;

  const source = parseSourceRef(input.source);
  if (source === null) return null;

  return { person, temporal, provenance, source };
}

/** A coverage span: a start year, an end year (null exactly when open-ended),
 * the open flag, and at least one decomposable participation. A span with no
 * valid participations is dropped -- coverage that cannot be decomposed to a
 * record is never shown. */
function parseSpan(input: unknown): CoverageSpan | null {
  if (!isRecord(input)) return null;

  const startYear = asInteger(input.start_year);
  if (startYear === null) return null;

  const isOpen = input.is_open === true;
  const endYear = asInteger(input.end_year);
  // Contract: end_year is present exactly when the span is closed.
  if (isOpen && endYear !== null) return null;
  if (!isOpen && endYear === null) return null;

  if (!Array.isArray(input.participations)) return null;
  const participations: CoverageParticipation[] = [];
  for (const item of input.participations) {
    const p = parseCoverageParticipation(item);
    if (p !== null) participations.push(p);
  }
  if (participations.length === 0) return null;

  return { startYear, endYear, isOpen, participations };
}

/** A gap between two documented spans: from-year then to-year. A gap whose
 * bounds are not both integers is dropped. */
function parseGap(input: unknown): CoverageGap | null {
  if (!isRecord(input)) return null;
  const fromYear = asInteger(input.from_year);
  const toYear = asInteger(input.to_year);
  if (fromYear === null || toYear === null) return null;
  return { fromYear, toYear };
}

/** One capacity's documented coverage. Dropped if the capacity ref is missing or
 * no valid span survives (a practice with no decomposable coverage is not a
 * revelation). */
function parsePractice(input: unknown): Practice | null {
  if (!isRecord(input)) return null;

  const capacity = parseCapacity(input.capacity);
  if (capacity === null) return null;

  if (!Array.isArray(input.spans)) return null;
  const spans: CoverageSpan[] = [];
  for (const item of input.spans) {
    const s = parseSpan(item);
    if (s !== null) spans.push(s);
  }
  if (spans.length === 0) return null;

  const gaps: CoverageGap[] = [];
  if (Array.isArray(input.gaps)) {
    for (const item of input.gaps) {
      const g = parseGap(item);
      if (g !== null) gaps.push(g);
    }
  }

  return { capacity, spans, gaps };
}

/** The institution's own documented status. A missing/unrecognizable category
 * degrades to 'unknown' rather than failing the whole document -- the status is
 * framing, not the coverage; but the raw key must be a non-blank string. */
function parseStatus(input: unknown): DocumentedStatus | null {
  if (!isRecord(input)) return null;
  const key = asNonBlankString(input.key);
  if (key === null) return null;
  const rawCategory = asString(input.status_category);
  const category: StatusCategory =
    rawCategory !== null && (STATUS_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as StatusCategory)
      : "unknown";
  return { key, category };
}

/** A documented closure moment (date + precision). Null (absent) is a valid,
 * common state; a present-but-malformed closure degrades to null rather than
 * failing the document. */
function parseClosure(input: unknown): ClosureMoment | null {
  if (input === null || input === undefined) return null;
  if (!isRecord(input)) return null;
  const date = asNonBlankString(input.date);
  if (date === null) return null;
  return { date, precision: asPrecision(input.precision) };
}

export function parseOrganizationContinuityDocument(
  input: unknown,
): OrganizationContinuityDocument | null {
  if (!isRecord(input)) return null;

  const organizationId = asString(input.organization_id);
  if (organizationId === null) return null;

  const organization = parseNode(input.organization);
  if (organization === null || organization.type !== "organization") return null;

  const status = parseStatus(input.status);
  if (status === null) return null;

  if (!Array.isArray(input.practices)) return null;
  const practices: Practice[] = [];
  for (const item of input.practices) {
    const practice = parsePractice(item);
    if (practice !== null) practices.push(practice);
  }

  return {
    organizationId,
    organization,
    status,
    closure: parseClosure(input.closure),
    practices,
  };
}
