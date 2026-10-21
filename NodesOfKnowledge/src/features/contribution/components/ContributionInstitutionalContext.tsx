import { EmptyState } from "@/components/ui/EmptyState";

import { contributionCopy } from "../copy";
import { buildOrganizationContributorGroups, describeContributionProvenance } from "../derive";
import type { OrganizationContributor } from "../types";
import { ContributionAttribution } from "./ContributionAttribution";

// The institutions that helped make the contribution possible, grouped by
// institutional CAPACITY (funding, institutional support, coordination, ...).
// A funder or host is an attributed institutional contributor -- never
// intellectual ownership, never inferred from affiliation, address, or adjacent
// funding. Absence is honest, not decorative. Server Component.
export function ContributionInstitutionalContext({ organizations }: { organizations: OrganizationContributor[] }) {
  const headingId = "institutional-context-heading";
  const groups = buildOrganizationContributorGroups(organizations);

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {contributionCopy.institutionalContext.heading}
      </h2>

      {groups.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={contributionCopy.institutionalContext.absent.title}
            description={contributionCopy.institutionalContext.absent.description}
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
                      href={`/institutions/${entry.organization.id}`}
                      name={entry.organization.name}
                      secondary={entry.organization.shortName}
                      attributionNote={entry.attributionNote}
                      provenanceSubject={`${entry.organization.name}'s attribution`}
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
