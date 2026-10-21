// Defensive parser: untyped get_person_participation jsonb ->
// ParticipationDocument, or null on an unrecognizable shape. Pure;
// unit-tested. Fails closed. An individual malformed participation is dropped
// (the rest still reads) rather than failing the whole document -- honest
// partial history is better than none, and a dropped participation is never
// shown as anything.

import { SOURCE_TYPES, VERIFICATION_STATUSES, type SourceType, type VerificationStatus } from "@/features/shared/provenance";
import { DATE_PRECISIONS, type DatePrecision, type TemporalValue } from "@/features/shared/temporal";

import type { Participation, ParticipationDocument } from "./types";

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

function parseParticipation(input: unknown): Participation | null {
  if (!isRecord(input)) return null;

  const id = asString(input.id);
  if (id === null) return null;

  const orgRaw = input.organization;
  if (!isRecord(orgRaw)) return null;
  const orgId = asString(orgRaw.id);
  const orgName = asString(orgRaw.name);
  if (orgId === null || orgName === null || orgName.trim() === "") return null;

  const capacityRaw = input.capacity;
  if (!isRecord(capacityRaw)) return null;
  const capacityKey = asString(capacityRaw.key);
  const capacityLabel = asString(capacityRaw.label);
  if (capacityKey === null || capacityLabel === null) return null;

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
    organization: { id: orgId, name: orgName, shortName: asString(orgRaw.short_name) },
    capacity: { key: capacityKey, label: capacityLabel },
    summary: asString(input.summary),
    temporal,
    provenance: { sourceType, verificationStatus },
  };
}

export function parseParticipationDocument(input: unknown): ParticipationDocument | null {
  if (!isRecord(input)) return null;
  const personId = asString(input.person_id);
  if (personId === null) return null;
  if (!Array.isArray(input.participations)) return null;

  const participations: Participation[] = [];
  for (const raw of input.participations) {
    const participation = parseParticipation(raw);
    if (participation !== null) {
      participations.push(participation);
    }
  }

  return { personId, participations };
}
