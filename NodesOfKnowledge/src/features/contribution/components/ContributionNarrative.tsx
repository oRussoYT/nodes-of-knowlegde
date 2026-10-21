import { describeContributionProvenance } from "../derive";
import type { ContributionNarrativeFacet } from "../types";

// A curated contribution narrative facet: human-authored interpretation,
// rendered as prose, with its provenance shown as deterministic text (source +
// status) -- kept SEPARATE from the canonical assertion, never auto-generated,
// never AI, never a publication abstract passed off as history, and never
// dependent on a tooltip to reveal where the account came from. Server
// Component.
export function ContributionNarrative({ facet }: { facet: ContributionNarrativeFacet }) {
  const provenance = describeContributionProvenance(facet.provenance.sourceType, facet.provenance.verificationStatus);
  return (
    <div className="mt-3">
      <p className="max-w-prose text-sm leading-relaxed text-foreground">{facet.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {provenance.sourceLabel} · {provenance.statusLabel}
      </p>
    </div>
  );
}
