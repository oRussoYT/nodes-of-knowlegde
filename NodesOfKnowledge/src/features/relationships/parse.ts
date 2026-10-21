// Defensive parser: untyped get_person_relationships jsonb ->
// RelationshipDocument, or null on an unrecognizable shape. Pure; unit-tested.
// Fails closed. An individual malformed relationship is dropped (the rest still
// reads) rather than failing the whole document.

import { SOURCE_TYPES, VERIFICATION_STATUSES, type SourceType, type VerificationStatus } from "@/features/shared/provenance";
import { DATE_PRECISIONS, type DatePrecision, type TemporalValue } from "@/features/shared/temporal";

import { RELATIONSHIP_DIRECTIONS, type Relationship, type RelationshipDirection, type RelationshipDocument } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asPrecision(value: unknown): DatePrecision | null {
  return typeof value === "string" && (DATE_PRECISIONS as readonly string[]).includes(value)
    ? (value as DatePrecision)
    : null;
}

function asSourceType(value: unknown): SourceType | null {
  return typeof value === "string" && (SOURCE_TYPES as readonly string[]).includes(value)
    ? (value as SourceType)
    : null;
}

function asVerification(value: unknown): VerificationStatus | null {
  return typeof value === "string" && (VERIFICATION_STATUSES as readonly string[]).includes(value)
    ? (value as VerificationStatus)
    : null;
}

function asDirection(value: unknown): RelationshipDirection | null {
  return typeof value === "string" && (RELATIONSHIP_DIRECTIONS as readonly string[]).includes(value)
    ? (value as RelationshipDirection)
    : null;
}

function parseRelationship(input: unknown): Relationship | null {
  if (!isRecord(input)) return null;

  const id = asString(input.id);
  if (id === null) return null;

  const kindRaw = input.kind;
  if (!isRecord(kindRaw)) return null;
  const kindKey = asString(kindRaw.key);
  const kindLabel = asString(kindRaw.label);
  if (kindKey === null || kindLabel === null) return null;

  const counterpartRaw = input.counterpart;
  if (!isRecord(counterpartRaw)) return null;
  const counterpartId = asString(counterpartRaw.id);
  const counterpartName = asString(counterpartRaw.display_name);
  if (counterpartId === null || counterpartName === null || counterpartName.trim() === "") return null;

  const perspectiveRaw = input.perspective;
  if (!isRecord(perspectiveRaw)) return null;
  const personRoleLabel = asString(perspectiveRaw.person_role_label);
  const counterpartRoleLabel = asString(perspectiveRaw.counterpart_role_label);
  const counterpartRoleLabelPlural = asString(perspectiveRaw.counterpart_role_label_plural);
  const direction = asDirection(perspectiveRaw.direction);
  if (
    personRoleLabel === null ||
    counterpartRoleLabel === null ||
    counterpartRoleLabelPlural === null ||
    direction === null
  ) {
    return null;
  }

  const temporalRaw = input.temporal;
  if (!isRecord(temporalRaw)) return null;
  const temporal: TemporalValue = {
    startDate: asString(temporalRaw.start_date),
    startPrecision: asPrecision(temporalRaw.start_precision),
    endDate: asString(temporalRaw.end_date),
    endPrecision: asPrecision(temporalRaw.end_precision),
    isApproximate: asBoolean(temporalRaw.is_approximate),
    isOngoing: asBoolean(temporalRaw.is_ongoing),
    dateIsUnknown: asBoolean(temporalRaw.date_is_unknown),
    dateIsUncertain: asBoolean(temporalRaw.date_is_uncertain),
  };

  const provenanceRaw = input.provenance;
  if (!isRecord(provenanceRaw)) return null;
  const sourceType = asSourceType(provenanceRaw.source_type);
  const verificationStatus = asVerification(provenanceRaw.verification_status);
  if (sourceType === null || verificationStatus === null) return null;

  return {
    id,
    kind: { key: kindKey, label: kindLabel, isDirectional: asBoolean(kindRaw.is_directional) },
    counterpart: { id: counterpartId, displayName: counterpartName },
    perspective: { personRoleLabel, counterpartRoleLabel, counterpartRoleLabelPlural, direction },
    narrative: asString(input.narrative),
    temporal,
    provenance: { sourceType, verificationStatus },
  };
}

export function parseRelationshipDocument(input: unknown): RelationshipDocument | null {
  if (!isRecord(input)) return null;
  const personId = asString(input.person_id);
  if (personId === null) return null;
  if (!Array.isArray(input.relationships)) return null;

  const relationships: Relationship[] = [];
  for (const raw of input.relationships) {
    const relationship = parseRelationship(raw);
    if (relationship !== null) {
      relationships.push(relationship);
    }
  }

  return { personId, relationships };
}
