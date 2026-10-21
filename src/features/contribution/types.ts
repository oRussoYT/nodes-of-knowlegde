// Domain types for the Contribution Engine (Milestone M6.6).
//
// A Contribution is a historically situated, provenance-bearing account of
// something an actor helped bring into being, sustain, transform, preserve,
// understand, transmit, or make possible. The read model composes bounded
// reads: the contribution's own record (identity, kind, narrative facets, and
// its person/organization attributions), its timeline (canonical Events
// projected -- reused via the M6.2 timeline types), and, from the other
// direction, the projections onto a person and an institution. Temporal and
// provenance vocabularies are the shared kernels (src/features/shared).

import type { ProvenanceInfo } from "@/features/shared/provenance";
import type { TemporalValue } from "@/features/shared/temporal";

/** The KIND of historical object contributed (data-backed vocabulary). */
export interface ContributionKindRef {
  key: string;
  label: string;
}

/** The CAPACITY in which a contributor helped (a different axis from kind). */
export interface CapacityRef {
  key: string;
  label: string;
}

export interface PersonRef {
  id: string;
  displayName: string;
}

export interface OrganizationRef {
  id: string;
  name: string;
  shortName: string | null;
}

export type ContributionNarrativeKind = "overview" | "context" | "significance" | "legacy";

export const CONTRIBUTION_NARRATIVE_KINDS: readonly ContributionNarrativeKind[] = [
  "overview",
  "context",
  "significance",
  "legacy",
];

export interface ContributionNarrativeFacet {
  kind: ContributionNarrativeKind;
  body: string;
  provenance: ProvenanceInfo;
}

/** One person attribution -- its OWN assertion, carrying a capacity and its own
 * provenance (the contribution record's provenance never proves it). */
export interface PersonContributor {
  id: string;
  person: PersonRef;
  capacity: CapacityRef;
  attributionNote: string | null;
  provenance: ProvenanceInfo;
}

/** One institutional attribution (a funder/host is an institutional
 * contributor with a funding/institutional_support capacity, never inferred). */
export interface OrganizationContributor {
  id: string;
  organization: OrganizationRef;
  capacity: CapacityRef;
  attributionNote: string | null;
  provenance: ProvenanceInfo;
}

/** The canonical Contribution, as read for its dedicated page. Contributors may
 * both be empty -- a collective whose individuals cannot or should not be
 * isolated is a first-class, honest state, never a fabricated person. */
export interface Contribution {
  id: string;
  title: string;
  kind: ContributionKindRef | null;
  description: string | null;
  temporal: TemporalValue;
  place: string | null;
  provenance: ProvenanceInfo;
  narrative: ContributionNarrativeFacet[];
  contributors: {
    people: PersonContributor[];
    organizations: OrganizationContributor[];
  };
}

/** The contribution's identity as projected onto a person/institution page. */
export interface ContributionSummaryRef {
  id: string;
  title: string;
  kind: ContributionKindRef | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** One projected attribution entry: the actor's capacity + attribution
 * provenance, plus the contribution's identity (to render and link). */
export interface ContributionAttributionEntry {
  attributionId: string;
  capacity: CapacityRef;
  attributionNote: string | null;
  attributionProvenance: ProvenanceInfo;
  contribution: ContributionSummaryRef;
}

export interface PersonContributionsDocument {
  personId: string;
  contributions: ContributionAttributionEntry[];
}

export interface OrganizationContributionsDocument {
  organizationId: string;
  contributions: ContributionAttributionEntry[];
}
