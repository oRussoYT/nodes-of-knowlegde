import type { Metadata } from "next";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { isCurrentUserSteward } from "@/features/review/authorization";

export const metadata: Metadata = {
  title: pageTitle("Claim review"),
};

// Nested layout, not a new top-level route group: everything under
// /review still uses the same AppShell/ProtectedHeader the parent
// (protected) layout already applies. Per ADR-0006, a *shell* variant
// needs its own route group -- this isn't a new shell, it's an
// additional access gate layered on the existing authenticated shell.
// The parent layout (src/app/(protected)/layout.tsx) already verified a
// session exists; this layout adds the one thing specific to everything
// under /review: reviewer authorization, checked live via
// am_i_a_reviewer() (supabase/migrations/20260802130000_add_claim_review_governance.sql)
// -- itself only a UI-visibility signal; the actual enforcement lives in
// every review/decision database function, independently.
//
// Deliberately does not redirect on denial. Per the milestone's
// "unauthorized access must return the appropriate protected outcome
// without disclosing whether a claim exists" requirement, an
// authenticated-but-not-a-reviewer visitor sees a calm, generic
// permission-denied page in place of the reviewer content -- matching
// docs/application-information-architecture.md's documented
// "Permission-denied" state pattern -- never a bare 403, and never a
// silent redirect that could read as "this route doesn't exist."
export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  const isReviewer = await isCurrentUserSteward();

  if (!isReviewer) {
    return (
      <main id="main-content" tabIndex={-1} className="py-16">
        <Container width="content">
          <PageHeader title="Claim review" />
          <EmptyState
            className="mt-8"
            title="You don't have access to the reviewer area"
            description="This section is limited to authorized reviewers."
          />
        </Container>
      </main>
    );
  }

  return <>{children}</>;
}
