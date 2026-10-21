import Link from "next/link";

import { describeParticipationHere, revelationCopy } from "../copy";
import type { Cohort } from "../types";
import { CohortMember } from "./CohortMember";
import { RevealedPeriod } from "./RevealedPeriod";

// One documented cohort, at one institution: the institution (a link to its
// canonical page -- a doorway back into the record), the focal person's own
// anchoring participation(s) there (so a reader can see BOTH sides of the
// overlap -- the evidence for why this person is part of the institution's
// cohort), and the members whose documented periods overlap. The institution
// name is an h3 (under the section's h2); member names are h4. Order is the
// read model's neutral, historical order -- never a ranking. Server Component.
export interface CohortGroupProps {
  cohort: Cohort;
}

export function CohortGroup({ cohort }: CohortGroupProps) {
  const org = cohort.organization;
  const headingId = `cohort-${org.id}`;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-lg font-medium text-foreground">
        {org.href ? (
          <Link href={org.href} className="underline underline-offset-2">
            {org.label}
          </Link>
        ) : (
          <span>{org.label}</span>
        )}
      </h3>
      {org.secondaryLabel ? (
        <p className="text-xs text-muted-foreground">{org.secondaryLabel}</p>
      ) : null}

      {cohort.focalParticipations.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {revelationCopy.personCohorts.anchorHeading}
          </h4>
          <ul className="mt-1 flex flex-col gap-2">
            {cohort.focalParticipations.map((anchor) => (
              <li key={anchor.id}>
                <p className="text-sm text-foreground">
                  {describeParticipationHere("This person", anchor.capacity)}
                </p>
                <RevealedPeriod temporal={anchor.temporal} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          {revelationCopy.personCohorts.membersHeading}
        </h4>
        <ul className="mt-2 flex flex-col gap-4">
          {cohort.members.map((member) => (
            <CohortMember key={member.source.id} member={member} />
          ))}
        </ul>
      </div>
    </section>
  );
}
