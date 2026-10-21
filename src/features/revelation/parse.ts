// Defensive parser for the M8.1 person co-presence document: untyped revelation
// jsonb -> typed reading projection, or null on an unrecognizable shape. Pure;
// unit-tested; fails closed. An individual malformed member or cohort is dropped
// (the rest still reads) rather than failing the whole document -- the same
// discipline as the M6/M7 parsers. A dropped member is never a fabricated one:
// parsing only ever REMOVES; it never invents. The shared node/capacity/temporal/
// anchor/member primitives live in ./parse-shared (harvested once M8.2 demonstrated
// the identical need); this file keeps only the person-document composition.

import { isRecord, asString, parseNode, parseAnchor, parseMember } from "./parse-shared";
import type { Cohort, CohortAnchor, CohortMember, PersonCohortsDocument } from "./types";

function parseCohort(input: unknown): Cohort | null {
  if (!isRecord(input)) return null;

  const organization = parseNode(input.organization);
  if (organization === null || organization.type !== "organization") return null;

  if (!Array.isArray(input.members)) return null;
  const members: CohortMember[] = [];
  for (const raw of input.members) {
    const member = parseMember(raw);
    if (member !== null) {
      members.push(member);
    }
  }
  // A cohort with no readable members is not a cohort -- drop it rather than
  // render an empty group (the read model already omits memberless cohorts;
  // this guards the parse layer too).
  if (members.length === 0) return null;

  const focalParticipations: CohortAnchor[] = [];
  if (Array.isArray(input.focal_participations)) {
    for (const raw of input.focal_participations) {
      const anchor = parseAnchor(raw);
      if (anchor !== null) {
        focalParticipations.push(anchor);
      }
    }
  }

  return { organization, focalParticipations, members };
}

export function parsePersonCohortsDocument(input: unknown): PersonCohortsDocument | null {
  if (!isRecord(input)) return null;
  const personId = asString(input.person_id);
  if (personId === null) return null;
  if (!Array.isArray(input.cohorts)) return null;

  const cohorts: Cohort[] = [];
  for (const raw of input.cohorts) {
    const cohort = parseCohort(raw);
    if (cohort !== null) {
      cohorts.push(cohort);
    }
  }

  return { personId, cohorts };
}
