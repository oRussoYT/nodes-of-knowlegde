import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReadingSpine } from "@/components/ui/ReadingSpine";
import { pageTitle } from "@/config/site";
import { ContributionContributors } from "@/features/contribution/components/ContributionContributors";
import { ContributionIdentityHeader } from "@/features/contribution/components/ContributionIdentityHeader";
import { ContributionInstitutionalContext } from "@/features/contribution/components/ContributionInstitutionalContext";
import { ContributionNarrative } from "@/features/contribution/components/ContributionNarrative";
import { ContributionReservedSection } from "@/features/contribution/components/ContributionReservedSection";
import { contributionCopy, NARRATIVE_FACET_LABELS } from "@/features/contribution/copy";
import { narrativeFacet } from "@/features/contribution/derive";
import { getContribution, getContributionTimeline } from "@/features/contribution/read";
import { Timeline } from "@/features/timeline/components/Timeline";

// The Contribution page -- a first-class historical reading experience for a
// Contribution as a historical object (M6.6): a scholarly object history and
// archival dossier, a gateway into the people and institutions that made the
// contribution possible. NOT a publication page, grant report, project card,
// impact dashboard, or leaderboard. Protected (the (protected) layout enforces
// auth and get_contribution re-checks it). Keyed by the contribution UUID and
// named generically (/contributions/[contributionId]) -- Node-neutral. The
// title is generic. Server Component; bounded reads composed here.
//
// The reading spine is composed through <ReadingSpine>, the SAME primitive the
// Person and Institution pages use, so the three canonical pages share one
// continuous rhythm and a reader never feels they have crossed from one software
// module into another (Production Experience Phase I). The sections are not
// flattened: overview and context, the contributors, the institutional context,
// and the contextualising events each keep their own meaning.
//
// The contributors, institutional context, and related events ARE this
// contribution's documented connections. The M7 Knowledge Network is the
// invisible infrastructure behind those links (ADR-0017) -- there is no separate
// contribution-network page and no "enter the network" step; reading flows on
// through the connections.
export const metadata: Metadata = {
  title: pageTitle("Contribution"),
};

interface ContributionPageProps {
  params: Promise<{ contributionId: string }>;
}

export default async function ContributionPage({ params }: ContributionPageProps) {
  const { contributionId } = await params;
  const contribution = await getContribution(contributionId);

  if (!contribution) {
    notFound();
  }

  const timeline = await getContributionTimeline(contributionId);
  const hasRelatedEvents = timeline !== null && timeline.events.length > 0;

  const overview = narrativeFacet(contribution, "overview");
  const context = narrativeFacet(contribution, "context");
  const significance = narrativeFacet(contribution, "significance");
  const legacy = narrativeFacet(contribution, "legacy");

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <ContributionIdentityHeader contribution={contribution} />

        <Divider />

        <ReadingSpine>
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-sm font-medium text-foreground">
              {contributionCopy.overview.heading}
            </h2>
            {overview ? (
              <ContributionNarrative facet={overview} />
            ) : (
              <div className="mt-3">
                <EmptyState
                  title={contributionCopy.overview.absent.title}
                  description={contributionCopy.overview.absent.description}
                />
              </div>
            )}
            {context ? (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {NARRATIVE_FACET_LABELS.context}
                </h3>
                <ContributionNarrative facet={context} />
              </div>
            ) : null}
          </section>

          <ContributionContributors people={contribution.contributors.people} />

          <ContributionInstitutionalContext organizations={contribution.contributors.organizations} />

          {hasRelatedEvents ? <Timeline document={timeline} /> : null}

          <section aria-labelledby="significance-heading">
            <h2 id="significance-heading" className="text-sm font-medium text-foreground">
              {contributionCopy.significance.heading}
            </h2>
            {significance ? (
              <ContributionNarrative facet={significance} />
            ) : (
              <div className="mt-3">
                <EmptyState
                  title={contributionCopy.significance.absent.title}
                  description={contributionCopy.significance.absent.description}
                />
              </div>
            )}
          </section>

          <section aria-labelledby="legacy-heading">
            <h2 id="legacy-heading" className="text-sm font-medium text-foreground">
              {contributionCopy.legacy.heading}
            </h2>
            {legacy ? (
              <ContributionNarrative facet={legacy} />
            ) : (
              <div className="mt-3">
                <EmptyState
                  title={contributionCopy.legacy.absent.title}
                  description={contributionCopy.legacy.absent.description}
                />
              </div>
            )}
          </section>

          <ContributionReservedSection
            id="records"
            heading={contributionCopy.records.heading}
            title={contributionCopy.records.reserved.title}
            description={contributionCopy.records.reserved.description}
          />

          <ContributionReservedSection
            id="consequences"
            heading={contributionCopy.consequences.heading}
            title={contributionCopy.consequences.reserved.title}
            description={contributionCopy.consequences.reserved.description}
          />

          <p className="text-xs text-muted-foreground">{contributionCopy.withheldNote}</p>
        </ReadingSpine>
      </Container>
    </main>
  );
}
