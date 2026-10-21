// Defensive parser: validates the untyped jsonb returned by
// public.get_person_biography into a typed BiographyDocument, or null if the
// shape is unrecognizable. Pure and dependency-free so it is unit-testable
// without a database (tests/unit/biography-parse.test.ts). Fails closed: an
// unexpected shape yields null (the page then renders an honest not-found)
// rather than a partially-trusted object.

import {
  NARRATIVE_VERIFICATION_STATUSES,
  PERSON_VERIFICATION_STATUSES,
  SOURCE_TYPES,
  type BiographyDocument,
  type BiographyNarrative,
  type NarrativeVerificationStatus,
  type PersonVerificationStatus,
  type SourceType,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asSourceType(value: unknown): SourceType | null {
  return typeof value === "string" && (SOURCE_TYPES as readonly string[]).includes(value)
    ? (value as SourceType)
    : null;
}

function asPersonVerificationStatus(value: unknown): PersonVerificationStatus | null {
  return typeof value === "string" && (PERSON_VERIFICATION_STATUSES as readonly string[]).includes(value)
    ? (value as PersonVerificationStatus)
    : null;
}

function asNarrativeVerificationStatus(value: unknown): NarrativeVerificationStatus | null {
  return typeof value === "string" && (NARRATIVE_VERIFICATION_STATUSES as readonly string[]).includes(value)
    ? (value as NarrativeVerificationStatus)
    : null;
}

function parseNarrative(value: unknown): BiographyNarrative | null | "invalid" {
  // The function encodes "no narrative" as JSON null; distinguish that
  // (valid: null narrative) from a malformed narrative object (invalid).
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    return "invalid";
  }
  const body = asString(value.body);
  const sourceType = asSourceType(value.source_type);
  const verificationStatus = asNarrativeVerificationStatus(value.verification_status);
  if (body === null || body.trim() === "" || sourceType === null || verificationStatus === null) {
    return "invalid";
  }
  return { body, sourceType, verificationStatus };
}

export function parseBiographyDocument(input: unknown): BiographyDocument | null {
  if (!isRecord(input)) {
    return null;
  }

  const personId = asString(input.person_id);
  if (personId === null) {
    return null;
  }

  const identityRaw = input.identity;
  if (!isRecord(identityRaw)) {
    return null;
  }
  const displayName = asString(identityRaw.display_name);
  const givenName = asString(identityRaw.given_name);
  const familyName = asString(identityRaw.family_name);
  const isDeceased = asBoolean(identityRaw.is_deceased);
  const preferredNameRaw = identityRaw.preferred_name;
  const preferredName = preferredNameRaw === null || preferredNameRaw === undefined ? null : asString(preferredNameRaw);
  if (
    displayName === null ||
    givenName === null ||
    familyName === null ||
    isDeceased === null ||
    (preferredNameRaw !== null && preferredNameRaw !== undefined && preferredName === null)
  ) {
    return null;
  }

  const provenanceRaw = input.provenance;
  if (!isRecord(provenanceRaw)) {
    return null;
  }
  const sourceType = asSourceType(provenanceRaw.source_type);
  const verificationStatus = asPersonVerificationStatus(provenanceRaw.verification_status);
  if (sourceType === null || verificationStatus === null) {
    return null;
  }

  const isClaimed = asBoolean(input.is_claimed);
  if (isClaimed === null) {
    return null;
  }

  const withheld: string[] = Array.isArray(input.withheld)
    ? input.withheld.filter((entry): entry is string => typeof entry === "string")
    : [];

  const narrative = parseNarrative(input.narrative);
  if (narrative === "invalid") {
    return null;
  }

  return {
    personId,
    identity: { displayName, givenName, familyName, preferredName, isDeceased },
    provenance: { sourceType, verificationStatus },
    isClaimed,
    withheld,
    narrative,
  };
}
