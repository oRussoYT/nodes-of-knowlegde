// Domain types for the Scientific Biography read model (Milestone M6.1).
//
// Every value here is understood as part of an Assertion carrying its own
// provenance (see docs/nodes-of-knowledge-product-blueprint.md, "The three
// atoms"). Nothing is a bare trusted fact: identity fields share the person
// record's provenance; the narrative carries its own. Deliberately no
// participation/relationship/timeline types -- those are later engines.

/** Provenance vocabulary for how a record or narrative entered the system. */
export type SourceType =
  | "self_reported"
  | "nominated_by_other"
  | "admin_entered"
  | "imported_historical";

export const SOURCE_TYPES: readonly SourceType[] = [
  "self_reported",
  "nominated_by_other",
  "admin_entered",
  "imported_historical",
];

/** Person-record verification lifecycle (people.verification_status). The
 * read model never returns `merged` -- a merged record has no biography. */
export type PersonVerificationStatus =
  | "provisional"
  | "claim_pending"
  | "verified_self"
  | "verified_admin"
  | "disputed";

export const PERSON_VERIFICATION_STATUSES: readonly PersonVerificationStatus[] = [
  "provisional",
  "claim_pending",
  "verified_self",
  "verified_admin",
  "disputed",
];

/** Narrative verification lifecycle (person_narrative.verification_status) --
 * a narrower set than the person record's. */
export type NarrativeVerificationStatus =
  | "provisional"
  | "verified_self"
  | "verified_admin"
  | "disputed";

export const NARRATIVE_VERIFICATION_STATUSES: readonly NarrativeVerificationStatus[] = [
  "provisional",
  "verified_self",
  "verified_admin",
  "disputed",
];

export interface BiographyProvenance {
  sourceType: SourceType;
  verificationStatus: PersonVerificationStatus;
}

export interface BiographyIdentity {
  displayName: string;
  givenName: string;
  familyName: string;
  preferredName: string | null;
  isDeceased: boolean;
}

export interface BiographyNarrative {
  body: string;
  sourceType: SourceType;
  verificationStatus: NarrativeVerificationStatus;
}

/** The canonical Scientific Biography read document, one per person. Parsed
 * from public.get_person_biography's jsonb by parse.ts. */
export interface BiographyDocument {
  personId: string;
  identity: BiographyIdentity;
  provenance: BiographyProvenance;
  /** Whether an authenticated account has an active link to this person. */
  isClaimed: boolean;
  /** Fixed policy list of fields withheld from this authenticated surface
   * (e.g. exact life dates). Never reveals whether a value exists. */
  withheld: string[];
  narrative: BiographyNarrative | null;
}
