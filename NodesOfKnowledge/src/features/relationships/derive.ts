// Pure presentation derivation for relationships: grouping by the COUNTERPART'S
// ROLE (from the viewed person's perspective), and provenance labels. No I/O,
// no JSX. Unit-tested.
//
// Where Participation groups by organization (a map of belonging) and the
// Timeline by decade (a spine through time), Relationships group by WHO the
// other person was to this person -- "Mentors", "Students", "Collaborators" --
// which is what answers "who shaped this life, and whose lives did this person
// shape?". Because the read model already projects each bond with the
// counterpart's role (the INVERSE label for directional kinds), the same
// canonical record files under "Students" on the mentor's page and "Mentors"
// on the student's page, with no duplication and no re-computation here.
//
// The read model returns relationships already ordered chronologically (start
// asc, undated last); because that order is stable, the first time a role group
// is encountered is at its earliest bond, so grouping in encounter order yields
// groups ordered by earliest involvement -- historical, not by prestige (the
// engine ranks no relationship above another). Within a group, chronological.
//
// Provenance labelling is the platform-shared kernel
// (src/features/shared/provenance.ts), re-exported so provenance reads
// identically to every other engine.

import type { Relationship, RelationshipDocument } from "./types";

export { describeProvenance as describeRelationshipProvenance } from "@/features/shared/provenance";
export type { ProvenanceDescriptor as RelationshipProvenanceDescriptor } from "@/features/shared/provenance";

export interface RelationshipRoleGroup {
  /** Stable key for React (the counterpart role, plural). */
  key: string;
  /** Group heading -- the counterpart's role in the plural ("Mentors"). */
  heading: string;
  relationships: Relationship[];
}

export interface RelationshipView {
  isEmpty: boolean;
  groups: RelationshipRoleGroup[];
  relationshipCount: number;
}

export function buildRelationshipView(document: RelationshipDocument): RelationshipView {
  const relationships = document.relationships;
  if (relationships.length === 0) {
    return { isEmpty: true, groups: [], relationshipCount: 0 };
  }

  const byRole = new Map<string, RelationshipRoleGroup>();
  const order: string[] = [];

  for (const relationship of relationships) {
    const heading = relationship.perspective.counterpartRoleLabelPlural;
    let group = byRole.get(heading);
    if (group === undefined) {
      group = { key: heading, heading, relationships: [] };
      byRole.set(heading, group);
      order.push(heading);
    }
    group.relationships.push(relationship);
  }

  const groups = order
    .map((heading) => byRole.get(heading))
    .filter((group): group is RelationshipRoleGroup => group !== undefined);

  return { isEmpty: false, groups, relationshipCount: relationships.length };
}
