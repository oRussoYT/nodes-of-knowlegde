import { describe, expect, it } from "vitest";

import { advisorSentence, parseAdvisors } from "../../src/features/advisors/parse";
import { parseCv, span, trajectoryPoints } from "../../src/features/cv/parse";
import { parseObservatoryMore } from "../../src/features/observatory/parse";

describe("record as a CV", () => {
  const cv = parseCv({
    id: "p",
    name: "Ana",
    periods: [
      { organizationId: "a", organization: "Camp", role: "Field assistant", startYear: 1990, endYear: 1992, latitude: -2.4, longitude: -59.9 },
      { organizationId: "b", organization: "INPA", role: "Researcher", startYear: 1993, ongoing: true, latitude: -3.1, longitude: -60 },
      { organizationId: "c", organization: "Nowhere", startYear: 1995 },
      { organizationId: "a", organization: "Camp", startYear: 2000, latitude: -2.4, longitude: -59.9 },
    ],
    works: [{ id: "w", title: "Edge effects", year: 1995 }, { title: "no id" }],
  })!;

  it("reads periods and works", () => {
    expect(cv.periods).toHaveLength(4);
    expect(cv.works).toHaveLength(1);
    expect(span(cv.periods[1]!)).toBe("1993–present");
    expect(span({ startYear: null, endYear: null, ongoing: false })).toBe("date unknown");
  });

  it("maps located places once each, and the moves between them", () => {
    const t = trajectoryPoints(cv.periods);
    expect(t.places.map((p) => [p.id, p.count])).toEqual([["a", 2], ["b", 1]]);
    expect(t.moves.map((m) => `${m.fromName}->${m.toName}`)).toEqual(["Camp->INPA", "INPA->Camp"]);
  });
});

describe("find an advisor", () => {
  it("states facts, never a score", () => {
    const [a] = parseAdvisors([{ personId: "m", name: "Rita", advisees: 3, years: [1998, 2010], adviseesWithLaterPeriods: 2, whereAdviseesWent: ["INPA"] }, { name: "x" }]);
    expect(advisorSentence(a!)).toBe("3 advisees documented, 1998–2010; 2 with later periods in the record.");
    expect(advisorSentence({ ...a!, advisees: 1, years: [2001, 2001], adviseesWithLaterPeriods: 0 })).toBe("1 advisee documented, 2001.");
  });
});

describe("observatory: time, themes, shape", () => {
  it("parses safely", () => {
    const m = parseObservatoryMore({ stayByDecade: [{ decade: 1980, periods: 4, medianYears: 3 }], themes: [{ label: "Birds", people: 2 }], bridges: [{ slug: "mamiraua", name: "Mamirauá", people: 1 }], mentorGenerations: 2 })!;
    expect(m.stayByDecade[0]!.medianYears).toBe(3);
    expect(m.bridges[0]!.slug).toBe("mamiraua");
    expect(m.bondsInside).toBe(0);
    expect(parseObservatoryMore(null)).toBeNull();
  });
});
