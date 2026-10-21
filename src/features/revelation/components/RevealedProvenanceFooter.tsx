import { Badge } from "@/components/ui/Badge";
import type { SourceType, VerificationStatus } from "@/features/shared/provenance";
import { ProvenanceAffordance } from "@/features/shared/ProvenanceAffordance";

import { revelationSourceRecordLabel } from "../copy";
import { describeRevelationProvenance } from "../derive";

// The one shared provenance footer for every revealed element: a calm, visible
// verification Badge for a provisional/disputed record (never colour alone) plus
// the keyboard-operable ProvenanceAffordance that discloses the exact canonical
// record the element decomposes to. Every lens (cohort member, lineage step,
// coverage participation, recurrence occurrence, pathway step) rendered this
// identical block inline; it now lives in one place, so the decomposability
// affordance -- the gesture from a revealed element back to its evidence -- can
// never drift between lenses. `subject` is the element-specific phrase naming what
// the record is OF; `sourceRecordType` is the canonical source table key, turned
// into a human record label here. Server Component.
export interface RevealedProvenanceFooterProps {
  provenance: { sourceType: SourceType; verificationStatus: VerificationStatus };
  subject: string;
  sourceRecordType: string;
}

export function RevealedProvenanceFooter({
  provenance,
  subject,
  sourceRecordType,
}: RevealedProvenanceFooterProps) {
  const described = describeRevelationProvenance(
    provenance.sourceType,
    provenance.verificationStatus,
  );
  const status = provenance.verificationStatus;
  const showBadge = status === "disputed" || status === "provisional";
  const badgeTone: "danger" | "warning" = status === "disputed" ? "danger" : "warning";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {showBadge ? (
        <Badge tone={badgeTone} size="sm">
          {described.statusLabel}
        </Badge>
      ) : null}
      <ProvenanceAffordance
        subject={subject}
        projectedFrom={revelationSourceRecordLabel(sourceRecordType)}
        sourceLabel={described.sourceLabel}
        statusLabel={described.statusLabel}
      />
    </div>
  );
}
