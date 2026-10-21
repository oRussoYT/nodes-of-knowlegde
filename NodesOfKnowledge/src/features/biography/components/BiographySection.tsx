// A reserved section location for a later capability (Timeline, Participation,
// Scientific Contributions, Relationships, Historical Records, Legacy). Renders
// an honest "will appear here as recorded" state -- deliberately a light
// heading + one sentence, never a fabricated module, a fake metric, or a
// decorative empty box. These are the extension points later M6 engines fill.
// Server Component.
export interface BiographySectionProps {
  id: string;
  title: string;
  description: string;
}

export function BiographySection({ id, title, description }: BiographySectionProps) {
  const headingId = `biography-section-${id}`;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
