import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { pageTitle } from "@/config/site";
import { NetworkView } from "@/features/network/components/NetworkView";
import { networkCopy } from "@/features/network/copy";
import { getOrganizationNetwork } from "@/features/network/read";

// An institution's one-hop Knowledge Network neighbourhood (M7), including its
// institutional lineage (the new organization_relationships canonical relation).
// Protected; the (protected) layout enforces auth and get_organization_network
// re-checks it. Keyed by the organization UUID, named generically (Node-neutral,
// no institution name in <title>/history). Historical/closed institutions are
// never hidden; a nonexistent institution 404s. Server Component.
export const metadata: Metadata = {
  title: pageTitle("Institution network"),
};

interface InstitutionNetworkPageProps {
  params: Promise<{ organizationId: string }>;
}

export default async function InstitutionNetworkPage({ params }: InstitutionNetworkPageProps) {
  const { organizationId } = await params;
  const document = await getOrganizationNetwork(organizationId);

  if (!document) {
    notFound();
  }

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <NetworkView
          document={document}
          whatThisShows={networkCopy.focal.organization.whatThisShows}
        />
      </Container>
    </main>
  );
}
