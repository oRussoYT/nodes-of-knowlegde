import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { biographyCopy } from "@/features/biography/copy";

// Dignified not-found for a biography that does not exist, or that was merged
// into another record. A calm, honest state -- never a bare 404 or an error
// tone (docs/application-information-architecture.md, "Empty, loading, error,
// and permission-denied states").
export default function BiographyNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader title="Scientific biography" />
        <div className="mt-6">
          <EmptyState title={biographyCopy.notFound.title} description={biographyCopy.notFound.description} />
        </div>
      </Container>
    </main>
  );
}
