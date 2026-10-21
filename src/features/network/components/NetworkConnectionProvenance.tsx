import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). The Knowledge Network connection carries the extra "projected from
// a <record>" phrasing — passed through as `projectedFrom` so BOTH the
// accessible name and the tooltip read exactly as before consolidation. The
// disputed/provisional visible Badge remains rendered by NetworkConnectionEntry
// next to this trigger. Presentation lives in ProvenanceAffordance.
export interface NetworkConnectionProvenanceProps {
  connectionLabel: string;
  sourceRecordLabel: string;
  sourceLabel: string;
  statusLabel: string;
}

export function NetworkConnectionProvenance({
  connectionLabel,
  sourceRecordLabel,
  sourceLabel,
  statusLabel,
}: NetworkConnectionProvenanceProps) {
  return (
    <ProvenanceAffordance
      subject={`the connection to ${connectionLabel}`}
      projectedFrom={sourceRecordLabel}
      sourceLabel={sourceLabel}
      statusLabel={statusLabel}
    />
  );
}
