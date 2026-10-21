// The shared provenance kernel for Nodes of Knowledge.
//
// Every assertion the platform records -- a biography identity, a timeline
// event (M6.2), a participation (M6.3) -- carries the SAME provenance
// vocabulary (where the claim came from) and the SAME verification vocabulary
// (how confirmed it is), and renders them with the SAME plain-language labels.
// Sharing this kernel is what makes "how do we know this?" answered
// identically across engines, per the Design Bible's provenance-first
// philosophy. Pure data + pure functions; Node-neutral.

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

export type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "provisional",
  "verified_self",
  "verified_admin",
  "disputed",
];

export interface ProvenanceInfo {
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
}

const SOURCE_LABEL: Record<SourceType, string> = {
  self_reported: "Self-provided",
  nominated_by_other: "Submitted by another member",
  admin_entered: "Entered by an administrator",
  imported_historical: "Imported from historical records",
};

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  provisional: "Awaiting review",
  verified_self: "Verified by the person",
  verified_admin: "Verified by an administrator",
  disputed: "Disputed",
};

export interface ProvenanceDescriptor {
  sourceLabel: string;
  statusLabel: string;
}

/** Plain-language source + verification labels for an assertion's provenance.
 * Shared by every engine so provenance reads identically platform-wide. */
export function describeProvenance(
  sourceType: SourceType,
  verificationStatus: VerificationStatus,
): ProvenanceDescriptor {
  return { sourceLabel: SOURCE_LABEL[sourceType], statusLabel: VERIFICATION_LABEL[verificationStatus] };
}
