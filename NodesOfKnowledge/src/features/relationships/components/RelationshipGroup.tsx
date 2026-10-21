import type { Relationship } from "../types";
import { RelationshipEntry } from "./RelationshipEntry";

// A role group: the counterpart's role in the plural ("Mentors", "Students",
// "Collaborators") heading the bonds of that kind, from the viewed person's
// perspective. Because the read model computes the counterpart's (inverse)
// role, the same canonical bond files here under the right heading on either
// person's page. Every relationship, of every role, is given equal treatment --
// the engine ranks none above another. Server Component.
export interface RelationshipGroupProps {
  heading: string;
  relationships: Relationship[];
}

export function RelationshipGroup({ heading, relationships }: RelationshipGroupProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h3>
      <ul className="mt-3 flex flex-col gap-6">
        {relationships.map((relationship) => (
          <RelationshipEntry key={relationship.id} relationship={relationship} />
        ))}
      </ul>
    </div>
  );
}
