import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { isCurrentUserReviewer } from "@/features/review/authorization";

// Claim review stays with platform reviewers (ROTEIRO etapa 3): institution
// stewards reach the steward area, but deciding who an account belongs to is
// a platform decision. The database enforces the same rule.
export default async function ClaimsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isCurrentUserReviewer())) {
    return (
      <main id="main-content" tabIndex={-1} className="py-16">
        <Container width="content">
          <PageHeader title="Claim review" />
          <EmptyState
            className="mt-8"
            title="Claim review is done by platform reviewers"
            description="As an institution steward you can use the steward console and import lists for your institution."
          />
        </Container>
      </main>
    );
  }
  return <>{children}</>;
}
