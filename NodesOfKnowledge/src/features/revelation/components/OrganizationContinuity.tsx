import { EmptyState } from "@/components/ui/EmptyState";

import { describeDocumentedStatus, revelationCopy } from "../copy";
import { buildOrganizationContinuityView } from "../derive";
import type { OrganizationContinuityDocument } from "../types";
import { PracticeCoverage } from "./PracticeCoverage";

// The institution-surface continuity & rupture revelation (M8.4): for one
// institution, the DOCUMENTED COVERAGE of each participation capacity over time
// (the year-summarised spans the record covers and the silences between them),
// alongside the institution's OWN recorded status and closure. It composes a
// time-ordered series of already-dated participation Assertions per capacity into
// their entailed coverage, decomposable back to each record. It reads INLINE in
// the institution's reading spine (after the co-presence and lineage engines) --
// a vantage that opens within the reading; not a destination, no navigation, no
// metric, no graph.
//
// It holds four honest states apart and NEVER collapses them: a span that runs
// to an open-ended record is documented CONTINUATION; a terminal recorded status
// is a documented RUPTURE (the only rupture -- from the explicit vocabulary, with
// its closure date); a silence between spans is an EVIDENTIARY GAP, never an end;
// a record that simply stops is an UNKNOWN OUTCOME -- what followed is not
// documented, which is not the same as "ended". The recorded status is shown as
// the institution's own assertion, never used to date the end of any capacity.
// Where nothing is revealed it holds the space with an honest absence; where
// coverage is revealed it closes with the honest limits note. Server Component.
export interface OrganizationContinuityProps {
  document: OrganizationContinuityDocument | null;
}

export function OrganizationContinuity({ document }: OrganizationContinuityProps) {
  const view = buildOrganizationContinuityView(document);
  const copy = revelationCopy.organizationContinuity;

  return (
    <section aria-labelledby="org-continuity-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="org-continuity-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.isEmpty ? (
        <EmptyState title={copy.empty.title} description={copy.empty.description} />
      ) : (
        <>
          {/* The institution's own recorded status -- a documented rupture only
              when the explicit vocabulary is terminal. Shown apart from the
              coverage so it is never read as dating a particular capacity. */}
          <section aria-labelledby="org-continuity-status-heading">
            <h3 id="org-continuity-status-heading" className="text-sm font-medium text-foreground">
              {copy.statusHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {describeDocumentedStatus(view.status, view.closureYear)}
            </p>
          </section>

          {view.practices.length > 0 ? (
            <section aria-labelledby="org-continuity-coverage-heading" className="flex flex-col gap-6">
              <h3
                id="org-continuity-coverage-heading"
                className="text-sm font-medium text-foreground"
              >
                {copy.coverageHeading}
              </h3>
              <div className="flex flex-col gap-6">
                {view.practices.map((practice) => (
                  <PracticeCoverage
                    key={practice.capacity.key}
                    headingId={`org-continuity-capacity-${practice.capacity.key}`}
                    practice={practice}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="org-continuity-limits-heading" className="mt-2">
            <h3
              id="org-continuity-limits-heading"
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
