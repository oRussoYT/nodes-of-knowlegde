// Domain types for the Institution Engine (Milestone M6.5).
//
// An Institution is a historical ACTOR. The read model composes three bounded
// reads: the institution's own record (identity, historical names, external
// identifiers, narrative facets), its timeline (canonical Events projected --
// see the M6.2 timeline types, reused via an adapter in read.ts), and its
// participation (canonical M6.3 Participation projected from the institution's
// perspective). The temporal and provenance vocabularies are the shared
// kernels (src/features/shared).

import type { ProvenanceInfo } from "@/features/shared/provenance";
import type { DatePrecision, TemporalValue } from "@/features/shared/temporal";

export type OrganizationStatus =
  | "active"
  | "historical"
  | "closed"
  | "dormant"
  | "merged"
  | "absorbed"
  | "succeeded"
  | "provisional"
  | "status_unknown";

export const ORGANIZATION_STATUSES: readonly OrganizationStatus[] = [
  "active", "historical", "closed", "dormant", "merged",
  "absorbed", "succeeded", "provisional", "status_unknown",
];

export type OrganizationNameType = "former" | "alternative" | "acronym" | "indigenous" | "local" | "translation";

export const ORGANIZATION_NAME_TYPES: readonly OrganizationNameType[] = [
  "former", "alternative", "acronym", "indigenous", "local", "translation",
];

export type ExternalIdentifierScheme =
  | "ror" | "wikidata" | "isni" | "viaf" | "grid" | "national_registry" | "archival_authority" | "other";

export const EXTERNAL_IDENTIFIER_SCHEMES: readonly ExternalIdentifierScheme[] = [
  "ror", "wikidata", "isni", "viaf", "grid", "national_registry", "archival_authority", "other",
];

export type NarrativeKind = "introduction" | "overview" | "significance" | "legacy";

export const NARRATIVE_KINDS: readonly NarrativeKind[] = ["introduction", "overview", "significance", "legacy"];

export interface OrganizationTypeRef {
  key: string;
  label: string;
}

/** A known founding: a date is always present (unknown founding is null). */
export interface FoundingInfo {
  date: string;
  precision: DatePrecision;
  isApproximate: boolean;
}

export interface ClosureInfo {
  date: string;
  precision: DatePrecision;
}

export interface OrganizationName {
  id: string;
  name: string;
  nameType: OrganizationNameType;
  language: string | null;
  /** The period the name was used, as a shared TemporalValue (start/end only). */
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

export interface ExternalIdentifier {
  id: string;
  scheme: ExternalIdentifierScheme;
  identifierValue: string;
  url: string | null;
  provenance: ProvenanceInfo;
}

export interface NarrativeFacet {
  kind: NarrativeKind;
  body: string;
  provenance: ProvenanceInfo;
}

export interface Organization {
  id: string;
  name: string;
  shortName: string | null;
  type: OrganizationTypeRef | null;
  status: OrganizationStatus;
  founding: FoundingInfo | null;
  closure: ClosureInfo | null;
  location: string | null;
  website: string | null;
  provenance: ProvenanceInfo;
  names: OrganizationName[];
  externalIdentifiers: ExternalIdentifier[];
  narrative: NarrativeFacet[];
}

export interface CapacityRef {
  key: string;
  label: string;
}

export interface PersonRef {
  id: string;
  displayName: string;
}

/** One canonical Participation projected onto the institution (person is the
 * counterpart). */
export interface InstitutionParticipationEntry {
  id: string;
  capacity: CapacityRef;
  person: PersonRef;
  summary: string | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

export interface InstitutionParticipationDocument {
  organizationId: string;
  participations: InstitutionParticipationEntry[];
}
