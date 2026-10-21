import { EmptyState } from "@/components/ui/EmptyState";

import { revelationCopy } from "../copy";
import { buildOrganizationGenerationsView } from "../derive";
import type { OrganizationGenerationsDocument } from "../types";
import { OrganizationGenerationAnchor } from "./OrganizationGenerationAnchor";

// The institution-surface co-presence revelation: the DOCUMENTED CO-PRESENCE
// within one institution -- which participants the record places here at the same
// time as which others, composed deterministically from participation Assertions
// and decomposable back to them. It is the institution-vantage mirror of the
// person page's documented cohorts (M8.1), reusing the same co-presence relation
// and the same <CohortMember> presentation. It reads INLINE in the institution's
// reading spine (after the institution's Participation/Contributions engines), a
// vantage that opens within the reading; it is not a destination and adds no
// navigation. The section always states what it shows; where nothing is revealed
// it holds the space with a dignified, honest absence; where co-presence is
// revealed it closes with the honest limits-of-this-view note, so the archive
// never looks more complete or more certain than it is. Textual and fully usable
// without any diagram. Server Component.
export interface OrganizationGenerationsProps {
  document: OrganizationGenerationsDocument | null;
}

export function OrganizationGenerations({ document }: OrganizationGenerationsProps) {
  const view = buildOrganizationGenerationsView(document);
  const copy = revelationCopy.organizationGenerations;

  return (
    <section aria-labelledby="org-copresence-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="org-copresence-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.isEmpty ? (
        <EmptyState title={copy.empty.title} description={copy.empty.description} />
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {view.anchors.map((anchor) => (
              <OrganizationGenerationAnchor key={anchor.person.id} anchor={anchor} />
            ))}
          </div>
          <section aria-labelledby="org-copresence-limits-heading" className="mt-2">
            <h3 id="org-copresence-limits-heading" className="text-sm font-medium text-foreground">
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
