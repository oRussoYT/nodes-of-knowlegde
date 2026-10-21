import { EmptyState } from "@/components/ui/EmptyState";

import { contributionCopy } from "../copy";
import { buildPersonContributorGroups, describeContributionProvenance } from "../derive";
import type { PersonContributor } from "../types";
import { ContributionAttribution } from "./ContributionAttribution";

// The people who contributed, grouped by CAPACITY ("Field observation",
// "Coordination", "Training", ...), in first-encounter order -- never a
// leaderboard, never a prestige hierarchy. Equal dignity is binding. When no
// individual is recorded, an honest collective state is shown rather than a
// fabricated person: some contributions are collective, and their individual
// contributors cannot or should not be isolated. Server Component.
export function ContributionContributors({ people }: { people: PersonContributor[] }) {
  const headingId = "contributors-heading";
  const groups = buildPersonContributorGroups(people);

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {contributionCopy.contributors.heading}
      </h2>

      {groups.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={contributionCopy.contributors.absent.title}
            description={contributionCopy.contributors.absent.description}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.key}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.heading}</h3>
              <ul className="mt-3 flex flex-col gap-6">
                {group.entries.map((entry) => {
                  const provenance = describeContributionProvenance(entry.provenance.sourceType, entry.provenance.verificationStatus);
                  return (
                    <ContributionAttribution
                      key={entry.id}
                      href={`/people/${entry.person.id}`}
                      name={entry.person.displayName}
                      attributionNote={entry.attributionNote}
                      provenanceSubject={`${entry.person.displayName}'s attribution`}
                      sourceLabel={provenance.sourceLabel}
                      statusLabel={provenance.statusLabel}
                    />
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
