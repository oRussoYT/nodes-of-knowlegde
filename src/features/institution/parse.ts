// Defensive parsers: untyped get_organization / get_organization_participation
// jsonb -> typed documents, or null on an unrecognizable shape. Pure;
// unit-tested. Fails closed. Individual malformed sub-records (a name, an
// identifier, a narrative facet, a participation) are dropped; the rest still
// reads.

import { SOURCE_TYPES, VERIFICATION_STATUSES, type ProvenanceInfo, type SourceType, type VerificationStatus } from "@/features/shared/provenance";
import { DATE_PRECISIONS, type DatePrecision, type TemporalValue } from "@/features/shared/temporal";

import {
  EXTERNAL_IDENTIFIER_SCHEMES,
  NARRATIVE_KINDS,
  ORGANIZATION_NAME_TYPES,
  ORGANIZATION_STATUSES,
  type ExternalIdentifier,
  type ExternalIdentifierScheme,
  type InstitutionParticipationDocument,
  type InstitutionParticipationEntry,
  type NarrativeFacet,
  type NarrativeKind,
  type Organization,
  type OrganizationName,
  type OrganizationNameType,
  type OrganizationStatus,
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
function asStatus(value: unknown): OrganizationStatus | null {
  return inList(ORGANIZATION_STATUSES, value);
}
function asNameType(value: unknown): OrganizationNameType | null {
  return inList(ORGANIZATION_NAME_TYPES, value);
}
function asScheme(value: unknown): ExternalIdentifierScheme | null {
  return inList(EXTERNAL_IDENTIFIER_SCHEMES, value);
}
function asNarrativeKind(value: unknown): NarrativeKind | null {
  return inList(NARRATIVE_KINDS, value);
}

function parseProvenance(value: unknown): ProvenanceInfo | null {
  if (!isRecord(value)) return null;
  const sourceType = inList(SOURCE_TYPES as readonly SourceType[], value.source_type);
  const verificationStatus = inList(VERIFICATION_STATUSES as readonly VerificationStatus[], value.verification_status);
  if (sourceType === null || verificationStatus === null) return null;
  return { sourceType, verificationStatus };
}

/** Builds a shared TemporalValue from a start/end-only jsonb temporal (names). */
function parsePeriodTemporal(value: unknown): TemporalValue {
  const raw = isRecord(value) ? value : {};
  const startDate = asString(raw.start_date);
  return {
    startDate,
    startPrecision: asPrecision(raw.start_precision),
    endDate: asString(raw.end_date),
    endPrecision: asPrecision(raw.end_precision),
    isApproximate: false,
    isOngoing: false,
    dateIsUnknown: startDate === null,
    dateIsUncertain: false,
  };
}

/** Builds a full TemporalValue from an events/participations-style temporal. */
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

function parseName(input: unknown): OrganizationName | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  const name = asString(input.name);
  const nameType = asNameType(input.name_type);
  const provenance = parseProvenance(input.provenance);
  if (id === null || name === null || name.trim() === "" || nameType === null || provenance === null) return null;
  return { id, name, nameType, language: asString(input.language), temporal: parsePeriodTemporal(input.temporal), provenance };
}

function parseIdentifier(input: unknown): ExternalIdentifier | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  const scheme = asScheme(input.scheme);
  const identifierValue = asString(input.identifier_value);
  const provenance = parseProvenance(input.provenance);
  if (id === null || scheme === null || identifierValue === null || identifierValue.trim() === "" || provenance === null) return null;
  return { id, scheme, identifierValue, url: asString(input.url), provenance };
}

function parseFacet(input: unknown): NarrativeFacet | null {
  if (!isRecord(input)) return null;
  const kind = asNarrativeKind(input.kind);
  const body = asString(input.body);
  const provenance = parseProvenance(input.provenance);
  if (kind === null || body === null || body.trim() === "" || provenance === null) return null;
  return { kind, body, provenance };
}

export function parseOrganization(input: unknown): Organization | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  const name = asString(input.name);
  const status = asStatus(input.status);
  const provenance = parseProvenance(input.provenance);
  if (id === null || name === null || name.trim() === "" || status === null || provenance === null) return null;

  let type: Organization["type"] = null;
  if (isRecord(input.type)) {
    const key = asString(input.type.key);
    const label = asString(input.type.label);
    if (key !== null && label !== null) type = { key, label };
  }

  let founding: Organization["founding"] = null;
  if (isRecord(input.founding)) {
    const date = asString(input.founding.date);
    const precision = asPrecision(input.founding.precision);
    if (date !== null && precision !== null) {
      founding = { date, precision, isApproximate: asBoolean(input.founding.is_approximate) };
    }
  }

  let closure: Organization["closure"] = null;
  if (isRecord(input.closure)) {
    const date = asString(input.closure.date);
    const precision = asPrecision(input.closure.precision);
    if (date !== null && precision !== null) closure = { date, precision };
  }

  const names: OrganizationName[] = Array.isArray(input.names)
    ? input.names.map(parseName).filter((n): n is OrganizationName => n !== null)
    : [];
  const externalIdentifiers: ExternalIdentifier[] = Array.isArray(input.external_identifiers)
    ? input.external_identifiers.map(parseIdentifier).filter((x): x is ExternalIdentifier => x !== null)
    : [];
  const narrative: NarrativeFacet[] = Array.isArray(input.narrative)
    ? input.narrative.map(parseFacet).filter((f): f is NarrativeFacet => f !== null)
    : [];

  return {
    id,
    name,
    shortName: asString(input.short_name),
    type,
    status,
    founding,
    closure,
    location: asString(input.location),
    website: asString(input.website),
    provenance,
    names,
    externalIdentifiers,
    narrative,
  };
}

function parseParticipationEntry(input: unknown): InstitutionParticipationEntry | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  if (id === null) return null;

  if (!isRecord(input.capacity)) return null;
  const capacityKey = asString(input.capacity.key);
  const capacityLabel = asString(input.capacity.label);
  if (capacityKey === null || capacityLabel === null) return null;

  if (!isRecord(input.person)) return null;
  const personId = asString(input.person.id);
  const personName = asString(input.person.display_name);
  if (personId === null || personName === null || personName.trim() === "") return null;

  const provenance = parseProvenance(input.provenance);
  if (provenance === null) return null;

  return {
    id,
    capacity: { key: capacityKey, label: capacityLabel },
    person: { id: personId, displayName: personName },
    summary: asString(input.summary),
    temporal: parseFullTemporal(input.temporal),
    provenance,
  };
}

export function parseInstitutionParticipationDocument(input: unknown): InstitutionParticipationDocument | null {
  if (!isRecord(input)) return null;
  const organizationId = asString(input.organization_id);
  if (organizationId === null) return null;
  if (!Array.isArray(input.participations)) return null;

  const participations: InstitutionParticipationEntry[] = [];
  for (const raw of input.participations) {
    const entry = parseParticipationEntry(raw);
    if (entry !== null) participations.push(entry);
  }
  return { organizationId, participations };
}
