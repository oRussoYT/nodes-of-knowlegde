import { EmptyState } from "@/components/ui/EmptyState";

import { contributionCopy } from "../copy";
import { buildContributionProjectionView } from "../derive";
import type { PersonContributionsDocument } from "../types";
import { ContributionProjectionEntry } from "./ContributionProjectionEntry";

// The person's contributions: what this person helped make possible, in what
// capacity, when, with which provenance -- the SAME canonical attributions that
// drive each dedicated Contribution page. Answers the Design Bible's "scientific
// contributions" category as a body of work, never a count-as-status, never a
// ranking, never a publication list disguised as history, never inferred from
// participation or authorship. An empty state is a dignified honest absence.
// Server Component.
export function PersonContributions({ document }: { document: PersonContributionsDocument | null }) {
  const headingId = "contributions-heading";
  const view = document
    ? buildContributionProjectionView(document.contributions)
    : { isEmpty: true as const, entries: [], count: 0 };

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {contributionCopy.projection.heading}
      </h2>

      {view.isEmpty ? (
        <div className="mt-3">
          <EmptyState
            title={contributionCopy.projection.personEmpty.title}
            description={contributionCopy.projection.personEmpty.description}
          />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-6">
          {view.entries.map((entry) => (
            <ContributionProjectionEntry key={entry.attributionId} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}
