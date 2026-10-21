import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReadingSpine } from "@/components/ui/ReadingSpine";
import { pageTitle } from "@/config/site";
import { InstitutionContributions } from "@/features/contribution/components/InstitutionContributions";
import { getOrganizationContributions } from "@/features/contribution/read";
import { institutionCopy, NARRATIVE_FACET_LABELS } from "@/features/institution/copy";
import { InstitutionalNameHistory } from "@/features/institution/components/InstitutionalNameHistory";
import { InstitutionIdentityHeader } from "@/features/institution/components/InstitutionIdentityHeader";
import { InstitutionNarrative } from "@/features/institution/components/InstitutionNarrative";
import { InstitutionParticipation } from "@/features/institution/components/InstitutionParticipation";
import { InstitutionReservedSection } from "@/features/institution/components/InstitutionReservedSection";
import { narrativeFacet } from "@/features/institution/derive";
import { getOrganization, getOrganizationParticipation, getOrganizationTimeline } from "@/features/institution/read";
import { InstitutionLineage } from "@/features/network/components/InstitutionLineage";
import { getOrganizationNetwork } from "@/features/network/read";
import { OrganizationContinuity } from "@/features/revelation/components/OrganizationContinuity";
import { OrganizationGenerations } from "@/features/revelation/components/OrganizationGenerations";
import { OrganizationLineage } from "@/features/revelation/components/OrganizationLineage";
import { OrganizationRecurrence } from "@/features/revelation/components/OrganizationRecurrence";
import {
  getOrganizationContinuity,
  getOrganizationGenerations,
  getOrganizationLineage,
  getOrganizationRecurrence,
} from "@/features/revelation/read";
import { Timeline } from "@/features/timeline/components/Timeline";

// The Institution page -- a first-class historical reading experience for an
// institution as a HISTORICAL ACTOR (M6.5). Protected (authenticated authorized
// reading); the (protected) layout enforces auth and get_organization re-checks
// it. Keyed by the organization UUID and named generically
// (/institutions/[organizationId]) -- Node-neutral. Historical/closed/merged
// institutions are readable (never hidden). The title is generic. Server
// Component; the reads happen server-side and are composed here.
//
// The reading spine is composed through <ReadingSpine>, the SAME primitive the
// Person and Contribution pages use, so the three canonical pages share one
// continuous rhythm and a reader never feels they have crossed from one software
// module into another (Production Experience Phase I). The sections are not
// flattened: identity and name history, the timeline, the human participation,
// the institutional lineage, and the contributions each keep their own meaning.
//
// M7 refinement (ADR-0017): the Knowledge Network is invisible infrastructure
// that enriches this canonical reading, not a separate destination. The M6.5
// reserved "Relationships" slot is now a LIVE inline "Institutional
// relationships" section, projected from the canonical organization_relationships
// rows via get_organization_network -- the one genuinely new documented
// connection M7 adds to the reading experience. There is no "enter the network"
// link; reading simply flows on through the connections.
//
// M8 refinement (ADR-0018): the Revelation Engine reads INLINE here, never as a
// destination. M8.2 documented co-presence, M8.3 documented institutional
// descent, M8.4 documented continuity & rupture (per-capacity coverage over time
// + the institution's own recorded status), and M8.5 documented recurrence
// (same-kind events/contributions documented more than once), each a
// deterministic composition of already-preserved Assertions, decomposable back
// to them.
export const metadata: Metadata = {
  title: pageTitle("Institution"),
};

interface InstitutionPageProps {
  params: Promise<{ organizationId: string }>;
}

export default async function InstitutionPage({ params }: InstitutionPageProps) {
  const { organizationId } = await params;
  const organization = await getOrganization(organizationId);

  if (!organization) {
    notFound();
  }

  const timeline = await getOrganizationTimeline(organizationId);
  const participation = await getOrganizationParticipation(organizationId);
  const contributions = await getOrganizationContributions(organizationId);
  const network = await getOrganizationNetwork(organizationId);
  const generations = await getOrganizationGenerations(organizationId);
  const lineage = await getOrganizationLineage(organizationId);
  const continuity = await getOrganizationContinuity(organizationId);
  const recurrence = await getOrganizationRecurrence(organizationId);

  const introduction = narrativeFacet(organization, "introduction");
  const overview = narrativeFacet(organization, "overview");
  const significance = narrativeFacet(organization, "significance");
  const legacy = narrativeFacet(organization, "legacy");

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <InstitutionIdentityHeader organization={organization} />

        <Divider />

        <ReadingSpine>
          <section aria-labelledby="introduction-heading">
            <h2 id="introduction-heading" className="text-sm font-medium text-foreground">
              {institutionCopy.introduction.heading}
            </h2>
            {introduction ? (
              <InstitutionNarrative facet={introduction} />
            ) : (
              <div className="mt-3">
                <EmptyState
                  title={institutionCopy.introduction.absent.title}
                  description={institutionCopy.introduction.absent.description}
                />
              </div>
            )}
            {overview ? (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {NARRATIVE_FACET_LABELS.overview}
                </h3>
                <InstitutionNarrative facet={overview} />
              </div>
            ) : null}
          </section>

          {organization.names.length > 0 ? (
            <InstitutionalNameHistory names={organization.names} />
          ) : null}

          <Timeline document={timeline} />

          <InstitutionParticipation document={participation} />

          <InstitutionLineage document={network} />

          <InstitutionContributions document={contributions} />

          <OrganizationGenerations document={generations} />

          <OrganizationLineage document={lineage} />

          <OrganizationContinuity document={continuity} />

          <OrganizationRecurrence document={recurrence} />

          <InstitutionReservedSection
            id="records"
            heading={institutionCopy.records.heading}
            title={institutionCopy.records.reserved.title}
            description={institutionCopy.records.reserved.description}
          />

          {significance ? (
            <section aria-labelledby="significance-heading">
              <h2 id="significance-heading" className="text-sm font-medium text-foreground">
                {NARRATIVE_FACET_LABELS.significance}
              </h2>
              <InstitutionNarrative facet={significance} />
            </section>
          ) : null}

          <section aria-labelledby="legacy-heading">
            <h2 id="legacy-heading" className="text-sm font-medium text-foreground">
              {institutionCopy.legacy.heading}
            </h2>
            {legacy ? (
              <InstitutionNarrative facet={legacy} />
            ) : (
              <div className="mt-3">
                <EmptyState
                  title={institutionCopy.legacy.absent.title}
                  description={institutionCopy.legacy.absent.description}
                />
              </div>
            )}
          </section>

          <p className="text-xs text-muted-foreground">{institutionCopy.withheldNote}</p>
        </ReadingSpine>
      </Container>
    </main>
  );
}
