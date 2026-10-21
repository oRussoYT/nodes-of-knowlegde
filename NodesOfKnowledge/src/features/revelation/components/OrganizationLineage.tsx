import { EmptyState } from "@/components/ui/EmptyState";

import { revelationCopy } from "../copy";
import { buildOrganizationLineageView } from "../derive";
import type { OrganizationLineageDocument } from "../types";
import { LineageStepList } from "./LineageStepList";

// The institution-surface lineage revelation: the DOCUMENTED SUCCESSION/FORMATION
// DESCENT of one institution -- the bounded, cycle-safe transitive chain of
// directional succession/merger records connecting it to antecedents (before it)
// and successors (after it), composed deterministically and decomposable back to
// each canonical record. It deepens M7's one-hop institutional lineage to the
// full chain, and reads INLINE in the institution's reading spine (after the
// Participation/Contributions/co-presence engines) -- a vantage that opens within
// the reading; not a destination, no navigation, no metric, no graph. It states
// what it shows; where nothing is revealed it holds the space with an honest
// absence; where descent is revealed it closes with the honest limits note. It
// records what came before what, never what followed from what. Server Component.
export interface OrganizationLineageProps {
  document: OrganizationLineageDocument | null;
}

export function OrganizationLineage({ document }: OrganizationLineageProps) {
  const view = buildOrganizationLineageView(document);
  const copy = revelationCopy.organizationLineage;

  return (
    <section aria-labelledby="org-lineage-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="org-lineage-heading" className="text-xl font-medium text-foreground">
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
              headingId="org-lineage-antecedents"
              heading={copy.upstreamHeading}
              steps={view.upstream}
            />
            {/* The current subject, anchored between antecedents (above) and
                successors (below), so the reader sees at a glance where this
                institution sits in the documented descent. Not a link -- it is
                the page already being read. */}
            <div className="rounded-md border border-border-strong bg-surface-sunken px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.subjectLabel}
              </p>
              <p className="mt-0.5 text-base font-medium text-foreground">
                {document?.organization.label}
              </p>
            </div>
            <LineageStepList
              headingId="org-lineage-successors"
              heading={copy.downstreamHeading}
              steps={view.downstream}
            />
          </div>
          <section aria-labelledby="org-lineage-limits-heading" className="mt-2">
            <h3 id="org-lineage-limits-heading" className="text-sm font-medium text-foreground">
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
