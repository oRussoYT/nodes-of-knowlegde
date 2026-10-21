import { EmptyState } from "@/components/ui/EmptyState";

// An honest reserved / deferred section (Institutional relationships, Scientific
// contributions, Historical records): a real heading plus a dignified honest
// state that explains what will appear and why it is not here yet -- never
// fabricated content, never decorative filler. Absence is information. Server
// Component.
export interface InstitutionReservedSectionProps {
  id: string;
  heading: string;
  title: string;
  description: string;
}

export function InstitutionReservedSection({ id, heading, title, description }: InstitutionReservedSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {heading}
      </h2>
      <div className="mt-3">
        <EmptyState title={title} description={description} />
      </div>
    </section>
  );
}
