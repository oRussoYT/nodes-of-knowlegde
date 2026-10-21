import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). The Timeline reads provenance through the one shared affordance;
// this wrapper supplies only the engine's subject phrase. No presentation,
// accessibility, or determinism lives here — it all lives in ProvenanceAffordance.
export interface EventProvenanceProps {
  sourceLabel: string;
  statusLabel: string;
}

export function EventProvenance({ sourceLabel, statusLabel }: EventProvenanceProps) {
  return <ProvenanceAffordance subject="this event" sourceLabel={sourceLabel} statusLabel={statusLabel} />;
}
