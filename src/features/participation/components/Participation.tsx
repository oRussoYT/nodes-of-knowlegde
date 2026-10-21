import { EmptyState } from "@/components/ui/EmptyState";

import { participationCopy } from "../copy";
import { buildParticipationView } from "../derive";
import type { ParticipationDocument } from "../types";
import { AffiliationGroup } from "./AffiliationGroup";

// Participation: bounded belonging through time, organized as a MAP OF
// BELONGING (grouped by organization) -- distinct from the Timeline's spine
// through time. Answers "where and how did this person belong?": each
// organization, then the capacities and periods held there, each carrying its
// own provenance. An empty state is a dignified honest absence, never
// fabricated affiliations. Node-neutral and entity-agnostic: give it any
// ParticipationDocument. Server Component.
export function Participation({ document }: { document: ParticipationDocument | null }) {
  const headingId = "participation-heading";
  const view = document
    ? buildParticipationView(document)
    : { isEmpty: true as const, affiliations: [], participationCount: 0 };

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {participationCopy.sectionTitle}
      </h2>

      {view.isEmpty ? (
        <div className="mt-3">
          <EmptyState title={participationCopy.empty.title} description={participationCopy.empty.description} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {view.affiliations.map((affiliation) => (
            <AffiliationGroup
              key={affiliation.key}
              organizationId={affiliation.key}
              organizationName={affiliation.organizationName}
              organizationShortName={affiliation.organizationShortName}
              participations={affiliation.participations}
            />
          ))}
        </div>
      )}
    </section>
  );
}
