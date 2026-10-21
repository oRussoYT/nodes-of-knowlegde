import Link from "next/link";

import { describeInstitutionProvenance } from "../derive";
import type { InstitutionParticipationEntry as EntryModel } from "../types";
import { InstitutionPeriod } from "./InstitutionPeriod";
import { InstitutionProvenance } from "./InstitutionProvenance";

// One person's participation, seen from the institution: the person (the "who"
// -- the headline, an h4 under the capacity group's h3), the period, optional
// context, and provenance.
//
// Production Experience Phase I: the person's name is now a DOORWAY to their
// own canonical Person page. From an institution's human history a reader can
// follow any participant straight into their scientific life -- the mirror of
// the person page's Participation linking back to this institution. The link is
// justified by the canonical participation assertion; its reason is the
// surrounding capacity group ("Researcher", "Director", "Technician", ...), so
// it is never a bare "View". Every participation, of every capacity, is given
// equal dignity -- a mateiro, technician, or field assistant reads exactly like
// a director, and every one is an equally reachable doorway. Server Component.
export function InstitutionParticipationEntry({ entry }: { entry: EntryModel }) {
  const provenance = describeInstitutionProvenance(entry.provenance.sourceType, entry.provenance.verificationStatus);

  return (
    <li className="border-l border-border-default pl-4">
      <h4 className="text-base font-medium text-foreground">
        <Link href={`/people/${entry.person.id}`} className="underline underline-offset-2">
          {entry.person.displayName}
        </Link>
      </h4>
      <InstitutionPeriod temporal={entry.temporal} />
      {entry.summary ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
      ) : null}
      <div className="mt-2">
        <InstitutionProvenance
          subject={`${entry.person.displayName}'s participation`}
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </li>
  );
}
