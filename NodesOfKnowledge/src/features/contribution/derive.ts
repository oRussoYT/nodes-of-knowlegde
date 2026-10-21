// Pure presentation derivation for the Contribution surfaces: the temporal
// scope descriptor (shared kernel), narrative-facet lookup, contributor
// grouping by capacity (equal dignity, never prestige), and the flat
// chronological projection view for the person/institution pages. No I/O, no
// JSX. Unit-tested.
//
// Provenance labelling is the platform-shared kernel, re-exported so provenance
// reads identically to every other engine.

import { formatTemporal, type TemporalValue, type TemporalDescriptor } from "@/features/shared/temporal";

import type {
  Contribution,
  ContributionAttributionEntry,
  ContributionNarrativeFacet,
  ContributionNarrativeKind,
  OrganizationContributor,
  PersonContributor,
} from "./types";

export { describeProvenance as describeContributionProvenance } from "@/features/shared/provenance";
export type { ProvenanceDescriptor as ContributionProvenanceDescriptor } from "@/features/shared/provenance";

/** The contribution's temporal scope as a shared descriptor (honest "Date
 * unknown" included -- absence is shown, never fabricated). */
export function contributionScope(temporal: TemporalValue): TemporalDescriptor {
  return formatTemporal(temporal);
}

/** The narrative facet of a given kind, or undefined when absent. */
export function narrativeFacet(contribution: Contribution, kind: ContributionNarrativeKind): ContributionNarrativeFacet | undefined {
  return contribution.narrative.find((facet) => facet.kind === kind);
}

export interface PersonContributorGroup {
  key: string;
  heading: string;
  entries: PersonContributor[];
}
export interface OrganizationContributorGroup {
  key: string;
  heading: string;
  entries: OrganizationContributor[];
}

// Groups contributors by CAPACITY ("Field observation", "Coordination", ...),
// in first-encounter order (the read model returns a stable, non-prestige
// order). Equal dignity is binding: no capacity outranks another, and the
// grouping is never a leaderboard.
export function buildPersonContributorGroups(people: PersonContributor[]): PersonContributorGroup[] {
  const byCapacity = new Map<string, PersonContributorGroup>();
  const order: string[] = [];
  for (const entry of people) {
    const heading = entry.capacity.label;
    let group = byCapacity.get(heading);
    if (group === undefined) {
      group = { key: heading, heading, entries: [] };
      byCapacity.set(heading, group);
      order.push(heading);
    }
    group.entries.push(entry);
  }
  return order.map((h) => byCapacity.get(h)).filter((g): g is PersonContributorGroup => g !== undefined);
}

export function buildOrganizationContributorGroups(orgs: OrganizationContributor[]): OrganizationContributorGroup[] {
  const byCapacity = new Map<string, OrganizationContributorGroup>();
  const order: string[] = [];
  for (const entry of orgs) {
    const heading = entry.capacity.label;
    let group = byCapacity.get(heading);
    if (group === undefined) {
      group = { key: heading, heading, entries: [] };
      byCapacity.set(heading, group);
      order.push(heading);
    }
    group.entries.push(entry);
  }
  return order.map((h) => byCapacity.get(h)).filter((g): g is OrganizationContributorGroup => g !== undefined);
}

export interface ContributionProjectionView {
  isEmpty: boolean;
  entries: ContributionAttributionEntry[];
  count: number;
}

// The person/institution projection is a flat, chronological body of
// contributions (the read model returns them ordered by the contribution's
// time, undated last) -- "a body of contributions", never a ranked list and
// never a count-as-status. Each entry shows the actor's capacity inline.
export function buildContributionProjectionView(entries: ContributionAttributionEntry[]): ContributionProjectionView {
  return { isEmpty: entries.length === 0, entries, count: entries.length };
}
