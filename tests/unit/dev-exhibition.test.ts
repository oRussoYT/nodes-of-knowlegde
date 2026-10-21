import { describe, expect, it } from "vitest";

import { isDevOnlyRouteBlocked } from "../../src/lib/dev-only-route";
import {
  EXHIBITION_ENGINES,
  EXHIBITION_IDS,
  exhibitionCopy,
  exhibitionJourneys,
  exhibitionSections,
} from "../../src/app/dev/exhibition/content";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANYWHERE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const allLinks = [
  ...exhibitionSections.flatMap((s) => s.links),
  ...exhibitionJourneys.flatMap((j) => j.steps),
];

describe("exhibition copy", () => {
  it("states explicitly that every record is fictional development-only data", () => {
    const notice = exhibitionCopy.fictionalNotice.toLowerCase();
    expect(notice).toContain("fictional");
    expect(notice).toContain("development");
    expect(exhibitionCopy.fictionalNotice).toContain("Development Exhibition");
    expect(notice).toContain("404");
  });

  it("frames itself as a developer inspection environment that does not duplicate the product", () => {
    const intro = exhibitionCopy.intro.toLowerCase();
    expect(intro).toContain("inspection");
    expect(intro).toContain("never duplicates");
    // Points readers at the production reading experience.
    expect(intro).toContain("explore");
    expect(exhibitionCopy.exploreHref).toBe("/explore");
  });

  it("gives reset instructions and the exact browser URL", () => {
    expect(exhibitionCopy.resetCommands).toContain("npm run supabase:reset");
    expect(exhibitionCopy.url).toBe("http://localhost:3000/dev/exhibition");
  });
});

describe("exhibition inspects; it never duplicates the production browse", () => {
  it("documents the six engines it draws deterministic examples from", () => {
    expect(EXHIBITION_ENGINES).toHaveLength(7);
  });

  it("is organized by concept/state to inspect, not as a generic entity browse", () => {
    const ids = exhibitionSections.map((s) => s.id);
    for (const id of [
      "showcase-records",
      "temporal-states",
      "projections",
      "relationship-states",
      "empty-disputed",
      "reviewer-auth",
    ]) {
      expect(ids).toContain(id);
    }
    // Rule: general browsing of People/Institutions/Contributions lives only
    // in production. The exhibition must not re-create those directories.
    for (const browse of ["people", "institutions", "contributions"]) {
      expect(ids).not.toContain(browse);
    }
  });

  it("keeps the grouping/structure copy free of any single vertical's vocabulary", () => {
    const structural = [
      ...exhibitionSections.map((s) => `${s.title} ${s.description ?? ""}`),
      ...exhibitionJourneys.map((j) => `${j.title} ${j.description}`),
    ]
      .join(" ")
      .toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "amazônica", "forest", "manaus", "mateiro"]) {
      expect(structural).not.toContain(term);
    }
  });
});

describe("exhibition links are stable, internal, and human-readable", () => {
  it("uses only deterministic UUIDs that look like the seed's", () => {
    const ids = [
      ...Object.values(EXHIBITION_IDS.people),
      ...Object.values(EXHIBITION_IDS.organizations),
      ...Object.values(EXHIBITION_IDS.contributions),
    ];
    expect(ids.length).toBe(5 + 3 + 3);
    for (const id of ids) expect(id).toMatch(UUID_RE);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every link at an internal route", () => {
    expect(allLinks.length).toBeGreaterThan(0);
    for (const link of allLinks) {
      expect(link.href.startsWith("/")).toBe(true);
    }
  });

  it("never exposes a raw UUID as a link label (human-readable labels only)", () => {
    for (const link of allLinks) {
      expect(link.label).not.toMatch(UUID_ANYWHERE);
    }
  });

  it("routes entity links to seeded person/institution/contribution ids", () => {
    const known = new Set<string>([
      ...Object.values(EXHIBITION_IDS.people),
      ...Object.values(EXHIBITION_IDS.organizations),
      ...Object.values(EXHIBITION_IDS.contributions),
    ]);
    for (const link of allLinks) {
      const id = link.href.match(/^\/(people|institutions|contributions)\/([0-9a-f-]+)$/i)?.[2];
      if (id) expect(known.has(id)).toBe(true);
    }
  });
});

describe("exhibition dev-only guard fails closed", () => {
  it("blocks the route unless NODE_ENV is exactly 'development'", () => {
    expect(isDevOnlyRouteBlocked("production")).toBe(true);
    expect(isDevOnlyRouteBlocked("test")).toBe(true);
    expect(isDevOnlyRouteBlocked(undefined)).toBe(true);
    expect(isDevOnlyRouteBlocked("")).toBe(true);
    expect(isDevOnlyRouteBlocked("development")).toBe(false);
  });
});
