import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). The Institution engine supplies a subject phrase (unique per
// subject, e.g. "Ada Lovelace's participation"); presentation lives in
// ProvenanceAffordance.
export interface InstitutionProvenanceProps {
  subject: string;
  sourceLabel: string;
  statusLabel: string;
}

export function InstitutionProvenance({ subject, sourceLabel, statusLabel }: InstitutionProvenanceProps) {
  return <ProvenanceAffordance subject={subject} sourceLabel={sourceLabel} statusLabel={statusLabel} />;
}
