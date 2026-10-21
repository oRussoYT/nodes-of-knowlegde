import { contributionScope, describeContributionProvenance } from "../derive";
import type { Contribution } from "../types";
import { ContributionProvenance } from "./ContributionProvenance";

// The contribution identity header: the title (one clear h1), the KIND of
// historical object it is, its own temporal scope, and its place at a chosen
// safe granularity -- with the record's own provenance one gesture away. No
// score, no metric, no "impact"; a contribution is a historical object, not a
// dashboard tile. Server Component.
export function ContributionIdentityHeader({ contribution }: { contribution: Contribution }) {
  const scope = contributionScope(contribution.temporal);
  const provenance = describeContributionProvenance(
    contribution.provenance.sourceType,
    contribution.provenance.verificationStatus,
  );
  const meta = [contribution.kind?.label, scope.isUnknown ? null : scope.label, contribution.place].filter(
    (part): part is string => Boolean(part),
  );

  return (
    <header>
      <h1 className="text-2xl font-semibold text-foreground">{contribution.title}</h1>

      {meta.length > 0 ? <p className="mt-2 text-sm text-muted-foreground">{meta.join(" · ")}</p> : null}
      {scope.certaintyNote ? <p className="mt-1 text-xs text-muted-foreground">{scope.certaintyNote}</p> : null}

      {contribution.description ? (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-foreground">{contribution.description}</p>
      ) : null}

      <div className="mt-3">
        <ContributionProvenance
          subject="this contribution record"
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </header>
  );
}
