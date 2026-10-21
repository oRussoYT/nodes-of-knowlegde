// Defensive parser: untyped get_person_timeline jsonb -> TimelineDocument, or
// null on an unrecognizable shape. Pure; unit-tested. Fails closed. An
// individual malformed event is dropped (the rest of the timeline still
// reads) rather than failing the whole document -- honest partial history is
// better than none, and a dropped event is never shown as anything.

import {
  DATE_PRECISIONS,
  EVENT_VERIFICATION_STATUSES,
  SOURCE_TYPES,
  type DatePrecision,
  type EventTemporal,
  type EventVerificationStatus,
  type SourceType,
  type TimelineDocument,
  type TimelineEvent,
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

function asVerification(value: unknown): EventVerificationStatus | null {
  return typeof value === "string" && (EVENT_VERIFICATION_STATUSES as readonly string[]).includes(value)
    ? (value as EventVerificationStatus)
    : null;
}

function parseEvent(input: unknown): TimelineEvent | null {
  if (!isRecord(input)) return null;

  const id = asString(input.id);
  const title = asString(input.title);
  if (id === null || title === null || title.trim() === "") return null;

  const kindRaw = input.kind;
  if (!isRecord(kindRaw)) return null;
  const kindKey = asString(kindRaw.key);
  const kindLabel = asString(kindRaw.label);
  if (kindKey === null || kindLabel === null) return null;

  const temporalRaw = input.temporal;
  if (!isRecord(temporalRaw)) return null;
  const temporal: EventTemporal = {
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
    kind: { key: kindKey, label: kindLabel },
    title,
    summary: asString(input.summary),
    place: asString(input.place),
    temporal,
    provenance: { sourceType, verificationStatus },
  };
}

export function parseTimelineDocument(input: unknown): TimelineDocument | null {
  if (!isRecord(input)) return null;
  const personId = asString(input.person_id);
  if (personId === null) return null;
  if (!Array.isArray(input.events)) return null;

  const events: TimelineEvent[] = [];
  for (const raw of input.events) {
    const event = parseEvent(raw);
    if (event !== null) {
      events.push(event);
    }
  }

  return { personId, events };
}
