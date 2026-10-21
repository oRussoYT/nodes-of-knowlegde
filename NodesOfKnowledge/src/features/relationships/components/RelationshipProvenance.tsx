import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). The subject phrase is unique per bond via the counterpart's name,
// so the trigger's accessible name stays deterministic and unique — exactly as
// before consolidation. Presentation lives in ProvenanceAffordance.
export interface RelationshipProvenanceProps {
  counterpartName: string;
  sourceLabel: string;
  statusLabel: string;
}

export function RelationshipProvenance({ counterpartName, sourceLabel, statusLabel }: RelationshipProvenanceProps) {
  return (
    <ProvenanceAffordance
      subject={`the relationship with ${counterpartName}`}
      sourceLabel={sourceLabel}
      statusLabel={statusLabel}
    />
  );
}
