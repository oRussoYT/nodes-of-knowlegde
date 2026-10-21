import { redirect } from "next/navigation";

// M7 refinement (ADR-0017): a contribution's documented connections are read
// INLINE on its canonical page — the contributors (people), the institutional
// context (institutions), and the related events are already the contribution's
// network. There is no separate contribution-network page (it would only
// duplicate the canonical reading journey), so this former route redirects into
// the canonical contribution page.
interface ContributionNetworkRedirectProps {
  params: Promise<{ contributionId: string }>;
}

export default async function ContributionNetworkRedirect({ params }: ContributionNetworkRedirectProps) {
  const { contributionId } = await params;
  redirect(`/contributions/${contributionId}`);
}
