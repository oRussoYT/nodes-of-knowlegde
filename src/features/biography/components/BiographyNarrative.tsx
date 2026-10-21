import { EmptyState } from "@/components/ui/EmptyState";

import { biographyCopy } from "../copy";
import { describeProvenance, deriveNarrativeState } from "../derive";
import type { BiographyDocument } from "../types";
import { ProvenanceDisclosure } from "./ProvenanceDisclosure";

// The first narrative surface. Renders curated narrative when present, or an
// honest, dignified absence state otherwise -- never generated prose, never
// AI, never marketing filler (Design Bible, "Not a profile" / "Honesty as
// design material"). Narrative is treated separately from the factual record
// and carries its own provenance. Server Component.
export function BiographyNarrative({ document }: { document: BiographyDocument }) {
  const state = deriveNarrativeState(document);

  if (state.kind !== "curated" || state.body === undefined) {
    return (
      <EmptyState title={biographyCopy.narrativeAbsent.title} description={biographyCopy.narrativeAbsent.description} />
    );
  }

  const paragraphs = state.body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const narrativeProvenance = document.narrative
    ? describeProvenance(document.narrative.sourceType, document.narrative.verificationStatus)
    : null;

  return (
    <div>
      <div className="max-w-prose text-base leading-relaxed text-foreground">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={index === 0 ? undefined : "mt-4"}>
            {paragraph}
          </p>
        ))}
      </div>
      {narrativeProvenance ? (
        <div className="mt-3">
          <ProvenanceDisclosure
            subject="narrative"
            sourceLabel={narrativeProvenance.sourceLabel}
            statusLabel={narrativeProvenance.statusLabel}
          />
        </div>
      ) : null}
    </div>
  );
}
