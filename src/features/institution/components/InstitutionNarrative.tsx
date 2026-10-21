import { describeInstitutionProvenance } from "../derive";
import type { NarrativeFacet } from "../types";

// A curated institutional narrative facet: human-authored history, rendered as
// prose, with its provenance shown as deterministic text (source + status) --
// never auto-generated, never AI, never a mission statement presented as
// history, and never dependent on a tooltip to reveal where the account came
// from. Server Component.
export function InstitutionNarrative({ facet }: { facet: NarrativeFacet }) {
  const provenance = describeInstitutionProvenance(facet.provenance.sourceType, facet.provenance.verificationStatus);
  return (
    <div className="mt-3">
      <p className="max-w-prose text-sm leading-relaxed text-foreground">{facet.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {provenance.sourceLabel} · {provenance.statusLabel}
      </p>
    </div>
  );
}
