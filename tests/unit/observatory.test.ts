import { describe, expect, it } from "vitest";

import { busiestYear, parseObservatory, yearBars } from "../../src/features/observatory/parse";

describe("observatory", () => {
  it("parses aggregates and drops malformed rows", () => {
    const o = parseObservatory({
      node: { slug: "pdbff", name: "BDFFP", shortName: "PDBFF" },
      totals: { people: 3, firstYear: 1979 },
      byYear: [{ year: 1979, active: 1, arrived: 1 }, { active: 2 }],
      diffusionByCountry: [{ countryCode: "CA", people: 1 }, { people: 2 }],
      method: ["a", 1],
    })!;
    expect(o.totals.people).toBe(3);
    expect(o.totals.works).toBe(0);
    expect(o.byYear).toHaveLength(1);
    expect(o.diffusionByCountry).toEqual([{ countryCode: "CA", people: 1 }]);
    expect(o.method).toEqual(["a"]);
    expect(parseObservatory({ node: {} })).toBeNull();
  });

  it("draws bars to scale", () => {
    const b = yearBars([{ year: 1, value: 2 }, { year: 2, value: 4 }], 100, 50);
    expect(b[1]).toMatchObject({ x: 50, y: 0, h: 50 });
    expect(b[0]).toMatchObject({ y: 25, h: 25 });
    expect(yearBars([], 100, 50)).toEqual([]);
  });

  it("finds the busiest year, first when tied", () => {
    expect(busiestYear([{ year: 1990, active: 2 }, { year: 1991, active: 5 }, { year: 1992, active: 5 }])).toEqual({ year: 1991, active: 5 });
    expect(busiestYear([{ year: 1990, active: 0 }])).toBeNull();
  });
});
