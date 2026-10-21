// Pure presentation derivation for participation: grouping by ORGANIZATION,
// and provenance labels. No I/O, no JSX. Unit-tested.
//
// Where the Timeline groups by decade (a spine through TIME), Participation
// groups by organization (a map of BELONGING) -- this is what makes the two
// engines read differently on the page: "what happened, when" vs. "where and
// how did this person belong". The read model returns participations already
// ordered chronologically (start asc, undated last); because that order is
// stable, the FIRST time an organization is encountered is at its earliest
// belonging, so grouping in encounter order yields affiliation groups ordered
// by earliest involvement -- historical, not alphabetical or administrative.
// Within a group, participations keep chronological order; concurrent and
// sequential belongings both appear, none collapsed.
//
// Provenance labelling is the platform-shared kernel
// (src/features/shared/provenance.ts), re-exported so provenance reads
// identically to the Timeline and the Biography.

import type { Participation, ParticipationDocument } from "./types";

export { describeProvenance as describeParticipationProvenance } from "@/features/shared/provenance";
export type { ProvenanceDescriptor as ParticipationProvenanceDescriptor } from "@/features/shared/provenance";

export interface AffiliationGroup {
  /** Stable key for React (the organization id). */
  key: string;
  organizationName: string;
  organizationShortName: string | null;
  participations: Participation[];
}

export interface ParticipationView {
  isEmpty: boolean;
  affiliations: AffiliationGroup[];
  participationCount: number;
}

export function buildParticipationView(document: ParticipationDocument): ParticipationView {
  const participations = document.participations;
  if (participations.length === 0) {
    return { isEmpty: true, affiliations: [], participationCount: 0 };
  }

  const byOrganization = new Map<string, AffiliationGroup>();
  const order: string[] = [];

  for (const participation of participations) {
    const orgId = participation.organization.id;
    let group = byOrganization.get(orgId);
    if (group === undefined) {
      group = {
        key: orgId,
        organizationName: participation.organization.name,
        organizationShortName: participation.organization.shortName,
        participations: [],
      };
      byOrganization.set(orgId, group);
      order.push(orgId);
    }
    group.participations.push(participation);
  }

  const affiliations = order.map((orgId) => byOrganization.get(orgId)).filter((group): group is AffiliationGroup => group !== undefined);

  return { isEmpty: false, affiliations, participationCount: participations.length };
}
