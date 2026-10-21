import { describe, expect, it } from "vitest";

import {
  describeContinuityOutcome,
  describeCoverageGap,
  describeCoverageSpan,
  describeDocumentedStatus,
  describeLineageStep,
  describeParticipationHere,
  describePathwayStepRelation,
  describePathwaySummary,
  describeRecurrenceGroup,
  revelationCopy,
  revelationSourceRecordLabel,
} from "../../src/features/revelation/copy";
import type {
  CoverageGap,
  CoverageSpan,
  DocumentedStatus,
  LineageStep,
  PathwayStep,
  PersonPathwayDocument,
  RecurrenceGroup,
} from "../../src/features/revelation/types";

// M8.7 CONSTITUTIONAL CLOSURE -- a SINGLE, TOTAL sweep of the WHOLE Revelation
// Engine's reader-facing surface.
//
// M8 reveals; it never interprets, ranks, scores, infers, or asserts a
// connection between endpoints. Each earlier milestone shipped its own, narrower
// banned-vocabulary check, so coverage was uneven (some operators were never
// swept for closeness/strength/significance/influence). This closure test is the
// single source of truth: it gathers EVERY static copy string in `revelationCopy`
// AND the output of EVERY deterministic `describe*` derivation (across every
// category, status, and direction they can render) into one corpus and asserts
// the whole corpus is free of the forbidden frames.
//
// Two lists, and the distinction matters. The copy legitimately NEGATES some
// words -- "not a connection between its ends", "never ranked", "never ordered or
// scored by length" -- so a bare ban on "connection"/"ranked"/"scored" would
// reject honest copy. So:
//   * FORBIDDEN_TOKENS are metric / similarity / prestige words that carry an
//     interpretive frame in ANY grammatical form; the engine has no honest reason
//     to even negate them, so they must never appear at all.
//   * FORBIDDEN_ASSERTIONS are the AFFIRMATIVE endpoint/ranking claims the engine
//     refuses ("is connected to", "most influential", "ranked by"); the copy may
//     (and does) negate the underlying idea, so only the affirmative construction
//     is banned.

const FORBIDDEN_TOKENS = [
  "closeness",
  "centrality",
  "similar", // similar, similarity, similarly
  "strength",
  "significance",
  "significant",
  "influence", // influence, influential, influenced
  "prestige",
  "prestigious",
  "prominence",
  "prominent",
  "popularity",
  "recommend", // recommend, recommended, recommendation
  "embedding",
  "probability",
];

const FORBIDDEN_ASSERTIONS = [
  "is connected to",
  "are connected",
  "was connected to",
  "were connected to",
  "most connected",
  "closely connected",
  "strongly connected",
  "is related to",
  "are related to",
  "most influential",
  "most important",
  "ranked by",
  "ranked above",
  "ranked higher",
  "scored higher",
  "more connected",
];

// ---- Build the whole reader-facing corpus (static copy + every derivation) ----

function node(label: string, href: string | null = null) {
  return {
    type: "person",
    id: "00000000-0000-4000-8000-000000000000",
    label,
    secondaryLabel: null,
    href,
    verificationStatus: null,
  };
}

function derivationOutputs(): string[] {
  const out: string[] = [];

  // M8.1/M8.2 -- documented participation "here".
  out.push(describeParticipationHere("A Person", { key: "director", label: "Director" }));
  out.push(describeParticipationHere("A Person", { key: "assistant", label: "Assistant" }));

  // Provenance record labels for every canonical source type + the fallback.
  for (const t of [
    "participations",
    "relationships",
    "organization_relationships",
    "events",
    "contributions",
    "person_contributions",
    "organization_contributions",
    "person_events",
    "organization_events",
    "contribution_events",
    "something_unknown",
  ]) {
    out.push(revelationSourceRecordLabel(t));
  }

  // M8.3 -- lineage step, across the directional role words the vocabulary uses.
  for (const role of ["Predecessor", "Successor", "Mentor", "Student", "Antecedent body"]) {
    out.push(
      describeLineageStep({
        from: node("Institution A"),
        to: node("Institution B"),
        kind: { key: "succession", label: "Succession", sourceRole: role },
      } as unknown as LineageStep),
    );
  }

  // M8.4 -- coverage spans (open / single-year / range), gap, and both outcomes.
  out.push(describeCoverageSpan({ startYear: 1980, endYear: null, isOpen: true } as unknown as CoverageSpan));
  out.push(describeCoverageSpan({ startYear: 1980, endYear: 1980, isOpen: false } as unknown as CoverageSpan));
  out.push(describeCoverageSpan({ startYear: 1980, endYear: 1990, isOpen: false } as unknown as CoverageSpan));
  out.push(describeCoverageGap({ fromYear: 1990, toYear: 1995 } as unknown as CoverageGap));
  out.push(describeContinuityOutcome(true));
  out.push(describeContinuityOutcome(false));

  // Institution's own recorded status, every key, with and without a closure year.
  for (const key of [
    "active",
    "historical",
    "dormant",
    "closed",
    "merged",
    "absorbed",
    "succeeded",
    "provisional",
    "unknown_default",
  ]) {
    const status = { key, category: "unknown" } as unknown as DocumentedStatus;
    out.push(describeDocumentedStatus(status, null));
    out.push(describeDocumentedStatus(status, 1994));
  }

  // M8.5 -- recurrence group heading, every category, with/without an anchor.
  for (const category of ["role", "event", "contribution"] as const) {
    out.push(
      describeRecurrenceGroup({
        category,
        label: "Director",
        anchor: category === "role" ? node("Institution A") : null,
        count: 3,
        occurrences: [],
      } as unknown as RecurrenceGroup),
    );
  }

  // M8.6 -- the endpoint-rule summary (resolved and unresolved target) and each
  // structural step category.
  out.push(
    describePathwaySummary({
      from: node("Ada"),
      to: node("Institution X"),
      stepCount: 3,
    } as unknown as PersonPathwayDocument),
  );
  out.push(
    describePathwaySummary({
      from: node("Ada"),
      to: null,
      stepCount: 2,
    } as unknown as PersonPathwayDocument),
  );
  for (const category of [
    "relationship",
    "institutional_relationship",
    "participation",
    "contribution",
    "event",
  ] as const) {
    out.push(
      describePathwayStepRelation({ category, label: "Mentorship" } as unknown as PathwayStep),
    );
  }

  return out;
}

const CORPUS = [JSON.stringify(revelationCopy), ...derivationOutputs()].join("\n");
const HAYSTACK = CORPUS.toLowerCase();

describe("M8.7 constitutional closure -- the whole engine's copy is swept once", () => {
  it("the corpus actually includes every operator's copy and derivations (guards against an empty sweep)", () => {
    // A few anchors from across M8.1->M8.6, so a future refactor that empties the
    // corpus can never make this suite vacuously pass.
    expect(HAYSTACK).toContain("documented cohort");
    expect(HAYSTACK).toContain("documented institutional descent");
    expect(HAYSTACK).toContain("documented continuity and rupture");
    expect(HAYSTACK).toContain("documented recurrence");
    expect(HAYSTACK).toContain("documented pathway");
    expect(HAYSTACK).toContain("participated here as");
    expect(HAYSTACK).toContain("is a documented");
    expect(HAYSTACK).toContain("documented 3 times");
    expect(HAYSTACK).toContain("chain of 3 steps connects");
  });

  for (const token of FORBIDDEN_TOKENS) {
    it(`never uses the interpretive word "${token}" anywhere in the engine's copy`, () => {
      expect(HAYSTACK.includes(token)).toBe(false);
    });
  }

  for (const phrase of FORBIDDEN_ASSERTIONS) {
    it(`never affirmatively asserts "${phrase}"`, () => {
      expect(HAYSTACK.includes(phrase)).toBe(false);
    });
  }

  it("honours the endpoint rule: a pathway is a chain that 'connects', never 'is connected'", () => {
    const summary = describePathwaySummary({
      from: node("Ada"),
      to: node("Institution X"),
      stepCount: 3,
    } as unknown as PersonPathwayDocument);
    expect(/chain of 3 steps connects/i.test(summary)).toBe(true);
    expect(summary.toLowerCase().includes("is connected")).toBe(false);
  });
});
