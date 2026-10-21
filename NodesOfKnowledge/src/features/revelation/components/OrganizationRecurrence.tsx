import { EmptyState } from "@/components/ui/EmptyState";

import { revelationCopy } from "../copy";
import { buildOrganizationRecurrenceView } from "../derive";
import type { OrganizationRecurrenceDocument } from "../types";
import { RecurrenceGroupList } from "./RecurrenceGroupList";

// The institution-surface recurrence revelation (M8.5): the phenomena the record
// documents to have RECURRED for one institution -- documented events of the same
// kind and documented contributions of the same kind -- each shown only when
// >= 2 distinct occurrences exist, with a plain count and the occurrences in time
// order. Participations are DELIBERATELY not repeated here: per-capacity coverage
// over time is M8.4's continuity lens, read just above. It composes the
// institution's own already-preserved assertions into their entailed repetition,
// decomposable back to each record. It reads INLINE in the institution's reading
// spine (after the co-presence, lineage, and continuity engines) -- a vantage
// that opens within the reading; not a destination, no navigation, no metric, no
// graph. Recurrence is NOT similarity: nothing is compared, clustered, or
// inferred; the count is a count of records, never a rank or a measure of
// importance. Where nothing recurred it holds the space with an honest absence.
// Server Component.
export interface OrganizationRecurrenceProps {
  document: OrganizationRecurrenceDocument | null;
}

export function OrganizationRecurrence({ document }: OrganizationRecurrenceProps) {
  const view = buildOrganizationRecurrenceView(document);
  const copy = revelationCopy.organizationRecurrence;

  return (
    <section aria-labelledby="org-recurrence-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="org-recurrence-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.isEmpty ? (
        <EmptyState title={copy.empty.title} description={copy.empty.description} />
      ) : (
        <>
          <RecurrenceGroupList groups={view.groups} idPrefix="org-recurrence" />
          <section aria-labelledby="org-recurrence-limits-heading" className="mt-2">
            <h3 id="org-recurrence-limits-heading" className="text-sm font-medium text-foreground">
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
