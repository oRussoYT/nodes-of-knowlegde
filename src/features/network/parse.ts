// Defensive parsers: untyped network jsonb -> typed reading projections, or
// null on an unrecognizable shape. Pure; unit-tested; fails closed. An
// individual malformed connection is dropped (the rest still reads) rather than
// failing the whole document -- the same discipline as the M6 parsers.

import {
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  type SourceType,
  type VerificationStatus,
} from "@/features/shared/provenance";
import { DATE_PRECISIONS, type DatePrecision, type TemporalValue } from "@/features/shared/temporal";

import {
  CONNECTION_DIRECTIONS,
  CONNECTION_FAMILIES,
  INSTITUTIONAL_RELATIONSHIP_DIRECTIONS,
  NETWORK_NODE_TYPES,
  type ConnectionDirection,
  type ConnectionFamily,
  type ConnectionKindRef,
  type ConnectionPerspective,
  type InstitutionalRelationship,
  type InstitutionalRelationshipDirection,
  type InstitutionalRelationshipDocument,
  type NetworkDocument,
  type NetworkNodeType,
  type ProjectedConnection,
  type ProjectedNode,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNonBlankString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
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

/** Verification is optional on a node (events/organizations may carry it, some
 * nodes legitimately have none); an unrecognized value degrades to null rather
 * than rejecting the node. */
function asVerificationOrNull(value: unknown): VerificationStatus | null {
  if (value === null || value === undefined) return null;
  return asVerification(value);
}

function asNodeType(value: unknown): NetworkNodeType | null {
  return typeof value === "string" && (NETWORK_NODE_TYPES as readonly string[]).includes(value)
    ? (value as NetworkNodeType)
    : null;
}

function asFamily(value: unknown): ConnectionFamily | null {
  return typeof value === "string" && (CONNECTION_FAMILIES as readonly string[]).includes(value)
    ? (value as ConnectionFamily)
    : null;
}

function asDirection(value: unknown): ConnectionDirection | null {
  return typeof value === "string" && (CONNECTION_DIRECTIONS as readonly string[]).includes(value)
    ? (value as ConnectionDirection)
    : null;
}

function parseTemporal(input: unknown): TemporalValue | null {
  if (input === null || input === undefined) return null;
  if (!isRecord(input)) return null;
  return {
    startDate: asString(input.start_date),
    startPrecision: asPrecision(input.start_precision),
    endDate: asString(input.end_date),
    endPrecision: asPrecision(input.end_precision),
    isApproximate: asBoolean(input.is_approximate),
    isOngoing: asBoolean(input.is_ongoing),
    dateIsUnknown: asBoolean(input.date_is_unknown),
    dateIsUncertain: asBoolean(input.date_is_uncertain),
  };
}

function parseNode(input: unknown): ProjectedNode | null {
  if (!isRecord(input)) return null;
  const type = asNodeType(input.type);
  const id = asString(input.id);
  const label = asNonBlankString(input.label);
  if (type === null || id === null || label === null) return null;
  return {
    type,
    id,
    label,
    secondaryLabel: asString(input.secondary_label),
    href: asString(input.href),
    verificationStatus: asVerificationOrNull(input.verification_status),
  };
}

function parseKind(input: unknown): ConnectionKindRef | null {
  if (input === null || input === undefined) return null;
  if (!isRecord(input)) return null;
  const key = asString(input.key);
  const label = asNonBlankString(input.label);
  if (key === null || label === null) return null;
  return { key, label };
}

function parsePerspective(input: unknown): ConnectionPerspective | null {
  if (input === null || input === undefined) return null;
  if (!isRecord(input)) return null;
  const focalRoleLabel = asString(input.focal_role_label);
  const counterpartRoleLabel = asString(input.counterpart_role_label);
  const counterpartRoleLabelPlural = asString(input.counterpart_role_label_plural);
  if (focalRoleLabel === null || counterpartRoleLabel === null || counterpartRoleLabelPlural === null) {
    return null;
  }
  return { focalRoleLabel, counterpartRoleLabel, counterpartRoleLabelPlural };
}

function parseConnection(input: unknown): ProjectedConnection | null {
  if (!isRecord(input)) return null;

  const id = asString(input.id);
  const family = asFamily(input.family);
  const direction = asDirection(input.direction);
  if (id === null || family === null || direction === null) return null;

  const node = parseNode(input.node);
  if (node === null) return null;

  const provenanceRaw = input.provenance;
  if (!isRecord(provenanceRaw)) return null;
  const sourceType = asSourceType(provenanceRaw.source_type);
  const verificationStatus = asVerification(provenanceRaw.verification_status);
  if (sourceType === null || verificationStatus === null) return null;

  const sourceRaw = input.source;
  if (!isRecord(sourceRaw)) return null;
  const sourceTypeName = asNonBlankString(sourceRaw.type);
  const sourceId = asString(sourceRaw.id);
  if (sourceTypeName === null || sourceId === null) return null;

  return {
    id,
    family,
    direction,
    node,
    kind: parseKind(input.kind),
    perspective: parsePerspective(input.perspective),
    temporal: parseTemporal(input.temporal),
    provenance: { sourceType, verificationStatus },
    source: { type: sourceTypeName, id: sourceId },
    visibility: "visible",
  };
}

export function parseNetworkDocument(input: unknown): NetworkDocument | null {
  if (!isRecord(input)) return null;
  const focal = parseNode(input.focal);
  if (focal === null) return null;
  if (!Array.isArray(input.connections)) return null;

  const connections: ProjectedConnection[] = [];
  for (const raw of input.connections) {
    const connection = parseConnection(raw);
    if (connection !== null) {
      connections.push(connection);
    }
  }

  return { focal, connections };
}

// ---------------------------------------------------------------------
// Institutional-relationship document (get_organization_relationships)
// ---------------------------------------------------------------------

function asInstitutionalDirection(value: unknown): InstitutionalRelationshipDirection | null {
  return typeof value === "string" &&
    (INSTITUTIONAL_RELATIONSHIP_DIRECTIONS as readonly string[]).includes(value)
    ? (value as InstitutionalRelationshipDirection)
    : null;
}

function parseInstitutionalRelationship(input: unknown): InstitutionalRelationship | null {
  if (!isRecord(input)) return null;

  const id = asString(input.id);
  if (id === null) return null;

  const kindRaw = input.kind;
  if (!isRecord(kindRaw)) return null;
  const kindKey = asString(kindRaw.key);
  const kindLabel = asNonBlankString(kindRaw.label);
  if (kindKey === null || kindLabel === null) return null;

  const counterpartRaw = input.counterpart;
  if (!isRecord(counterpartRaw)) return null;
  const counterpartId = asString(counterpartRaw.id);
  const counterpartName = asNonBlankString(counterpartRaw.name);
  if (counterpartId === null || counterpartName === null) return null;

  const perspectiveRaw = input.perspective;
  if (!isRecord(perspectiveRaw)) return null;
  const organizationRoleLabel = asString(perspectiveRaw.organization_role_label);
  const counterpartRoleLabel = asString(perspectiveRaw.counterpart_role_label);
  const counterpartRoleLabelPlural = asString(perspectiveRaw.counterpart_role_label_plural);
  const direction = asInstitutionalDirection(perspectiveRaw.direction);
  if (
    organizationRoleLabel === null ||
    counterpartRoleLabel === null ||
    counterpartRoleLabelPlural === null ||
    direction === null
  ) {
    return null;
  }

  const temporal = parseTemporal(input.temporal);
  if (temporal === null) return null;

  const provenanceRaw = input.provenance;
  if (!isRecord(provenanceRaw)) return null;
  const sourceType = asSourceType(provenanceRaw.source_type);
  const verificationStatus = asVerification(provenanceRaw.verification_status);
  if (sourceType === null || verificationStatus === null) return null;

  return {
    id,
    kind: { key: kindKey, label: kindLabel, isDirectional: asBoolean(kindRaw.is_directional) },
    counterpart: { id: counterpartId, name: counterpartName, shortName: asString(counterpartRaw.short_name) },
    perspective: { organizationRoleLabel, counterpartRoleLabel, counterpartRoleLabelPlural, direction },
    note: asString(input.note),
    temporal,
    provenance: { sourceType, verificationStatus },
  };
}

export function parseInstitutionalRelationshipDocument(
  input: unknown,
): InstitutionalRelationshipDocument | null {
  if (!isRecord(input)) return null;
  const organizationId = asString(input.organization_id);
  if (organizationId === null) return null;
  if (!Array.isArray(input.relationships)) return null;

  const relationships: InstitutionalRelationship[] = [];
  for (const raw of input.relationships) {
    const relationship = parseInstitutionalRelationship(raw);
    if (relationship !== null) {
      relationships.push(relationship);
    }
  }

  return { organizationId, relationships };
}
