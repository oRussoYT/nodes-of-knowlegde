// Domain types for the Participation Engine (Milestone M6.3).
//
// A Participation is BOUNDED BELONGING through time: a person belonged to an
// organization, in a capacity, during a period, with its own provenance and
// verification. CC1: this is NOT authorship, ownership, provenance, causation,
// or relationship. Every participation is an Assertion -- a participation row
// never implies truth.
//
// The temporal model and the provenance/verification vocabulary are the
// platform-shared kernels (src/features/shared) -- the SAME ones the Timeline
// uses -- so a belonging period is dated and provenanced identically to a
// timeline event.

import type { ProvenanceInfo } from "@/features/shared/provenance";
import type { TemporalValue } from "@/features/shared/temporal";

/** The belonging-target organization, as resolved by the read model. Identity
 * only in M6.3 (the Institution Engine is deferred). */
export interface OrganizationRef {
  id: string;
  name: string;
  shortName: string | null;
}

/** The generic, data-driven capacity of a belonging (from
 * participation_capacities). */
export interface CapacityRef {
  key: string;
  label: string;
}

export interface Participation {
  id: string;
  organization: OrganizationRef;
  capacity: CapacityRef;
  summary: string | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** Canonical person-participation read document (from
 * get_person_participation). Participations arrive chronologically ordered,
 * undated last; presentation grouping (by organization) is derived. */
export interface ParticipationDocument {
  personId: string;
  participations: Participation[];
}
