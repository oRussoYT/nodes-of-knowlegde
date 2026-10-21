import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { ReadingSpine } from "@/components/ui/ReadingSpine";
import { pageTitle } from "@/config/site";
import { BiographyNarrative } from "@/features/biography/components/BiographyNarrative";
import { BiographySection } from "@/features/biography/components/BiographySection";
import { IdentityHeader } from "@/features/biography/components/IdentityHeader";
import { biographyCopy, RESERVED_SECTION_ORDER } from "@/features/biography/copy";
import { getPersonBiography } from "@/features/biography/read";
import { PersonContributions } from "@/features/contribution/components/PersonContributions";
import { getPersonContributions } from "@/features/contribution/read";
import { Participation } from "@/features/participation/components/Participation";
import { getPersonParticipation } from "@/features/participation/read";
import { Relationships } from "@/features/relationships/components/Relationships";
import { getPersonRelationships } from "@/features/relationships/read";
import { PersonCohorts } from "@/features/revelation/components/PersonCohorts";
import { PersonMentorshipLineage } from "@/features/revelation/components/PersonMentorshipLineage";
import { PersonPathway } from "@/features/revelation/components/PersonPathway";
import { PersonRecurrence } from "@/features/revelation/components/PersonRecurrence";
import {
  getPersonCohorts,
  getPersonMentorshipLineage,
  getPersonPathway,
  getPersonRecurrence,
} from "@/features/revelation/read";
import { Timeline } from "@/features/timeline/components/Timeline";
import { PublishControl } from "@/features/public-person/components/PublishControl";
import { getPublicPerson } from "@/features/public-person/read";
import { isCurrentUserSteward } from "@/features/review/authorization";
import { PersonOverviewBand } from "@/features/trajectory/components/PersonOverviewBand";
import { buildPersonOverview, buildTrajectory } from "@/features/trajectory/derive";
import { getPersonTimeline } from "@/features/timeline/read";

// The Scientific Biography read route -- the first production surface of the
// Digital Scientific Biography. Protected (authenticated authorized reading);
// the (protected) layout enforces auth and public.get_person_biography
// re-checks it. Keyed by the person-entity UUID and named generically
// (/people/[personId]) -- Node-neutral, no PDBFF-specific route. The title is
// intentionally generic (no personal name in <title>/history).
//
// Reading order (Blueprint's Biography Engine): identity band, a divider, then
// the reading spine -- the introductory narrative (or honest absence), the
// historical engines (timeline, participation, relationships, contributions),
// then the M8 REVELATIONS (documented cohorts, mentorship lineage, recurrence,
// and -- last -- the bounded pathway to a SELECTED target, read INLINE, a vantage
// that opens within the reading, not a destination), the reserved section
// architecture, and the honest withheld-note. The spine is composed through
// <ReadingSpine>, the SAME primitive the Institution and Contribution pages use,
// so the three canonical pages share one continuous rhythm and a reader never
// feels they have crossed from one software module into another (Production
// Experience Phase I). The sections are NOT flattened: each engine keeps its own
// narrative/chronology/belonging/assertion semantics. These engines ARE this
// person's documented connections (M7, invisible infrastructure); M8 composes
// several of them into the cohorts this person belonged to, the mentorship
// lineage they sit within, the phenomena documented to have recurred for them,
// and -- when a second entity is chosen (?pathwayTo) -- the documented chain of
// steps that links them, each decomposable back to its records. The pathway is
// governed by the endpoint rule: a chain is never presented as a connection
// between its ends. Server Component; reads composed server-side.
export const metadata: Metadata = {
  title: pageTitle("Scientific biography"),
};

interface BiographyPageProps {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BiographyPage({ params, searchParams }: BiographyPageProps) {
  const { personId } = await params;
  const { pathwayTo, publishError } = await searchParams;
  const document = await getPersonBiography(personId);

  if (!document) {
    notFound();
  }

  const timeline = await getPersonTimeline(personId);
  const participation = await getPersonParticipation(personId);
  const relationships = await getPersonRelationships(personId);
  const contributions = await getPersonContributions(personId);
  const cohorts = await getPersonCohorts(personId);
  const mentorshipLineage = await getPersonMentorshipLineage(personId);
  const recurrence = await getPersonRecurrence(personId);
  // The bounded pathway is read only when a target entity is selected
  // (?pathwayTo); otherwise the lens shows its calm "choose an entity" state.
  const targetId = typeof pathwayTo === "string" && pathwayTo.trim() !== "" ? pathwayTo : null;
  const pathway = targetId ? await getPersonPathway(personId, targetId) : null;
  // Screen 01 overview band (docs/PRODUTO.md): facts + compact trajectory,
  // derived from the reads above -- no extra query, nothing ranked.
  const trajectory = buildTrajectory(participation, new Date().getUTCFullYear());
  const overview = buildPersonOverview(trajectory, cohorts, mentorshipLineage);
  // Steward-only publish control (ROTEIRO etapa 2). Readers never see it.
  const isReviewer = await isCurrentUserSteward();
  const isPublic = isReviewer ? (await getPublicPerson(personId)) !== null : false;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <IdentityHeader document={document} />

        <PersonOverviewBand personId={personId} overview={overview} trajectory={trajectory} />

        {isReviewer ? (
          <PublishControl
            personId={personId}
            isPublic={isPublic}
            error={typeof publishError === "string" ? publishError : null}
          />
        ) : null}

        <Divider />

        <ReadingSpine>
          <section aria-label="Biographical narrative">
            <BiographyNarrative document={document} />
          </section>

          <Timeline document={timeline} />

          <Participation document={participation} />

          <Relationships document={relationships} />

          <PersonContributions document={contributions} />

          <PersonCohorts document={cohorts} />

          <PersonMentorshipLineage document={mentorshipLineage} />

          <PersonRecurrence document={recurrence} />

          <PersonPathway document={pathway} />

          <div className="flex flex-col gap-8">
            {RESERVED_SECTION_ORDER.map((key) => {
              const section = biographyCopy.reservedSections[key];
              return (
                <BiographySection key={key} id={key} title={section.title} description={section.description} />
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">{biographyCopy.withheldNote}</p>
        </ReadingSpine>
      </Container>
    </main>
  );
}
