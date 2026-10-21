import { redirect } from "next/navigation";

// M7 refinement (ADR-0017): a person's documented connections are read INLINE
// on their canonical biography — the timeline (events), participation
// (institutions), relationships (people), and contributions are already the
// person's network. There is no separate person-network page (it would only
// duplicate the canonical reading journey), so this former route redirects into
// the canonical biography.
interface PersonNetworkRedirectProps {
  params: Promise<{ personId: string }>;
}

export default async function PersonNetworkRedirect({ params }: PersonNetworkRedirectProps) {
  const { personId } = await params;
  redirect(`/people/${personId}`);
}
