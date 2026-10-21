import { EmptyState } from "@/components/ui/EmptyState";

import { contributionCopy } from "../copy";
import { buildContributionProjectionView } from "../derive";
import type { OrganizationContributionsDocument } from "../types";
import { ContributionProjectionEntry } from "./ContributionProjectionEntry";

// The institution's contributions: what this institution helped make possible,
// in what institutional capacity, when, with which provenance -- the SAME
// canonical attributions that drive each dedicated Contribution page. Never
// inferred because a person was affiliated there, a publication lists its
// address, it hosted an event, or it funded adjacent work. Consistent with the
// dedicated page by construction. An empty state is a dignified honest absence.
// Server Component.
export function InstitutionContributions({ document }: { document: OrganizationContributionsDocument | null }) {
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
            title={contributionCopy.projection.organizationEmpty.title}
            description={contributionCopy.projection.organizationEmpty.description}
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
