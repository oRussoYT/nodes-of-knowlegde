import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { decideLocationAction, findLocationsAction } from "@/features/map/actions";
import { getLocationProposals } from "@/features/map/read";

// Placing institutions on the map. ROR finds candidate locations; a steward
// accepts or rejects each one. Manual entry is on each institution's page.
export const metadata: Metadata = {
  title: pageTitle("Locations"),
};

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const proposals = await getLocationProposals();
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Place institutions on the map"
          description="Locations found in ROR are suggestions. Accept the right ones; to enter a location by hand, open the institution's page."
          action={
            <Link href="/map" className="text-sm underline underline-offset-2">
              Map
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {typeof raw.searched === "string" ? (
          <Alert tone="success" className="mt-6">
            Looked up {raw.searched} institutions; {typeof raw.found === "string" ? raw.found : "0"} locations found to review.
          </Alert>
        ) : null}

        <form action={findLocationsAction} className="mt-6">
          <Button type="submit">Find locations in ROR (15 at a time)</Button>
        </form>

        {proposals === null ? (
          <EmptyState className="mt-8" title="Only stewards place institutions" />
        ) : proposals.length === 0 ? (
          <EmptyState className="mt-8" title="Nothing to review" description="Use the button above to look up institutions that are not on the map yet." />
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {proposals.map((p) => (
              <li key={p.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                <p className="font-medium text-foreground">{p.organizationName}</p>
                <p className="mt-1 text-muted-foreground">
                  ROR match: {p.matchedName ?? "—"} · {p.city ?? "?"}, {p.countryCode ?? "?"} · {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}
                  {p.sourceUrl ? (
                    <>
                      {" · "}
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        source
                      </a>
                    </>
                  ) : null}
                </p>
                <form action={decideLocationAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="proposalId" value={p.id} />
                  <Button type="submit" name="decision" value="accept" size="sm">
                    Same institution — accept
                  </Button>
                  <Button type="submit" name="decision" value="reject" size="sm" emphasis="secondary">
                    Not this one
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
