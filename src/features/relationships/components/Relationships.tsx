import { EmptyState } from "@/components/ui/EmptyState";

import { relationshipsCopy } from "../copy";
import { buildRelationshipView } from "../derive";
import type { RelationshipDocument } from "../types";
import { RelationshipGroup } from "./RelationshipGroup";

// Relationships: historically meaningful bonds, grouped by WHO the other person
// was to this person ("Mentors", "Students", "Collaborators") -- answering "who
// shaped this life, and whose lives did this person shape?". Distinct from the
// Timeline (a spine through time) and Participation (a map of belonging). Each
// bond carries its own provenance and, where curated, a narrative. An empty
// state is a dignified honest absence -- never suggested, inferred, or
// fabricated connections. Node-neutral and entity-agnostic in shape (the read
// model already resolves each bond to the viewed person's perspective, so the
// same canonical record reads correctly here on either person's page). Server
// Component.
export function Relationships({ document }: { document: RelationshipDocument | null }) {
  const headingId = "relationships-heading";
  const view = document
    ? buildRelationshipView(document)
    : { isEmpty: true as const, groups: [], relationshipCount: 0 };

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {relationshipsCopy.sectionTitle}
      </h2>

      {view.isEmpty ? (
        <div className="mt-3">
          <EmptyState title={relationshipsCopy.empty.title} description={relationshipsCopy.empty.description} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {view.groups.map((group) => (
            <RelationshipGroup key={group.key} heading={group.heading} relationships={group.relationships} />
          ))}
        </div>
      )}
    </section>
  );
}
