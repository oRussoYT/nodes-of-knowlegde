// Defensive parsers: untyped get_contribution / get_person_contributions /
// get_organization_contributions jsonb -> typed documents, or null on an
// unrecognizable shape. Pure; unit-tested. Fails closed. Individual malformed
// sub-records (a narrative facet, a contributor, a projection entry) are
// dropped; the rest still reads.

import {
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  type ProvenanceInfo,
  type SourceType,
  type VerificationStatus,
} from "@/features/shared/provenance";
import { DATE_PRECISIONS, type DatePrecision, type TemporalValue } from "@/features/shared/temporal";

import {
  CONTRIBUTION_NARRATIVE_KINDS,
  type CapacityRef,
  type Contribution,
  type ContributionAttributionEntry,
  type ContributionKindRef,
  type ContributionNarrativeFacet,
  type ContributionNarrativeKind,
  type ContributionSummaryRef,
  type OrganizationContributor,
  type OrganizationContributionsDocument,
  type PersonContributor,
  type PersonContributionsDocument,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function asBoolean(value: unknown): boolean {
  return value === true;
}
function inList<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;
}
function asPrecision(value: unknown): DatePrecision | null {
  return inList(DATE_PRECISIONS, value);
}
function asNarrativeKind(value: unknown): ContributionNarrativeKind | null {
  return inList(CONTRIBUTION_NARRATIVE_KINDS, value);
}

function parseProvenance(value: unknown): ProvenanceInfo | null {
  if (!isRecord(value)) return null;
  const sourceType = inList(SOURCE_TYPES as readonly SourceType[], value.source_type);
  const verificationStatus = inList(VERIFICATION_STATUSES as readonly VerificationStatus[], value.verification_status);
  if (sourceType === null || verificationStatus === null) return null;
  return { sourceType, verificationStatus };
}

/** The shared full Many-Clocks temporal value from an events-style jsonb. */
function parseFullTemporal(value: unknown): TemporalValue {
  const raw = isRecord(value) ? value : {};
  return {
    startDate: asString(raw.start_date),
    startPrecision: asPrecision(raw.start_precision),
    endDate: asString(raw.end_date),
    endPrecision: asPrecision(raw.end_precision),
    isApproximate: asBoolean(raw.is_approximate),
    isOngoing: asBoolean(raw.is_ongoing),
    dateIsUnknown: asBoolean(raw.date_is_unknown),
    dateIsUncertain: asBoolean(raw.date_is_uncertain),
  };
}

/** A { key, label } ref, or null when either is missing. */
function parseKindRef(value: unknown): ContributionKindRef | null {
  if (!isRecord(value)) return null;
  const key = asString(value.key);
  const label = asString(value.label);
  return key !== null && label !== null ? { key, label } : null;
}
function parseCapacity(value: unknown): CapacityRef | null {
  if (!isRecord(value)) return null;
  const key = asString(value.key);
  const label = asString(value.label);
  return key !== null && label !== null ? { key, label } : null;
}

function parseFacet(input: unknown): ContributionNarrativeFacet | null {
  if (!isRecord(input)) return null;
  const kind = asNarrativeKind(input.kind);
  const body = asString(input.body);
  const provenance = parseProvenance(input.provenance);
  if (kind === null || body === null || body.trim() === "" || provenance === null) return null;
  return { kind, body, provenance };
}

function parsePersonContributor(input: unknown): PersonContributor | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  if (id === null) return null;
  if (!isRecord(input.person)) return null;
  const personId = asString(input.person.id);
  const personName = asString(input.person.display_name);
  if (personId === null || personName === null || personName.trim() === "") return null;
  const capacity = parseCapacity(input.capacity);
  const provenance = parseProvenance(input.provenance);
  if (capacity === null || provenance === null) return null;
  return { id, person: { id: personId, displayName: personName }, capacity, attributionNote: asString(input.attribution_note), provenance };
}

function parseOrganizationContributor(input: unknown): OrganizationContributor | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  if (id === null) return null;
  if (!isRecord(input.organization)) return null;
  const orgId = asString(input.organization.id);
  const orgName = asString(input.organization.name);
  if (orgId === null || orgName === null || orgName.trim() === "") return null;
  const capacity = parseCapacity(input.capacity);
  const provenance = parseProvenance(input.provenance);
  if (capacity === null || provenance === null) return null;
  return {
    id,
    organization: { id: orgId, name: orgName, shortName: asString(input.organization.short_name) },
    capacity,
    attributionNote: asString(input.attribution_note),
    provenance,
  };
}

export function parseContribution(input: unknown): Contribution | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  const title = asString(input.title);
  const provenance = parseProvenance(input.provenance);
  if (id === null || title === null || title.trim() === "" || provenance === null) return null;

  const narrative: ContributionNarrativeFacet[] = Array.isArray(input.narrative)
    ? input.narrative.map(parseFacet).filter((f): f is ContributionNarrativeFacet => f !== null)
    : [];

  const contributorsRaw = isRecord(input.contributors) ? input.contributors : {};
  const people: PersonContributor[] = Array.isArray(contributorsRaw.people)
    ? contributorsRaw.people.map(parsePersonContributor).filter((p): p is PersonContributor => p !== null)
    : [];
  const organizations: OrganizationContributor[] = Array.isArray(contributorsRaw.organizations)
    ? contributorsRaw.organizations.map(parseOrganizationContributor).filter((o): o is OrganizationContributor => o !== null)
    : [];

  return {
    id,
    title,
    kind: parseKindRef(input.kind),
    description: asString(input.description),
    temporal: parseFullTemporal(input.temporal),
    place: asString(input.place),
    provenance,
    narrative,
    contributors: { people, organizations },
  };
}

function parseSummaryRef(value: unknown): ContributionSummaryRef | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const title = asString(value.title);
  const provenance = parseProvenance(value.provenance);
  if (id === null || title === null || title.trim() === "" || provenance === null) return null;
  return { id, title, kind: parseKindRef(value.kind), temporal: parseFullTemporal(value.temporal), provenance };
}

function parseAttributionEntry(input: unknown): ContributionAttributionEntry | null {
  if (!isRecord(input)) return null;
  const attributionId = asString(input.attribution_id);
  const capacity = parseCapacity(input.capacity);
  const attributionProvenance = parseProvenance(input.attribution_provenance);
  const contribution = parseSummaryRef(input.contribution);
  if (attributionId === null || capacity === null || attributionProvenance === null || contribution === null) return null;
  return { attributionId, capacity, attributionNote: asString(input.attribution_note), attributionProvenance, contribution };
}

export function parsePersonContributionsDocument(input: unknown): PersonContributionsDocument | null {
  if (!isRecord(input)) return null;
  const personId = asString(input.person_id);
  if (personId === null || !Array.isArray(input.contributions)) return null;
  const contributions: ContributionAttributionEntry[] = [];
  for (const raw of input.contributions) {
    const entry = parseAttributionEntry(raw);
    if (entry !== null) contributions.push(entry);
  }
  return { personId, contributions };
}

export function parseOrganizationContributionsDocument(input: unknown): OrganizationContributionsDocument | null {
  if (!isRecord(input)) return null;
  const organizationId = asString(input.organization_id);
  if (organizationId === null || !Array.isArray(input.contributions)) return null;
  const contributions: ContributionAttributionEntry[] = [];
  for (const raw of input.contributions) {
    const entry = parseAttributionEntry(raw);
    if (entry !== null) contributions.push(entry);
  }
  return { organizationId, contributions };
}
