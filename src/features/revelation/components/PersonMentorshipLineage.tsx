import { EmptyState } from "@/components/ui/EmptyState";

import { revelationCopy } from "../copy";
import { buildPersonMentorshipLineageView } from "../derive";
import type { PersonMentorshipLineageDocument } from "../types";
import { LineageStepList } from "./LineageStepList";

// The person-surface lineage revelation: the DOCUMENTED MENTORSHIP DESCENT of one
// person -- the bounded, cycle-safe transitive chain of directional mentorship
// records connecting them to mentors (before them) and students (after them),
// composed deterministically and decomposable back to each canonical record. It
// reads INLINE in the biography's reading spine (after the Relationships/
// Contributions/cohort engines) -- a vantage that opens within the reading; not a
// destination, no navigation, no metric, no graph. It states what it shows; where
// nothing is revealed it holds the space with an honest absence; where a lineage
// is revealed it closes with the honest limits note. It records who mentored whom,
// and nothing about what a mentorship passed on or what it meant. Server Component.
export interface PersonMentorshipLineageProps {
  document: PersonMentorshipLineageDocument | null;
}

export function PersonMentorshipLineage({ document }: PersonMentorshipLineageProps) {
  const view = buildPersonMentorshipLineageView(document);
  const copy = revelationCopy.personMentorshipLineage;

  return (
    <section aria-labelledby="mentorship-lineage-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="mentorship-lineage-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.isEmpty ? (
        <EmptyState title={copy.empty.title} description={copy.empty.description} />
      ) : (
        <>
          <div className="flex flex-col gap-6">
            <LineageStepList
              headingId="mentorship-lineage-mentors"
              heading={copy.upstreamHeading}
              steps={view.upstream}
            />
            {/* The current subject, anchored between mentors (above) and students
                (below), so the reader sees at a glance where this person sits in
                the documented mentorship descent. Not a link -- it is the page
                already being read. */}
            <div className="rounded-md border border-border-strong bg-surface-sunken px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.subjectLabel}
              </p>
              <p className="mt-0.5 text-base font-medium text-foreground">{document?.person.label}</p>
            </div>
            <LineageStepList
              headingId="mentorship-lineage-students"
              heading={copy.downstreamHeading}
              steps={view.downstream}
            />
          </div>
          <section aria-labelledby="mentorship-lineage-limits-heading" className="mt-2">
            <h3 id="mentorship-lineage-limits-heading" className="text-sm font-medium text-foreground">
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
