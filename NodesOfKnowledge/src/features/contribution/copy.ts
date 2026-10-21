// Centralized, honest, Node-neutral copy for the Contribution surfaces.
//
// Calm, historical, evidence-aware language. No achievement, impact, ranking,
// productivity, "breakthrough", "successful intervention", "key player", or
// ownership language unsupported by evidence (unit-tested). No PDBFF-specific
// language. Uncertainty is never made to sound like failure; collective work is
// never made to sound individually owned. Absence is information: a contribution
// with little recorded history, or none attributed to an actor yet, stays
// dignified. Works unchanged for a research programme, a museum, a field
// station, an Indigenous organization, or a community association.

import type { ContributionNarrativeKind } from "./types";

export const NARRATIVE_FACET_LABELS: Record<ContributionNarrativeKind, string> = {
  overview: "Overview",
  context: "Historical context",
  significance: "Significance",
  legacy: "Legacy",
};

export const contributionCopy = {
  notFound: {
    title: "Contribution not available",
    description: "This record is not available. It may not exist.",
  },
  overview: {
    heading: "Overview",
    absent: {
      title: "No account recorded yet",
      description: "An account of this contribution has not yet been recorded.",
    },
  },
  contributors: {
    heading: "Contributors",
    // The collective / unnamed honest state: a contribution whose individual
    // authors cannot or should not be isolated is recorded as such -- never a
    // fabricated person.
    absent: {
      title: "Contributors are not individually recorded",
      description:
        "The people who contributed have not been individually recorded. Some contributions are collective, and their individual contributors cannot or should not be isolated.",
    },
  },
  institutionalContext: {
    heading: "Institutional context",
    absent: {
      title: "No institutional context is recorded",
      description: "No institution has been recorded as a contributor to this work.",
    },
  },
  significance: {
    heading: "Significance",
    absent: {
      title: "Historical significance has not yet been recorded",
      description:
        "Why this contribution mattered historically has not yet been recorded. Significance is documented from evidence, never derived from prominence.",
    },
  },
  legacy: {
    heading: "Legacy",
    absent: {
      title: "Legacy has not yet been recorded",
      description: "What this contribution left behind has not yet been recorded.",
    },
  },
  records: {
    heading: "Records",
    reserved: {
      title: "Records are not yet described",
      description:
        "Publications, reports, datasets, specimens, photographs, maps, and other records associated with this contribution will appear here as they are described, with their own custody and provenance — never ingested, and never treated as the contribution itself.",
    },
  },
  consequences: {
    heading: "Consequences",
    reserved: {
      title: "Consequences are not yet recorded",
      description:
        "Adoption, implementation, influence, and later interpretation are distinct from the contribution and will appear here only where evidence supports them — never asserted as a caused outcome.",
    },
  },
  // Person-page and Institution-page projections share this heading, matching
  // the "scientific contributions" category the Design Bible names.
  projection: {
    heading: "Scientific contributions",
    personEmpty: {
      title: "No contributions recorded yet",
      description:
        "What this person helped make possible has not yet been recorded. Contributions are documented from evidence, never inferred from participation or authorship.",
    },
    organizationEmpty: {
      title: "No contributions recorded yet",
      description:
        "What this institution helped make possible has not yet been recorded. Contributions are documented from evidence, never inferred from affiliation.",
    },
  },
  attributedAs: "Attributed as",
  withheldNote:
    "This account is assembled from provenance-bearing assertions. Each attribution carries its own evidence; absence, uncertainty, and disagreement are shown honestly, not hidden.",
} as const;
