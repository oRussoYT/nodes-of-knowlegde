// Pure presentation derivation for the Institution page: the operating-period
// label (from founding/closure via the shared temporal kernel), narrative-facet
// lookup, and participation grouping by capacity. No I/O, no JSX. Unit-tested.
//
// Provenance labelling is the platform-shared kernel, re-exported so provenance
// reads identically to every other engine.

import { formatPoint } from "@/features/shared/temporal";

import type { InstitutionParticipationDocument, InstitutionParticipationEntry, NarrativeFacet, NarrativeKind, Organization } from "./types";

export { describeProvenance as describeInstitutionProvenance } from "@/features/shared/provenance";
export type { ProvenanceDescriptor as InstitutionProvenanceDescriptor } from "@/features/shared/provenance";

/** The institution's operating period as an honest human string, or null when
 * the period is entirely unknown (absence is shown, not fabricated). Handles a
 * known founding with/without closure, an active institution ("– present"), and
 * a known closure with an unknown founding ("Closed …"). */
export function institutionPeriod(org: Organization): string | null {
  const foundingPoint = org.founding
    ? `${org.founding.isApproximate ? "c. " : ""}${formatPoint(org.founding.date, org.founding.precision)}`
    : null;
  const closurePoint = org.closure ? formatPoint(org.closure.date, org.closure.precision) : null;

  if (foundingPoint !== null) {
    if (closurePoint !== null) return `${foundingPoint} – ${closurePoint}`;
    if (org.status === "active") return `${foundingPoint} – present`;
    return `Founded ${foundingPoint}`;
  }
  if (closurePoint !== null) return `Closed ${closurePoint}`;
  return null;
}

/** The narrative facet of a given kind, or undefined when absent. */
export function narrativeFacet(org: Organization, kind: NarrativeKind): NarrativeFacet | undefined {
  return org.narrative.find((facet) => facet.kind === kind);
}

export interface InstitutionParticipationGroup {
  /** Stable key for React (the capacity label). */
  key: string;
  heading: string;
  entries: InstitutionParticipationEntry[];
}

export interface InstitutionParticipationView {
  isEmpty: boolean;
  groups: InstitutionParticipationGroup[];
  count: number;
}

// Groups the institution's people by capacity ("Researcher", "Director", ...),
// ordering groups by earliest involvement (the read model returns chronological
// order, so first-encounter == earliest) -- historically, NEVER by prestige.
// Equal dignity is binding: no leaderboard, no status hierarchy.
export function buildInstitutionParticipationView(document: InstitutionParticipationDocument): InstitutionParticipationView {
  const entries = document.participations;
  if (entries.length === 0) {
    return { isEmpty: true, groups: [], count: 0 };
  }

  const byCapacity = new Map<string, InstitutionParticipationGroup>();
  const order: string[] = [];
  for (const entry of entries) {
    const heading = entry.capacity.label;
    let group = byCapacity.get(heading);
    if (group === undefined) {
      group = { key: heading, heading, entries: [] };
      byCapacity.set(heading, group);
      order.push(heading);
    }
    group.entries.push(entry);
  }

  const groups = order
    .map((heading) => byCapacity.get(heading))
    .filter((group): group is InstitutionParticipationGroup => group !== undefined);

  return { isEmpty: false, groups, count: entries.length };
}
