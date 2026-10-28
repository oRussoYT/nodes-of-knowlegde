import type { Metadata } from "next";
import Link from "next/link";
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
import { SubmitButton } from "@/components/ui/SubmitButton";
import { bringInPersonHistoryAction } from "@/features/external/history-actions";
import { getPersonTopics } from "@/features/connections/read";
import { HeritageList } from "@/features/heritage/components/HeritageList";
import { getHeritageFor } from "@/features/heritage/read";
import { ContactPanel } from "@/features/messages/components/ContactPanel";
import { getContactOptions } from "@/features/messages/read";
import { PublishControl } from "@/features/public-person/components/PublishControl";
import { RevelationHighlights } from "@/features/revelation/components/RevelationHighlights";
import { buildRevelationHighlights } from "@/features/revelation/highlights";
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
  const { pathwayTo, publishError, historyNotice, historyError, messageSent, messageError } = await searchParams;
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
  const highlights = buildRevelationHighlights(personId, cohorts, mentorshipLineage, recurrence);
  // Steward-only publish control (ROTEIRO etapa 2). Readers never see it.
  const isReviewer = await isCurrentUserSteward();
  const contactOptions = await getContactOptions(personId);
  const heritage = await getHeritageFor({ personId });
  const topics = (await getPersonTopics(personId)).filter((t) => t.status === "confirmed");
  const isPublic = isReviewer ? (await getPublicPerson(personId)) !== null : false;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <IdentityHeader document={document} />

        <RevelationHighlights highlights={highlights} personName={document.identity.displayName} />

        <PersonOverviewBand personId={personId} overview={overview} trajectory={trajectory} />

        <ContactPanel
          personId={personId}
          personName={document.identity.displayName}
          options={contactOptions}
          sent={messageSent === "1"}
          error={typeof messageError === "string" ? messageError : null}
        />

        <p className="mt-6 text-sm">
          <Link
            href={`/member/add?about=${personId}&name=${encodeURIComponent(document.identity.displayName)}`}
            className="underline underline-offset-2"
          >
            Know something about {document.identity.displayName}? Propose it, with its source
          </Link>
        </p>

        {topics.length > 0 ? (
          <section aria-labelledby="person-topics-heading" className="mt-8">
            <h2 id="person-topics-heading" className="text-sm font-medium text-foreground">
              Works on
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {topics.map((t) => (
                <li key={t.id} className="rounded-full border border-border-default px-3 py-1">
                  {t.label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {heritage.length > 0 ? (
          <section id="history" aria-labelledby="person-heritage-heading" className="mt-8">
            <h2 id="person-heritage-heading" className="text-sm font-medium text-foreground">
              In the history
            </h2>
            <div className="mt-3">
              <HeritageList items={heritage} showRole />
            </div>
          </section>
        ) : null}

        {isReviewer ? (
          <PublishControl
            personId={personId}
            isPublic={isPublic}
            error={typeof publishError === "string" ? publishError : null}
          />
        ) : null}

        {isReviewer ? (
          <section aria-labelledby="history-heading" className="mt-6 rounded-2xl border border-border-default bg-surface px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-prose">
                <h2 id="history-heading" className="text-sm font-semibold text-foreground">
                  Bring in their history
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  From OpenAlex and ROR: institutions over the years (closed or renamed ones too), theses, articles and
                  datasets. Everything enters as provisional, with its public link. Needs an accepted OpenAlex match.
                </p>
              </div>
              <form action={bringInPersonHistoryAction}>
                <input type="hidden" name="personId" value={personId} />
                <SubmitButton pendingLabel="Bringing in…">Bring in history</SubmitButton>
              </form>
            </div>
            {typeof historyNotice === "string" ? (
              <p role="status" className="mt-3 text-sm text-tone-success-fg">{historyNotice}</p>
            ) : null}
            {typeof historyError === "string" ? (
              <p role="alert" className="mt-3 text-sm text-tone-danger-fg">{historyError}</p>
            ) : null}
          </section>
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
