import Link from "next/link";

import { setRelationshipHiddenAction } from "../actions";
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
  personId?: string;
}

export function RelationshipEntry({ relationship, personId }: RelationshipEntryProps) {
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
      {relationship.canHide && personId ? (
        <form action={setRelationshipHiddenAction} className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <input type="hidden" name="relationshipId" value={relationship.id} />
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="hidden" value={relationship.hidden ? "false" : "true"} />
          {relationship.hidden ? (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-muted-foreground">Hidden from your page — only you see it</span>
          ) : null}
          <button type="submit" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {relationship.hidden ? "Show on my page again" : "Hide this link from my page"}
          </button>
        </form>
      ) : null}
    </li>
  );
}
