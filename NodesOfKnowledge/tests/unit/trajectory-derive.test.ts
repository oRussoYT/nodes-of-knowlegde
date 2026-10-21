import { describe, expect, it } from "vitest";

import { trajectoryCopy } from "../../src/features/trajectory/copy";
import {
  buildPersonOverview,
  buildPresenceRows,
  buildTrajectory,
  percentOf,
  presentInYear,
  toYearSpan,
} from "../../src/features/trajectory/derive";
import type { ProjectedNode } from "../../src/features/network/types";
import type { Participation, ParticipationDocument } from "../../src/features/participation/types";
import type { PersonCohortsDocument, PersonMentorshipLineageDocument } from "../../src/features/revelation/types";
import type { TemporalValue } from "../../src/features/shared/temporal";

const NOW = 2026;

function t(partial: Partial<TemporalValue>): TemporalValue {
  return {
    startDate: null,
    startPrecision: null,
    endDate: null,
    endPrecision: null,
    isApproximate: false,
    isOngoing: false,
    dateIsUnknown: false,
    dateIsUncertain: false,
    ...partial,
  };
}

const provenance: Participation["provenance"] = { sourceType: "admin_entered", verificationStatus: "provisional" };

function participation(id: string, orgId: string, orgName: string, temporal: TemporalValue): Participation {
  return {
    id,
    organization: { id: orgId, name: orgName, shortName: null },
    capacity: { key: "researcher", label: "Researcher" },
    summary: null,
    temporal,
    provenance,
  };
}

function node(id: string, label: string, type: ProjectedNode["type"] = "person"): ProjectedNode {
  return { type, id, label, secondaryLabel: null, href: `/people/${id}`, verificationStatus: null };
}

describe("toYearSpan", () => {
  it("keeps a bounded interval inclusive", () => {
    expect(toYearSpan(t({ startDate: "1987-01-01", startPrecision: "year", endDate: "1991-01-01", endPrecision: "year" }), NOW))
      .toMatchObject({ startYear: 1987, endYear: 1991, isOngoing: false });
  });

  it("runs an ongoing period to the present", () => {
    expect(toYearSpan(t({ startDate: "1992-01-01", startPrecision: "year", isOngoing: true }), NOW)).toMatchObject({
      startYear: 1992,
      endYear: NOW,
      isOngoing: true,
    });
  });

  it("never invents precision: a decade point covers the whole decade", () => {
    expect(toYearSpan(t({ startDate: "1980-01-01", startPrecision: "decade" }), NOW)).toMatchObject({
      startYear: 1980,
      endYear: 1989,
    });
  });

  it("keeps approximation and uncertainty as separate flags", () => {
    const span = toYearSpan(t({ startDate: "1990-01-01", startPrecision: "year", isApproximate: true }), NOW);
    expect(span).toMatchObject({ isApproximate: true, isUncertain: false });
  });

  it("returns null for an unknown date instead of guessing", () => {
    expect(toYearSpan(t({ dateIsUnknown: true }), NOW)).toBeNull();
    expect(toYearSpan(t({}), NOW)).toBeNull();
  });
});

describe("buildTrajectory", () => {
  const doc: ParticipationDocument = {
    personId: "p1",
    participations: [
      participation("a2", "beta", "Beta Institute", t({ startDate: "1992-01-01", startPrecision: "year", isOngoing: true })),
      participation("a1", "alpha", "Alpha Station", t({ startDate: "1987-01-01", startPrecision: "year", endDate: "1991-01-01", endPrecision: "year" })),
      participation("a3", "alpha", "Alpha Station", t({ startDate: "1995-01-01", startPrecision: "year" })),
      participation("a4", "gamma", "Gamma Lab", t({ dateIsUnknown: true })),
    ],
  };

  it("draws one lane per institution, in the order the life reached them", () => {
    const view = buildTrajectory(doc, NOW);
    expect(view.lanes.map((l) => l.organizationName)).toEqual(["Alpha Station", "Beta Institute"]);
    expect(view.lanes[0].segments.map((s) => s.participationId)).toEqual(["a1", "a3"]);
  });

  it("lists undated periods instead of placing them at a guessed point", () => {
    const view = buildTrajectory(doc, NOW);
    expect(view.undated.map((p) => p.id)).toEqual(["a4"]);
  });

  it("frames the axis on round years with decade ticks", () => {
    const view = buildTrajectory(doc, NOW);
    expect(view.minYear).toBe(1985);
    expect(view.maxYear).toBeGreaterThanOrEqual(NOW);
    expect(view.ticks[0]).toBe(1990);
    expect(percentOf(view.minYear, view)).toBe(0);
    expect(percentOf(view.maxYear, view)).toBe(100);
  });

  it("is empty only when nothing at all is documented", () => {
    expect(buildTrajectory(null, NOW).isEmpty).toBe(true);
    expect(buildTrajectory({ personId: "p", participations: [] }, NOW).isEmpty).toBe(true);
  });
});

describe("presence in a year", () => {
  const member = (id: string, label: string, start: string, end: string | null) => ({
    person: node(id, label),
    capacity: { key: "assistant", label: "Field assistant" },
    temporal: t({ startDate: start, startPrecision: "year", endDate: end, endPrecision: end ? "year" : null }),
    provenance,
    source: { type: "participations", id: `src-${id}` },
  });

  const cohorts: PersonCohortsDocument = {
    personId: "p1",
    cohorts: [
      {
        organization: node("alpha", "Alpha Station", "organization"),
        focalParticipations: [],
        members: [
          member("m2", "Zoe", "1988-01-01", "1990-01-01"),
          member("m1", "Ana", "1989-01-01", "1993-01-01"),
          member("m3", "Bruno", "2001-01-01", null),
        ],
      },
    ],
  };

  it("returns only people whose documented period covers the year, alphabetically", () => {
    const rows = buildPresenceRows(cohorts, NOW);
    const groups = presentInYear(rows, 1989);
    expect(groups).toHaveLength(1);
    expect(groups[0].people.map((p) => p.personLabel)).toEqual(["Ana", "Zoe"]);
  });

  it("returns nothing for a year with no documented overlap", () => {
    expect(presentInYear(buildPresenceRows(cohorts, NOW), 1995)).toEqual([]);
  });
});

describe("buildPersonOverview", () => {
  it("counts distinct documented neighbours, not steps", () => {
    const lineage = {
      personId: "p1",
      person: node("p1", "Focal"),
      upstream: [
        { depth: 1, from: node("s1", "Supervisor"), to: node("p1", "Focal") },
        { depth: 2, from: node("s0", "Grand"), to: node("s1", "Supervisor") },
      ],
      downstream: [
        { depth: 1, from: node("p1", "Focal"), to: node("d1", "Student A") },
        { depth: 1, from: node("p1", "Focal"), to: node("d1", "Student A") },
        { depth: 1, from: node("p1", "Focal"), to: node("d2", "Student B") },
      ],
    } as unknown as PersonMentorshipLineageDocument;

    const overview = buildPersonOverview(buildTrajectory(null, NOW), null, lineage);
    expect(overview.mentoredBy).toBe(1);
    expect(overview.mentored).toBe(2);
    expect(overview.institutions).toBe(0);
    expect(overview.firstYear).toBeNull();
  });
});

describe("trajectory copy", () => {
  it("contains no institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(trajectoryCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });

  it("never ranks", () => {
    const text = JSON.stringify(trajectoryCopy).toLowerCase();
    for (const term of ["best", "ranking:", "score:", "#1"]) {
      expect(text).not.toContain(term);
    }
  });
});
