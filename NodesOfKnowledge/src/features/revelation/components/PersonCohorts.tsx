import { EmptyState } from "@/components/ui/EmptyState";

import { revelationCopy } from "../copy";
import { buildPersonCohortsView } from "../derive";
import type { PersonCohortsDocument } from "../types";
import { CohortGroup } from "./CohortGroup";

// The co-presence revelation on the Scientific Biography: the DOCUMENTED COHORTS
// this person belonged to -- other people documented at the same institutions
// during overlapping periods, composed deterministically from participation
// Assertions and decomposable back to them. It reads INLINE in the biography's
// reading spine (after the person's own engines), a vantage that opens within
// the reading; it is not a destination and adds no navigation. The section
// always states what it shows; where nothing is revealed it holds the space
// with a dignified, honest absence; where a cohort is revealed it closes with
// the honest limits-of-this-view note, so the archive never looks more complete
// or more certain than it is. Textual and fully usable without any diagram.
// Server Component.
export interface PersonCohortsProps {
  document: PersonCohortsDocument | null;
}

export function PersonCohorts({ document }: PersonCohortsProps) {
  const view = buildPersonCohortsView(document);
  const copy = revelationCopy.personCohorts;

  return (
    <section aria-labelledby="cohorts-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="cohorts-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.isEmpty ? (
        <EmptyState title={copy.empty.title} description={copy.empty.description} />
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {view.cohorts.map((cohort) => (
              <CohortGroup key={cohort.organization.id} cohort={cohort} />
            ))}
          </div>
          <section aria-labelledby="cohorts-limits-heading" className="mt-2">
            <h3 id="cohorts-limits-heading" className="text-sm font-medium text-foreground">
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
