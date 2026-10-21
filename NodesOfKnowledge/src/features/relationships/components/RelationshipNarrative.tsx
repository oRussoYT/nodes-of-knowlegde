// The curated relationship narrative: how the bond began, its context and
// meaning, how it changed, why it matters historically. Human-authored and
// stored as an assertion distinct from the factual record; never
// auto-generated, never AI, never fabricated from sparse facts. Rendered only
// when one exists (a missing narrative is honestly absent, handled by the
// entry). Server Component.
export function RelationshipNarrative({ narrative }: { narrative: string }) {
  return <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{narrative}</p>;
}
