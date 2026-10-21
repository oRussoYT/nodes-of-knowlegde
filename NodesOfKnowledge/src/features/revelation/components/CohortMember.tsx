import Link from "next/link";

import { describeParticipationHere, revelationCopy } from "../copy";
import type { CohortMember as CohortMemberType } from "../types";
import { NodeDoorway } from "./NodeDoorway";
import { RevealedPeriod } from "./RevealedPeriod";
import { RevealedProvenanceFooter } from "./RevealedProvenanceFooter";

// One documented cohort member: the other person (a link to their canonical
// page, a doorway back into the record), a deterministic one-sentence statement
// of their documented participation at this institution, the period, and
// provenance one gesture away. A provisional or disputed record renders a calm,
// visible verification Badge (never colour alone) so its state is legible
// without the tooltip. The member name is an h4 (under the cohort's h3), so the
// document outline never skips a level. The member is NEVER described as
// related to, collaborating with, or influenced by the focal person -- only as
// documentedly present at the same institution in an overlapping period. Server
// Component.
//
// M8.6 integration: a minimal, calm doorway sets the bounded-pathway target
// (?pathwayTo) from this already-revealed person, so a reader can ask the
// pathway lens below to trace the documented chain to them. It is a request to
// trace, never an assertion that a chain exists (the lens answers honestly).
export interface CohortMemberProps {
  member: CohortMemberType;
}

export function CohortMember({ member }: CohortMemberProps) {
  const person = member.person;

  return (
    <li className="border-l border-border-default pl-4">
      <h4 className="text-base font-medium text-foreground">
        <NodeDoorway node={person} />
      </h4>
      <p className="mt-1 text-sm text-foreground">
        {describeParticipationHere(person.label, member.capacity)}
      </p>
      <RevealedPeriod temporal={member.temporal} />
      <RevealedProvenanceFooter
        provenance={member.provenance}
        subject={`${person.label}'s participation`}
        sourceRecordType={member.source.type}
      />
      <p className="mt-2 text-sm">
        <Link
          href={`?pathwayTo=${person.id}#person-pathway-heading`}
          className="text-muted-foreground underline underline-offset-2"
        >
          {revelationCopy.personPathway.doorwayLabel}
        </Link>
      </p>
    </li>
  );
}
