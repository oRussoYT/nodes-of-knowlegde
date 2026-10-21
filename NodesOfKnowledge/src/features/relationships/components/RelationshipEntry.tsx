import Link from "next/link";

import { describeRelationshipProvenance } from "../derive";
import type { Relationship } from "../types";
import { RelationshipNarrative } from "./RelationshipNarrative";
import { RelationshipPeriod } from "./RelationshipPeriod";
import { RelationshipProvenance } from "./RelationshipProvenance";

// One bond: the counterpart (the "who" -- the headline), the period (the "when
// / how long"), the curated narrative where one exists (the "why it mattered"),
// and provenance one gesture away. The counterpart's name is an h4 (under the
// role group's h3), so the document outline never skips a level.
//
// Production Experience Phase I: the counterpart's name is now a DOORWAY to
// their own canonical Person page. A reader who sees who mentored (or was
// mentored by) this person can follow the documented bond straight to that
// other life -- the mirror of the person page's Participation linking on to an
// institution. The link is justified by the canonical relationship assertion;
// its reason is the surrounding role group ("Mentors", "Students",
// "Collaborators", ...), so it never floats free as a bare "View". A missing
// narrative is simply absent -- never fabricated. Server Component.
export interface RelationshipEntryProps {
  relationship: Relationship;
}

export function RelationshipEntry({ relationship }: RelationshipEntryProps) {
  const provenance = describeRelationshipProvenance(
    relationship.provenance.sourceType,
    relationship.provenance.verificationStatus,
  );

  return (
    <li className="border-l border-border-default pl-4">
      <h4 className="text-base font-medium text-foreground">
        <Link
          href={`/people/${relationship.counterpart.id}`}
          className="underline underline-offset-2"
        >
          {relationship.counterpart.displayName}
        </Link>
      </h4>
      <RelationshipPeriod temporal={relationship.temporal} />
      {relationship.narrative ? <RelationshipNarrative narrative={relationship.narrative} /> : null}
      <div className="mt-2">
        <RelationshipProvenance
          counterpartName={relationship.counterpart.displayName}
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </li>
  );
}
