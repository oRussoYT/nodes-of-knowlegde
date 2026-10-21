import { describe, expect, it } from "vitest";

import {
  describeContinuityOutcome,
  describeCoverageGap,
  describeCoverageSpan,
  describeDocumentedStatus,
  revelationCopy,
} from "../../src/features/revelation/copy";
import type { CoverageSpan, DocumentedStatus } from "../../src/features/revelation/types";

function span(startYear: number, endYear: number | null, isOpen: boolean): CoverageSpan {
  return { startYear, endYear, isOpen, participations: [] };
}

describe("describeCoverageSpan", () => {
  it("reads a closed multi-year span, a single-year span, and an open span honestly", () => {
    expect(describeCoverageSpan(span(1970, 1980, false))).toBe("Documented from 1970 to 1980.");
    expect(describeCoverageSpan(span(1975, 1975, false))).toBe("Documented in 1975.");
    expect(describeCoverageSpan(span(1990, null, true))).toBe(
      "Documented from 1990, open-ended in the latest record.",
    );
  });
});

describe("describeCoverageGap", () => {
  it("states a silence as a gap in the record, explicitly not an ending", () => {
    const s = describeCoverageGap({ fromYear: 1965, toYear: 1980 });
    expect(s).toContain("1965");
    expect(s).toContain("1980");
    expect(s.toLowerCase()).toContain("a gap in the record, not a documented ending");
  });
});

describe("describeContinuityOutcome", () => {
  it("reads an open latest span as still current, and a closed one as an undocumented outcome (never 'ended')", () => {
    expect(describeContinuityOutcome(true).toLowerCase()).toContain("still current");
    const closed = describeContinuityOutcome(false).toLowerCase();
    expect(closed).toContain("does not document what followed");
  });
});

describe("describeDocumentedStatus", () => {
  it("states a documented rupture from the explicit vocabulary, with the closure year when recorded", () => {
    expect(describeDocumentedStatus({ key: "closed", category: "ended" }, 1998)).toBe(
      "The record documents this institution as closed in 1998.",
    );
    expect(describeDocumentedStatus({ key: "merged", category: "ended" }, null)).toBe(
      "The record documents this institution as merged into another.",
    );
  });

  it("states active, dormant, and undetermined statuses plainly", () => {
    expect(describeDocumentedStatus({ key: "active", category: "active" }, null)).toBe(
      "The record documents this institution as active.",
    );
    expect(describeDocumentedStatus({ key: "dormant", category: "paused" }, null)).toBe(
      "The record documents this institution as dormant.",
    );
    expect(
      describeDocumentedStatus({ key: "status_unknown", category: "unknown" }, null).toLowerCase(),
    ).toContain("does not determine this institution's current status");
  });
});

describe("revelationCopy.organizationContinuity", () => {
  it("states it shows the documented coverage, distinguishes a gap from an ending, and does not date a practice from closure", () => {
    const c = revelationCopy.organizationContinuity;
    expect(c.limits.toLowerCase()).toContain("documented coverage, not the true one");
    expect(c.limits.toLowerCase()).toContain("silence in the record");
    expect(c.limits.toLowerCase()).toContain("not that the activity ended");
    expect(c.whatThisShows.toLowerCase()).toContain("not a documented ending");
  });

  it("contains no interpretation, metric, ranking, similarity, or resilience vocabulary", () => {
    const text = JSON.stringify([
      revelationCopy.organizationContinuity,
      describeCoverageGap({ fromYear: 1965, toYear: 1980 }),
      describeContinuityOutcome(true),
      describeContinuityOutcome(false),
      describeDocumentedStatus({ key: "closed", category: "ended" }, 1998),
    ]).toLowerCase();
    for (const term of [
      "school",
      "tradition",
      "influence",
      "transmission",
      "inherit",
      "persist",
      "surviv",
      "resilien",
      "legacy",
      "flourish",
      "thriv",
      "importance",
      "important",
      "central",
      "prestige",
      "similar",
      "recommend",
      "suggest",
      "ranking",
      "leaderboard",
      "popular",
      "top ",
      "trending",
      "most connected",
      "evolution",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(revelationCopy.organizationContinuity).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
