// Defensive parser for the M8.3 lineage documents (institutional succession/
// formation descent and mentorship descent): untyped revelation jsonb -> typed
// reading projection, or null on an unrecognizable shape. Same fail-closed
// discipline as parse.ts/parse-organization.ts: an individual malformed step is
// dropped (the rest still reads); parsing only REMOVES, never invents. Reuses the
// shared node/capacity/temporal/provenance primitives (./parse-shared) -- a
// lineage step's kind is a {key,label} ref (parseCapacity), its endpoints are
// ProjectedNodes (parseNode), its dates the shared temporal kernel. `parseStep`
// is shared by BOTH lineage lenses in this slice (demonstrated repetition).

import {
  isRecord,
  asString,
  asNonBlankString,
  parseNode,
  parseProvenance,
  parseSourceRef,
  parseTemporal,
} from "./parse-shared";
import type {
  LineageStep,
  OrganizationLineageDocument,
  PersonMentorshipLineageDocument,
  RelationshipKindRef,
} from "./types";

/** A relationship-kind ref carrying the source-end role label from the kind
 * vocabulary, so a step reads directionally without hard-coding role words. */
function parseKind(input: unknown): RelationshipKindRef | null {
  if (!isRecord(input)) return null;
  const key = asString(input.key);
  const label = asNonBlankString(input.label);
  const sourceRole = asNonBlankString(input.source_role);
  if (key === null || label === null || sourceRole === null) return null;
  return { key, label, sourceRole };
}

function parseStep(input: unknown, endpointType: "person" | "organization"): LineageStep | null {
  if (!isRecord(input)) return null;

  // Both endpoints must be present and of the expected kind (a person lineage
  // step is person->person; an institution lineage step is org->org). A mistyped
  // endpoint fails the step rather than being coerced.
  const from = parseNode(input.from);
  const to = parseNode(input.to);
  if (from === null || to === null) return null;
  if (from.type !== endpointType || to.type !== endpointType) return null;

  const kind = parseKind(input.kind);
  if (kind === null) return null;

  const temporal = parseTemporal(input.temporal);
  if (temporal === null) return null;

  const provenance = parseProvenance(input.provenance);
  if (provenance === null) return null;

  const source = parseSourceRef(input.source);
  if (source === null) return null;

  const direction =
    input.direction === "upstream" || input.direction === "downstream" ? input.direction : null;
  if (direction === null) return null;

  const depth = typeof input.depth === "number" && Number.isFinite(input.depth) ? input.depth : null;
  if (depth === null) return null;

  return {
    source,
    kind,
    from,
    to,
    temporal,
    provenance,
    direction,
    depth,
  };
}

function parseSteps(raw: unknown, endpointType: "person" | "organization"): LineageStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: LineageStep[] = [];
  for (const item of raw) {
    const step = parseStep(item, endpointType);
    if (step !== null) {
      steps.push(step);
    }
  }
  return steps;
}

export function parseOrganizationLineageDocument(
  input: unknown,
): OrganizationLineageDocument | null {
  if (!isRecord(input)) return null;

  const organizationId = asString(input.organization_id);
  if (organizationId === null) return null;

  const organization = parseNode(input.organization);
  if (organization === null || organization.type !== "organization") return null;

  if (!Array.isArray(input.upstream) || !Array.isArray(input.downstream)) return null;

  return {
    organizationId,
    organization,
    upstream: parseSteps(input.upstream, "organization"),
    downstream: parseSteps(input.downstream, "organization"),
  };
}

export function parsePersonMentorshipLineageDocument(
  input: unknown,
): PersonMentorshipLineageDocument | null {
  if (!isRecord(input)) return null;

  const personId = asString(input.person_id);
  if (personId === null) return null;

  const person = parseNode(input.person);
  if (person === null || person.type !== "person") return null;

  if (!Array.isArray(input.upstream) || !Array.isArray(input.downstream)) return null;

  return {
    personId,
    person,
    upstream: parseSteps(input.upstream, "person"),
    downstream: parseSteps(input.downstream, "person"),
  };
}
