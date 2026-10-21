// Domain types for the Timeline Engine (Milestone M6.2).
//
// An Event is standalone historical content; a person timeline is the
// projection of events onto one person (Many-Clocks). Every event is an
// Assertion carrying its own provenance + verification -- an event row never
// implies truth. No Participation/Relationship types here (CC1): later engines.
//
// The temporal model and the provenance/verification vocabulary are the
// platform-shared kernels (src/features/shared): re-exported here under the
// Timeline's historical names so this module's public surface is unchanged
// while a single kernel is shared with the Participation Engine (M6.3) and
// every later clock.

import type { ProvenanceInfo } from "@/features/shared/provenance";
import type { TemporalValue } from "@/features/shared/temporal";

export {
  SOURCE_TYPES,
  VERIFICATION_STATUSES as EVENT_VERIFICATION_STATUSES,
} from "@/features/shared/provenance";
export type {
  SourceType,
  VerificationStatus as EventVerificationStatus,
  ProvenanceInfo as EventProvenanceInfo,
} from "@/features/shared/provenance";

export { DATE_PRECISIONS } from "@/features/shared/temporal";
export type { DatePrecision, TemporalValue as EventTemporal } from "@/features/shared/temporal";

export interface EventKindRef {
  key: string;
  label: string;
}

export interface TimelineEvent {
  id: string;
  kind: EventKindRef;
  title: string;
  summary: string | null;
  place: string | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

/** Canonical person-timeline read document (from get_person_timeline). Events
 * arrive chronologically ordered, undated last. */
export interface TimelineDocument {
  personId: string;
  events: TimelineEvent[];
}
