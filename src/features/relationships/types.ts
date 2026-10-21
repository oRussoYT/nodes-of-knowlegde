// Domain types for the Relationship Engine (Milestone M6.4).
//
// A Relationship is a historically meaningful BOND between two entities -- who
// was connected, the nature of the bond, when it existed, and the evidence for
// it. CC1: NOT Participation (bounded belonging) and NOT an Event (something
// that happened). Every relationship is an Assertion carrying provenance +
// verification; a relationship value never implies truth and is never inferred.
//
// The read model returns ONE canonical record projected from the viewed
// person's PERSPECTIVE: their role, the counterpart's role and its INVERSE
// label, and the direction -- so the same bond reads correctly on both
// entities' pages. The temporal model and provenance vocabulary are the
// platform-shared kernels (src/features/shared).

import type { ProvenanceInfo } from "@/features/shared/provenance";
import type { TemporalValue } from "@/features/shared/temporal";

/** Direction of the bond relative to the person whose page is being read. */
export type RelationshipDirection = "outgoing" | "incoming" | "symmetric";

export const RELATIONSHIP_DIRECTIONS: readonly RelationshipDirection[] = [
  "outgoing",
  "incoming",
  "symmetric",
];

export interface RelationshipKindRef {
  key: string;
  label: string;
  isDirectional: boolean;
}

/** The other entity in the bond (person-to-person in M6.4). Identity only. */
export interface CounterpartRef {
  id: string;
  displayName: string;
}

/** The bond as seen from the viewed person: their role, the counterpart's role
 * (the INVERSE of the person's, for directional kinds) with a plural form for
 * grouping, and the direction. */
export interface RelationshipPerspective {
  personRoleLabel: string;
  counterpartRoleLabel: string;
  counterpartRoleLabelPlural: string;
  direction: RelationshipDirection;
}

export interface Relationship {
  id: string;
  kind: RelationshipKindRef;
  counterpart: CounterpartRef;
  perspective: RelationshipPerspective;
  narrative: string | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** Canonical person-relationships read document (from
 * get_person_relationships). Relationships arrive chronologically ordered,
 * undated last; grouping (by the counterpart's role) is derived. */
export interface RelationshipDocument {
  personId: string;
  relationships: Relationship[];
}
