import { EmptyState } from "@/components/ui/EmptyState";

import { institutionCopy } from "../copy";
import { buildInstitutionParticipationView } from "../derive";
import type { InstitutionParticipationDocument } from "../types";
import { InstitutionParticipationEntry } from "./InstitutionParticipationEntry";

// The institution's human history: the SAME canonical M6.3 Participation
// records, projected from the institution's perspective and grouped by capacity
// ("Researcher", "Director", "Technician", ...), ordered historically -- never
// a leaderboard, staff directory, or prestige hierarchy. Equal dignity is
// binding. An empty state is a dignified honest absence. Server Component.
export function InstitutionParticipation({ document }: { document: InstitutionParticipationDocument | null }) {
  const headingId = "participation-heading";
  const view = document
    ? buildInstitutionParticipationView(document)
    : { isEmpty: true as const, groups: [], count: 0 };

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {institutionCopy.participation.heading}
      </h2>

      {view.isEmpty ? (
        <div className="mt-3">
          <EmptyState title={institutionCopy.participation.empty.title} description={institutionCopy.participation.empty.description} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {view.groups.map((group) => (
            <div key={group.key}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.heading}</h3>
              <ul className="mt-3 flex flex-col gap-6">
                {group.entries.map((entry) => (
                  <InstitutionParticipationEntry key={entry.id} entry={entry} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
