import Link from "next/link";

import { describeParticipationHere, revelationCopy } from "../copy";
import type { GenerationAnchor } from "../types";
import { CohortMember } from "./CohortMember";
import { RevealedPeriod } from "./RevealedPeriod";

// One participant of a focal institution, as an anchor into the documented
// co-presence: the participant (a link to their canonical page -- a doorway back
// into the record), ALL of their own documented participation(s) here (so both
// sides of every overlap are visible as evidence), and the other people the
// record places here during an overlapping period. The participant name is an h3
// (under the section's h2); the sub-headings and each co-present person are h4,
// so the document outline never skips a level. Co-present people are rendered by
// the SAME <CohortMember> the person page uses -- a co-presence read identically
// from both vantages. The participant is NEVER described as related to,
// collaborating with, or influencing anyone -- only as documentedly present here
// at the same time. Order is the read model's neutral, historical order -- never
// a ranking. Server Component.
export interface OrganizationGenerationAnchorProps {
  anchor: GenerationAnchor;
}

export function OrganizationGenerationAnchor({ anchor }: OrganizationGenerationAnchorProps) {
  const person = anchor.person;
  const headingId = `org-copresence-${person.id}`;
  const copy = revelationCopy.organizationGenerations;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-lg font-medium text-foreground">
        {person.href ? (
          <Link href={person.href} className="underline underline-offset-2">
            {person.label}
          </Link>
        ) : (
          <span>{person.label}</span>
        )}
      </h3>

      <div className="mt-3">
        <h4 className="text-sm font-medium text-muted-foreground">{copy.participationsHeading}</h4>
        <ul className="mt-1 flex flex-col gap-2">
          {anchor.participations.map((participation) => (
            <li key={participation.id}>
              <p className="text-sm text-foreground">
                {describeParticipationHere(person.label, participation.capacity)}
              </p>
              <RevealedPeriod temporal={participation.temporal} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">{copy.coPresentHeading}</h4>
        <ul className="mt-2 flex flex-col gap-4">
          {anchor.coPresent.map((member) => (
            <CohortMember key={member.source.id} member={member} />
          ))}
        </ul>
      </div>
    </section>
  );
}
