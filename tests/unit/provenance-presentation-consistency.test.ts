import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Production Experience Phase I — architectural consolidation (P5). The platform
// shares ONE provenance vocabulary (src/features/shared/provenance.ts) AND now
// ONE provenance PRESENTATION: the canonical ProvenanceAffordance. Every
// engine's *Provenance component is a thin adapter that supplies only its
// subject phrase and delegates all presentation to it, so "how do we know
// this?" is one coherent language platform-wide and drift is structurally
// impossible. This guard enforces exactly that: the presentation lives in one
// place, and no adapter grows its own competing affordance.

const CANONICAL = "src/features/shared/ProvenanceAffordance.tsx";

const ADAPTERS = [
  "src/features/timeline/components/EventProvenance.tsx",
  "src/features/participation/components/ParticipationProvenance.tsx",
  "src/features/relationships/components/RelationshipProvenance.tsx",
  "src/features/institution/components/InstitutionProvenance.tsx",
  "src/features/contribution/components/ContributionProvenance.tsx",
  "src/features/network/components/NetworkConnectionProvenance.tsx",
  "src/features/biography/components/ProvenanceDisclosure.tsx",
] as const;

// The one shared trigger presentation contract — calm, compact, keyboard-
// operable, identical everywhere because it exists in exactly one component.
const SHARED_TRIGGER_CLASS =
  "inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// Vitest runs from the repository root, so a repo-relative path resolved against
// process.cwd() is deterministic on every OS. (The previous
// `new URL(`../../${rel}`, import.meta.url)` form was mis-handled by Vite's
// asset-URL transform because its first argument is a dynamic template rather
// than a static literal, collapsing to `tests/unit/undefined` and throwing
// ENOENT before any production file was read.)
function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("provenance presentation is consolidated into one canonical component", () => {
  it("the canonical ProvenanceAffordance owns the whole presentation and keeps provenance out of hover-only tooltips", () => {
    const src = read(CANONICAL);
    // Single presentation source: the shared trigger class, a real focusable
    // control, and the client boundary all live here.
    expect(src).toContain(SHARED_TRIGGER_CLASS);
    expect(src).toContain('type="button"');
    expect(src).toContain('"use client"');
    // Full provenance in the server-rendered accessible name (never hover-only),
    // built from the shared vocabulary labels this component only presents.
    expect(src).toContain("Provenance of ${subject}:");
    expect(src).toContain("${sourceLabel}");
    expect(src).toContain("${statusLabel}");
    // The network "projected from" phrasing is preserved for both the accessible
    // name and the tooltip.
    expect(src).toContain("projectedFrom");
  });

  it("every engine's provenance component is a thin adapter that delegates to the canonical affordance and holds NO presentation of its own", () => {
    for (const rel of ADAPTERS) {
      const src = read(rel);
      // Delegates to the one canonical component.
      expect(src, rel).toContain("ProvenanceAffordance");
      expect(src, rel).toMatch(/<ProvenanceAffordance/);
      // Holds no competing presentation — no button, no tooltip wiring, no trigger
      // class. If any adapter regrows its own affordance, this fails (drift guard).
      expect(src, rel).not.toContain("<button");
      expect(src, rel).not.toContain("TooltipProvider");
      expect(src, rel).not.toContain("decoration-dotted");
    }
  });
});
