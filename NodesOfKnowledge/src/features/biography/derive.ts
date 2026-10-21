// Pure presentation-state derivation from a BiographyDocument. No I/O, no
// JSX -- unit-tested in tests/unit/biography-derive.test.ts. Turns the read
// model into the honest display states the page renders (claim/verification
// state, narrative state, provenance descriptors), never inventing content.

import type { BadgeTone } from "@/components/ui/Badge";

import type {
  BiographyDocument,
  NarrativeVerificationStatus,
  PersonVerificationStatus,
  SourceType,
} from "./types";

export type ClaimStateKind = PersonVerificationStatus;

export interface ClaimStateView {
  kind: ClaimStateKind;
  label: string;
  tone: BadgeTone;
}

const CLAIM_STATE: Record<ClaimStateKind, { label: string; tone: BadgeTone }> = {
  // "success" is the one settled state; provisional is neutral (most
  // historical data starts here -- never alarming); disputed is a warning,
  // never a danger/error color (docs/ui-vision.md, docs/design-system-architecture.md).
  verified_self: { label: "Verified — self-claimed", tone: "success" },
  verified_admin: { label: "Verified — institutionally confirmed", tone: "success" },
  claim_pending: { label: "Claim under review", tone: "info" },
  provisional: { label: "Provisional record", tone: "neutral" },
  disputed: { label: "Disputed", tone: "warning" },
};

export function deriveClaimState(document: BiographyDocument): ClaimStateView {
  const entry = CLAIM_STATE[document.provenance.verificationStatus];
  return { kind: document.provenance.verificationStatus, label: entry.label, tone: entry.tone };
}

export type NarrativeStateKind = "curated" | "absent";

export interface NarrativeStateView {
  kind: NarrativeStateKind;
  /** Present only when kind === "curated". */
  body?: string;
}

export function deriveNarrativeState(document: BiographyDocument): NarrativeStateView {
  if (document.narrative && document.narrative.body.trim() !== "") {
    return { kind: "curated", body: document.narrative.body };
  }
  return { kind: "absent" };
}

const SOURCE_LABEL: Record<SourceType, string> = {
  self_reported: "Self-provided",
  nominated_by_other: "Submitted by another member",
  admin_entered: "Entered by an administrator",
  imported_historical: "Imported from historical records",
};

const VERIFICATION_LABEL: Record<PersonVerificationStatus | NarrativeVerificationStatus, string> = {
  provisional: "Awaiting review",
  claim_pending: "Claim under review",
  verified_self: "Verified by the person",
  verified_admin: "Verified by an administrator",
  disputed: "Disputed",
};

export interface ProvenanceDescriptor {
  sourceLabel: string;
  statusLabel: string;
}

export function describeProvenance(
  sourceType: SourceType,
  verificationStatus: PersonVerificationStatus | NarrativeVerificationStatus,
): ProvenanceDescriptor {
  return { sourceLabel: SOURCE_LABEL[sourceType], statusLabel: VERIFICATION_LABEL[verificationStatus] };
}

/** The best available human name for the header, preferring the display
 * name (which may already be a preferred/known-as form). */
export function primaryName(document: BiographyDocument): string {
  return document.identity.displayName;
}
