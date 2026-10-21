import { describeParticipationProvenance } from "../derive";
import type { Participation as ParticipationModel } from "../types";
import { ParticipationPeriod } from "./ParticipationPeriod";
import { ParticipationProvenance } from "./ParticipationProvenance";

// One belonging: the capacity (the "how" -- the headline), the period (the
// "when / for how long"), optional context, and provenance one gesture away.
// Not an HR line, not an org-chart node -- a piece of institutional memory.
// The capacity is an h4 (under the organization's h3), so the document outline
// never skips a level. Server Component.
export interface ParticipationEntryProps {
  participation: ParticipationModel;
}

export function ParticipationEntry({ participation }: ParticipationEntryProps) {
  const provenance = describeParticipationProvenance(
    participation.provenance.sourceType,
    participation.provenance.verificationStatus,
  );

  return (
    <li className="border-l border-border-default pl-4">
      <h4 className="text-base font-medium text-foreground">{participation.capacity.label}</h4>
      <ParticipationPeriod temporal={participation.temporal} />
      {participation.summary ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{participation.summary}</p>
      ) : null}
      <div className="mt-2">
        <ParticipationProvenance sourceLabel={provenance.sourceLabel} statusLabel={provenance.statusLabel} />
      </div>
    </li>
  );
}
