import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { primaryName } from "@/features/biography/derive";
import { getPersonBiography } from "@/features/biography/read";
import { getPersonParticipation } from "@/features/participation/read";
import { getPersonCohorts } from "@/features/revelation/read";
import { TrajectoryChart } from "@/features/trajectory/components/TrajectoryChart";
import { YearExplorer } from "@/features/trajectory/components/YearExplorer";
import { trajectoryCopy } from "@/features/trajectory/copy";
import { buildPresenceRows, buildTrajectory } from "@/features/trajectory/derive";

// Screen 10 (docs/PRODUTO.md): "Your trajectory, in time and space" -- the
// CV as an interactive timeline. Built only from the existing read models
// (participation + documented cohorts); the same authorization boundary as the
// biography (each read fails closed to null). Title stays generic -- no
// personal name in <title>/history, like the biography page.
export const metadata: Metadata = {
  title: pageTitle(trajectoryCopy.pageTitle),
};

interface TrajectoryPageProps {
  params: Promise<{ personId: string }>;
}

export default async function TrajectoryPage({ params }: TrajectoryPageProps) {
  const { personId } = await params;
  const biography = await getPersonBiography(personId);

  if (!biography) {
    notFound();
  }

  const currentYear = new Date().getUTCFullYear();
  const participation = await getPersonParticipation(personId);
  const cohorts = await getPersonCohorts(personId);

  const view = buildTrajectory(participation, currentYear);
  const rows = buildPresenceRows(cohorts, currentYear);
  const firstSegment = view.lanes[0]?.segments[0];

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <Link href={`/people/${personId}`} className="text-sm text-muted-foreground underline underline-offset-2">
          ← {trajectoryCopy.backToBiography}
        </Link>

        <div className="mt-6">
          <PageHeader title={`${primaryName(biography)} — ${trajectoryCopy.heading}`} description={trajectoryCopy.description} />
        </div>

        <div className="mt-8">
          <TrajectoryChart view={view} />
        </div>

        {view.lanes.length > 0 ? (
          <>
            <Divider />
            <YearExplorer
              rows={rows}
              minYear={view.minYear}
              maxYear={Math.min(view.maxYear, currentYear)}
              initialYear={firstSegment ? firstSegment.startYear : view.minYear}
            />
          </>
        ) : null}
      </Container>
    </main>
  );
}
