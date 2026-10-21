import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pageTitle } from "@/config/site";
import { getPublicPerson } from "@/features/public-person/read";
import { formatTemporal } from "@/features/shared/temporal";
import { TrajectoryChart } from "@/features/trajectory/components/TrajectoryChart";
import { buildTrajectory } from "@/features/trajectory/derive";

// Public person page (docs/PRODUTO.md screen 01; ROTEIRO etapa 2). Readable
// without an account, but only for pages someone deliberately published
// (docs/privacy-model.md). Shows the narrow public projection: name, flags,
// and documented participations with their sources -- nothing else.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PublicPersonPageProps {
  params: Promise<{ personId: string }>;
}

export async function generateMetadata({ params }: PublicPersonPageProps): Promise<Metadata> {
  const { personId } = await params;
  const page = UUID.test(personId) ? await getPublicPerson(personId) : null;
  return { title: pageTitle(page ? page.person.displayName : "Person") };
}

export default async function PublicPersonPage({ params }: PublicPersonPageProps) {
  const { personId } = await params;
  if (!UUID.test(personId)) notFound();
  const page = await getPublicPerson(personId);
  if (!page) notFound();

  const { person, participation } = page;
  const trajectory = buildTrajectory(participation, new Date().getUTCFullYear());

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-16">
      <Container width="content">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Public record</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{person.displayName}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {person.isDeceased ? <Badge tone="neutral">In memoriam</Badge> : null}
          {person.isClaimed ? (
            <Badge tone="success">Confirmed by the person</Badge>
          ) : (
            <Badge tone="neutral">Not yet claimed by the person</Badge>
          )}
          {person.isDemo ? <Badge tone="warning">Demonstration record</Badge> : null}
        </div>

        <section aria-labelledby="trajectory-heading" className="mt-10">
          <h2 id="trajectory-heading" className="text-sm font-medium text-foreground">
            Trajectory in time
          </h2>
          <div className="mt-4">
            <TrajectoryChart view={trajectory} linkInstitutions={false} />
          </div>
        </section>

        {participation.participations.length > 0 ? (
          <section aria-labelledby="where-heading" className="mt-10">
            <h2 id="where-heading" className="text-sm font-medium text-foreground">
              Documented participation
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {participation.participations.map((p) => (
                <li key={p.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{p.organization.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {p.capacity.label} · {formatTemporal(p.temporal).label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!person.isClaimed ? (
          <div className="mt-12 rounded-md border border-border-default bg-surface px-4 py-4">
            <p className="text-sm text-foreground">Is this you?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an account and claim this record to confirm it, correct it, or make it private.
            </p>
            <Link href="/register" className={`${buttonVariants({ emphasis: "primary", size: "sm" })} mt-3`}>
              Claim this record
            </Link>
          </div>
        ) : null}
      </Container>
    </main>
  );
}
