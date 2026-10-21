import { EmptyState } from "@/components/ui/EmptyState";

import { revelationCopy } from "../copy";
import { buildPersonRecurrenceView } from "../derive";
import type { PersonRecurrenceDocument } from "../types";
import { RecurrenceGroupList } from "./RecurrenceGroupList";

// The person-surface recurrence revelation (M8.5): the phenomena the record
// documents to have RECURRED for one person -- the same role held again at the
// same institution, documented events of the same kind, documented contributions
// of the same kind -- each shown only when >= 2 distinct occurrences exist, with
// a plain count and the occurrences in time order. It composes the person's own
// already-preserved assertions into their entailed repetition, decomposable back
// to each record. It reads INLINE in the biography's reading spine (after the
// co-presence and lineage engines) -- a vantage that opens within the reading;
// not a destination, no navigation, no metric, no graph. Recurrence is NOT
// similarity: nothing is compared, clustered, or inferred; the count is a count
// of records, never a rank or a measure of importance. Where nothing recurred it
// holds the space with an honest absence; a single documented occurrence is not
// recurrence. Server Component.
export interface PersonRecurrenceProps {
  document: PersonRecurrenceDocument | null;
}

export function PersonRecurrence({ document }: PersonRecurrenceProps) {
  const view = buildPersonRecurrenceView(document);
  const copy = revelationCopy.personRecurrence;

  return (
    <section aria-labelledby="person-recurrence-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="person-recurrence-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.isEmpty ? (
        <EmptyState title={copy.empty.title} description={copy.empty.description} />
      ) : (
        <>
          <RecurrenceGroupList groups={view.groups} idPrefix="person-recurrence" />
          <section aria-labelledby="person-recurrence-limits-heading" className="mt-2">
            <h3
              id="person-recurrence-limits-heading"
              className="text-sm font-medium text-foreground"
            >
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
