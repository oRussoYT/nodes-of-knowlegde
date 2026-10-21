"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

// THE canonical provenance affordance for Nodes of Knowledge (Production
// Experience Phase I — architectural consolidation). Every engine reads
// provenance through THIS one presentation — the calm, keyboard-operable
// "Source" disclosure — so "how do we know this?" looks and behaves identically
// platform-wide and can never drift. It owns ALL presentation and interaction;
// each engine's *Provenance component is now a thin adapter that supplies only
// its engine-specific `subject` phrase (its copy) and delegates here.
//
// Constitutional behavior preserved EXACTLY (do not change — this is a
// presentation consolidation only, not a redesign):
//  - The FULL provenance is carried by the trigger's server-rendered accessible
//    name (aria-label) — deterministic, unique per subject, independent of the
//    visual tooltip portal. Provenance is never hover-only; assistive technology
//    gets it in full.
//  - A real, focusable <button type="button"> with a visible focus ring —
//    keyboard-operable, never a hover-only span.
//  - Vocabulary and semantics are unchanged: `sourceLabel` and `statusLabel`
//    come from the shared describeProvenance kernel (src/features/shared/
//    provenance.ts); this component only PRESENTS them, it never derives,
//    reshapes, or reinterprets provenance, and it touches no read model.
//  - `projectedFrom` (the Knowledge Network connection case) adds the
//    "projected from a <record>" phrasing to BOTH the accessible name and the
//    tooltip, exactly as the network affordance did before consolidation.
export interface ProvenanceAffordanceProps {
  /**
   * The engine-specific subject phrase. The accessible name reads
   * "Provenance of {subject}: ...", so callers pass e.g. "this event",
   * "this participation", "the relationship with Ada Lovelace",
   * "Ada Lovelace's participation", "the identity", or "the connection to X".
   */
  subject: string;
  sourceLabel: string;
  statusLabel: string;
  /**
   * Knowledge Network connections only: the canonical record the connection is
   * projected from (e.g. "institutional relationship"). Adds the "projected
   * from" phrasing to the accessible name and the tooltip; omitted everywhere
   * else, leaving the exact non-network presentation unchanged.
   */
  projectedFrom?: string;
}

export function ProvenanceAffordance({
  subject,
  sourceLabel,
  statusLabel,
  projectedFrom,
}: ProvenanceAffordanceProps) {
  const projectedPhrase = projectedFrom ? `projected from a ${projectedFrom}. ` : "";
  const accessibleName = `Provenance of ${subject}: ${projectedPhrase}${sourceLabel}. ${statusLabel}.`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={accessibleName}
            className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Source
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {projectedFrom ? (
            <span className="block text-muted-foreground">Projected from a {projectedFrom}</span>
          ) : null}
          <span className="block font-medium text-foreground">{sourceLabel}</span>
          <span className="block text-muted-foreground">{statusLabel}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
