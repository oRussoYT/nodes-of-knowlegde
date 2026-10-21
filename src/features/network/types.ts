// Domain types for the Knowledge Network Engine (Milestone M7).
//
// The Knowledge Network is a DERIVED, provenance-preserving READ MODEL over the
// canonical M1-M6 records (ADR-0017). It is NOT a source of truth, NOT a generic
// edge store, and NOT a universal Entity model. This module is the shared
// TypeScript reading shape -- a discriminated projection, not a database
// ontology -- into which every bounded network read model resolves.
//
// A ProjectedConnection explains how the focal canonical record is connected to
// ONE other canonical record THROUGH a specific canonical Assertion: what two
// records, through which assertion (its canonical source row), what family of
// connection, its directionality, its period (where known), its provenance and
// verification, and why it is visible. A projection NEVER creates a second
// assertion; its `id` is deterministic for rendering/testing but is not a new
// historical claim. No connection here is ever inferred -- only direct
// assertions and their projections appear (the M7/M8 boundary).
//
// The temporal model and provenance vocabulary are the platform-shared kernels
// (src/features/shared).

import type { ProvenanceInfo, VerificationStatus } from "@/features/shared/provenance";
import type { TemporalValue } from "@/features/shared/temporal";

/** The canonical record kinds a network node can stand for. Person,
 * Institution, and Contribution have reading routes; Event does not yet (its
 * href is null), and reads as honest text rather than a dead link. */
export type NetworkNodeType = "person" | "organization" | "contribution" | "event";

export const NETWORK_NODE_TYPES: readonly NetworkNodeType[] = [
  "person",
  "organization",
  "contribution",
  "event",
];

/** The connection families M7 projects, each backed by a specific canonical
 * table. NOT a generic "related to": the semantic difference between a bond, a
 * belonging, an attribution, an event association, and an institutional
 * relationship is preserved. */
export type ConnectionFamily =
  | "relationship"
  | "participation"
  | "contribution_attribution"
  | "event_association"
  | "institutional_relationship";

export const CONNECTION_FAMILIES: readonly ConnectionFamily[] = [
  "relationship",
  "participation",
  "contribution_attribution",
  "event_association",
  "institutional_relationship",
];

/** Direction of the connection relative to the focal record. Symmetric bonds
 * read the same from both ends; undirected covers belonging/association where
 * neither end is an "actor" over the other (e.g. an event association). */
export type ConnectionDirection = "outgoing" | "incoming" | "symmetric" | "undirected";

export const CONNECTION_DIRECTIONS: readonly ConnectionDirection[] = [
  "outgoing",
  "incoming",
  "symmetric",
  "undirected",
];

/** Reserved visibility posture. M7 always projects "visible" connections; the
 * field exists so a later milestone can withhold sensitive/protected/culturally
 * restricted connections without reshaping the contract (ADR-0017, Node
 * sovereignty). Absence is never proof no connection exists. */
export type ConnectionVisibility = "visible";

/** A node in the projected neighbourhood: a canonical record rendered as a
 * reading destination. `href` is null for record kinds without a reading route
 * (events), so the UI renders honest text instead of a broken link. */
export interface ProjectedNode {
  type: NetworkNodeType;
  id: string;
  label: string;
  secondaryLabel: string | null;
  href: string | null;
  verificationStatus: VerificationStatus | null;
}

/** The semantic qualifier of a connection: a participation capacity, a
 * relationship/institutional-relationship kind, or a contribution capacity.
 * Null where the family carries none (event associations). */
export interface ConnectionKindRef {
  key: string;
  label: string;
}

/** For relationship and institutional-relationship families: the focal
 * record's role, and the counterpart's role (the INVERSE, for directional
 * kinds) with a plural form for grouping. Null for other families. */
export interface ConnectionPerspective {
  focalRoleLabel: string;
  counterpartRoleLabel: string;
  counterpartRoleLabelPlural: string;
}

/** Pointer to the exact canonical row that justifies a projected connection.
 * This is what keeps provenance non-circular: the network never cites itself. */
export interface CanonicalSourceRef {
  /** The canonical table the assertion lives in, e.g. "participations". */
  type: string;
  id: string;
}

export interface ProjectedConnection {
  /** Deterministic projected id ("<source>:<rowId>"), stable for rendering and
   * testing. NOT a canonical historical assertion. */
  id: string;
  family: ConnectionFamily;
  direction: ConnectionDirection;
  /** The connected (non-focal) record. */
  node: ProjectedNode;
  kind: ConnectionKindRef | null;
  perspective: ConnectionPerspective | null;
  /** The period the connection applied, where known; null when the source
   * assertion carries no period (e.g. an attribution). Never invented. */
  temporal: TemporalValue | null;
  provenance: ProvenanceInfo;
  source: CanonicalSourceRef;
  visibility: ConnectionVisibility;
}

/** A one-hop network neighbourhood centred on one canonical record (from
 * get_person_network / get_organization_network / get_contribution_network /
 * get_event_network). Connections arrive flat and deterministically ordered;
 * grouping by historical meaning is derived. */
export interface NetworkDocument {
  focal: ProjectedNode;
  connections: ProjectedConnection[];
}

// ---------------------------------------------------------------------
// Institutional-relationship read (get_organization_relationships)
// ---------------------------------------------------------------------
//
// The dedicated per-institution lineage read, mirroring the person relationship
// read model. Distinct from the network document above: it returns ONE
// institution's institutional relationships (each projected from that
// institution's perspective with inverse labels), used to bring the Institution
// page's reserved Relationships surface to life.

export type InstitutionalRelationshipDirection = "outgoing" | "incoming" | "symmetric";

export const INSTITUTIONAL_RELATIONSHIP_DIRECTIONS: readonly InstitutionalRelationshipDirection[] = [
  "outgoing",
  "incoming",
  "symmetric",
];

export interface InstitutionalRelationshipKindRef {
  key: string;
  label: string;
  isDirectional: boolean;
}

export interface InstitutionalCounterpartRef {
  id: string;
  name: string;
  shortName: string | null;
}

export interface InstitutionalRelationshipPerspective {
  organizationRoleLabel: string;
  counterpartRoleLabel: string;
  counterpartRoleLabelPlural: string;
  direction: InstitutionalRelationshipDirection;
}

export interface InstitutionalRelationship {
  id: string;
  kind: InstitutionalRelationshipKindRef;
  counterpart: InstitutionalCounterpartRef;
  perspective: InstitutionalRelationshipPerspective;
  note: string | null;
  temporal: TemporalValue;
  provenance: ProvenanceInfo;
}

export interface InstitutionalRelationshipDocument {
  organizationId: string;
  relationships: InstitutionalRelationship[];
}
