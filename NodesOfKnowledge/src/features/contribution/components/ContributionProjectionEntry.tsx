import Link from "next/link";

import { contributionCopy } from "../copy";
import { describeContributionProvenance } from "../derive";
import type { ContributionAttributionEntry } from "../types";
import { ContributionProvenance } from "./ContributionProvenance";
import { ContributionTemporalScope } from "./ContributionTemporalScope";

// One projected contribution as it appears on a person's or an institution's
// page: the contribution's title (an h3 linking to its dedicated page), its
// kind, the actor's capacity, its temporal scope, an optional note, and the
// attribution's OWN provenance (distinct from the contribution record's). One
// canonical attribution drives this and the dedicated page -- consistent by
// construction, never a duplicated claim, never a count-as-status. Server
// Component.
export function ContributionProjectionEntry({ entry }: { entry: ContributionAttributionEntry }) {
  const provenance = describeContributionProvenance(
    entry.attributionProvenance.sourceType,
    entry.attributionProvenance.verificationStatus,
  );
  const meta = [entry.contribution.kind?.label, `${contributionCopy.attributedAs.toLowerCase()} ${entry.capacity.label.toLowerCase()}`].filter(
    (part): part is string => Boolean(part),
  );

  return (
    <li className="border-l border-border-default pl-4">
      <h3 className="text-sm font-semibold text-foreground">
        <Link
          href={`/contributions/${entry.contribution.id}`}
          className="rounded-sm underline decoration-dotted underline-offset-2 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {entry.contribution.title}
        </Link>
      </h3>
      {meta.length > 0 ? <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{meta.join(" · ")}</p> : null}
      <ContributionTemporalScope temporal={entry.contribution.temporal} />
      {entry.attributionNote ? (
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{entry.attributionNote}</p>
      ) : null}
      <div className="mt-2">
        <ContributionProvenance
          subject={`this attribution of "${entry.contribution.title}"`}
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </li>
  );
}
