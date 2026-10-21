import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). The Contribution engine supplies a subject phrase; presentation
// lives in ProvenanceAffordance.
export interface ContributionProvenanceProps {
  subject: string;
  sourceLabel: string;
  statusLabel: string;
}

export function ContributionProvenance({ subject, sourceLabel, statusLabel }: ContributionProvenanceProps) {
  return <ProvenanceAffordance subject={subject} sourceLabel={sourceLabel} statusLabel={statusLabel} />;
}
