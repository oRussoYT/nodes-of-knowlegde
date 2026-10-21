import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). Participation reads provenance through the one shared affordance;
// this wrapper supplies only the engine's subject phrase.
export interface ParticipationProvenanceProps {
  sourceLabel: string;
  statusLabel: string;
}

export function ParticipationProvenance({ sourceLabel, statusLabel }: ParticipationProvenanceProps) {
  return <ProvenanceAffordance subject="this participation" sourceLabel={sourceLabel} statusLabel={statusLabel} />;
}
