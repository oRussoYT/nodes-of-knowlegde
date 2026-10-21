import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

// Thin adapter over the canonical ProvenanceAffordance (Production Experience
// Phase I). The Biography passes a bare subject ("identity", "narrative"); this
// adapter composes "the <subject>" so the accessible name reads "Provenance of
// the identity: ..." exactly as before consolidation. Presentation lives in
// ProvenanceAffordance.
export interface ProvenanceDisclosureProps {
  sourceLabel: string;
  statusLabel: string;
  /** Short context, e.g. "identity" or "narrative". */
  subject: string;
}

export function ProvenanceDisclosure({ sourceLabel, statusLabel, subject }: ProvenanceDisclosureProps) {
  return <ProvenanceAffordance subject={`the ${subject}`} sourceLabel={sourceLabel} statusLabel={statusLabel} />;
}
