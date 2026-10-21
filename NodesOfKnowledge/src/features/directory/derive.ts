// Small, pure presentation helpers for the reading directories. These map
// a record's verification (and, for institutions, lifecycle status) to the
// label + Badge tone a listing shows. Kept engine-neutral and unit-tested.
// They present already-stored provenance; they never infer or fabricate it.

import { STATUS_LABELS } from "@/features/institution/copy";

export type VerificationTone = "neutral" | "success" | "warning" | "info" | "danger";

export interface VerificationBadge {
  label: string;
  tone: VerificationTone;
}

/**
 * Verification status -> a compact, honest badge. Covers the entity
 * verification values (provisional / verified_self / verified_admin /
 * disputed) plus the person-only claim_pending. `merged` never reaches a
 * listing (excluded by list_people). Unknown values fall back to the
 * conservative "provisional" presentation rather than exposing a raw enum.
 */
export function verificationBadge(status: string): VerificationBadge {
  switch (status) {
    case "verified_admin":
    case "verified_self":
      return { label: "Verified", tone: "success" };
    case "claim_pending":
      return { label: "Claim pending", tone: "info" };
    case "disputed":
      return { label: "Disputed", tone: "warning" };
    case "provisional":
    default:
      return { label: "Provisional", tone: "neutral" };
  }
}

/** Institution lifecycle status -> its human label (reuses the engine map). */
export function institutionStatusLabel(status: string): string {
  return (STATUS_LABELS as Record<string, string>)[status] ?? status;
}
