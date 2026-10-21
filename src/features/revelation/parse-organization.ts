// Defensive parser for the M8.2 institution co-presence document: untyped
// revelation jsonb -> typed reading projection, or null on an unrecognizable
// shape. Same fail-closed discipline as parse.ts: an individual malformed
// co-present member or anchor is dropped (the rest still reads); parsing only
// REMOVES, never invents. Reuses the shared node/capacity/temporal/anchor/member
// primitives (./parse-shared) -- the co-present member IS a CohortMember and the
// anchor's participation IS a CohortAnchor, so the M8.1 primitives apply exactly.

import { isRecord, asString, parseNode, parseAnchor, parseMember } from "./parse-shared";
import type {
  CohortAnchor,
  CohortMember,
  GenerationAnchor,
  OrganizationGenerationsDocument,
} from "./types";

function parseGenerationAnchor(input: unknown): GenerationAnchor | null {
  if (!isRecord(input)) return null;

  const person = parseNode(input.person);
  if (person === null || person.type !== "person") return null;

  // The co-present set justifies the anchor's presence in this revelation; an
  // anchor with no readable co-present person is dropped (the read model already
  // omits participants with no documented co-presence -- this guards the parse
  // layer too).
  if (!Array.isArray(input.co_present)) return null;
  const coPresent: CohortMember[] = [];
  for (const raw of input.co_present) {
    const member = parseMember(raw);
    if (member !== null) {
      coPresent.push(member);
    }
  }
  if (coPresent.length === 0) return null;

  // All of the anchor's own participations here (both sides of every overlap are
  // decomposable). An anchor with no readable participation is dropped.
  const participations: CohortAnchor[] = [];
  if (Array.isArray(input.participations)) {
    for (const raw of input.participations) {
      const anchor = parseAnchor(raw);
      if (anchor !== null) {
        participations.push(anchor);
      }
    }
  }
  if (participations.length === 0) return null;

  return { person, participations, coPresent };
}

export function parseOrganizationGenerationsDocument(
  input: unknown,
): OrganizationGenerationsDocument | null {
  if (!isRecord(input)) return null;

  const organizationId = asString(input.organization_id);
  if (organizationId === null) return null;

  const organization = parseNode(input.organization);
  if (organization === null || organization.type !== "organization") return null;

  if (!Array.isArray(input.anchors)) return null;
  const anchors: GenerationAnchor[] = [];
  for (const raw of input.anchors) {
    const anchor = parseGenerationAnchor(raw);
    if (anchor !== null) {
      anchors.push(anchor);
    }
  }

  return { organizationId, organization, anchors };
}
