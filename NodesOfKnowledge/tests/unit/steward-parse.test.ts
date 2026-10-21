import { describe, expect, it } from "vitest";

import {
  parseCorpusTimeline,
  parseDemoSummary,
  parseStewardAttention,
  parseStewardOverview,
  parseStewardScope,
} from "../../src/features/steward/parse";

const overview = {
  people: { total: 12, merged: 1, claimed: 3, deceased: 2, byVerification: { provisional: 10, verified_self: 2 }, bySource: { admin_entered: 12 } },
  organizations: { total: 4, byVerification: { provisional: 4 } },
  participations: { total: 20, undated: 3, approximate: 2, unconfirmed: 1, ongoing: 5 },
  relationships: { total: 6 },
  contributions: { total: 7 },
  claimsAwaitingReview: 2,
};

describe("parseStewardOverview", () => {
  it("parses a well-formed overview", () => {
    const parsed = parseStewardOverview(overview);
    expect(parsed?.people.total).toBe(12);
    expect(parsed?.people.byVerification).toEqual({ provisional: 10, verified_self: 2 });
    expect(parsed?.participations.undated).toBe(3);
    expect(parsed?.claimsAwaitingReview).toBe(2);
  });

  it("accepts bigint counts serialized as strings", () => {
    const parsed = parseStewardOverview({ ...overview, claimsAwaitingReview: "2" });
    expect(parsed?.claimsAwaitingReview).toBe(2);
  });

  it("fails closed on a missing family", () => {
    const broken: Record<string, unknown> = { ...overview };
    delete broken.relationships;
    expect(parseStewardOverview(broken)).toBeNull();
    expect(parseStewardOverview(null)).toBeNull();
    expect(parseStewardOverview([])).toBeNull();
  });
});

describe("parseStewardAttention", () => {
  const attention = {
    peopleWithoutParticipation: { total: 1, items: [{ id: "p1", displayName: "Ana" }, { id: 5 }] },
    undatedParticipations: {
      total: 1,
      items: [{ id: "x1", personId: "p2", personDisplayName: "Bia", organizationId: "o1", organizationName: "Alpha", capacity: "researcher" }],
    },
    possibleDuplicates: {
      total: 2,
      items: [
        { nameKey: "ana lima", people: [{ id: "p3", displayName: "Ana Lima" }, { id: "p4", displayName: "ana  lima" }] },
        { nameKey: "solo", people: [{ id: "p5", displayName: "Solo" }] },
      ],
    },
  };

  it("parses sections and drops malformed items", () => {
    const parsed = parseStewardAttention(attention);
    expect(parsed?.peopleWithoutParticipation.items).toEqual([{ id: "p1", displayName: "Ana" }]);
    expect(parsed?.undatedParticipations.items[0].organizationName).toBe("Alpha");
  });

  it("never shows a 'duplicate group' of one person", () => {
    const parsed = parseStewardAttention(attention);
    expect(parsed?.possibleDuplicates.items.map((g) => g.nameKey)).toEqual(["ana lima"]);
    expect(parsed?.possibleDuplicates.total).toBe(2);
  });

  it("fails closed when a section is missing", () => {
    expect(parseStewardAttention({ peopleWithoutParticipation: attention.peopleWithoutParticipation })).toBeNull();
  });
});

describe("parseCorpusTimeline", () => {
  it("parses rows and keeps them chronological", () => {
    expect(
      parseCorpusTimeline([
        { decade: 1990, participations_starting: 4, people_starting: 3 },
        { decade: 1980, participations_starting: "2", people_starting: "2" },
        { decade: "bad" },
      ]),
    ).toEqual([
      { decade: 1980, participationsStarting: 2, peopleStarting: 2 },
      { decade: 1990, participationsStarting: 4, peopleStarting: 3 },
    ]);
  });

  it("returns an empty list on an unrecognizable result", () => {
    expect(parseCorpusTimeline(null)).toEqual([]);
  });
});

describe("parseDemoSummary", () => {
  it("parses demo vs real counts", () => {
    const parsed = parseDemoSummary({
      people: { demo: 8, real: 0 },
      organizations: { demo: 3, real: 1 },
      contributions: { demo: 2, real: 0 },
      events: { demo: 5, real: 0 },
    });
    expect(parsed?.organizations).toEqual({ demo: 3, real: 1 });
  });

  it("fails closed on a partial document", () => {
    expect(parseDemoSummary({ people: { demo: 1, real: 0 } })).toBeNull();
  });
});

describe("parseStewardScope", () => {
  it("parses platform reach and institutions", () => {
    expect(
      parseStewardScope({ platform: false, organizations: [{ id: "o1", name: "Alpha University" }, { id: 2 }] }),
    ).toEqual({ platform: false, organizations: [{ id: "o1", name: "Alpha University" }] });
  });

  it("fails closed to no reach", () => {
    expect(parseStewardScope(null)).toEqual({ platform: false, organizations: [] });
    expect(parseStewardScope({ platform: "yes" }).platform).toBe(false);
  });
});
