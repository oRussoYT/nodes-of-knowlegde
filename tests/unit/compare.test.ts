import { describe, expect, it } from "vitest";

import { compareRows, sharedDestinations } from "../../src/features/observatory/compare";
import { parseObservatory } from "../../src/features/observatory/parse";

const a = parseObservatory({
  node: { slug: "a", name: "A", shortName: "A" },
  totals: { people: 10, firstYear: 1979, peopleWhoWentOn: 4 },
  byYear: [{ year: 1990, active: 3 }, { year: 1991, active: 5 }],
  institutionsReachedList: [{ id: "1", name: "INPA", people: 2 }, { id: "2", name: "STRI", people: 1 }],
})!;
const b = parseObservatory({
  node: { slug: "b", name: "B" },
  totals: { people: 0 },
  institutionsReachedList: [{ id: "1", name: "INPA", people: 1 }],
})!;

describe("comparing Nodes", () => {
  it("puts the same figures side by side", () => {
    const rows = compareRows(a, b);
    expect(rows.find((r) => r.label === "Documented since")).toEqual({ label: "Documented since", a: "1979", b: "—" });
    expect(rows.find((r) => r.label === "Went on to other institutions")).toEqual({ label: "Went on to other institutions", a: "4 (40%)", b: "0 (—)" });
    expect(rows.find((r) => r.label === "Year with most people active")?.a).toBe("1991 (5)");
  });

  it("finds where both histories meet", () => {
    expect(sharedDestinations(a, b)).toEqual(["INPA"]);
  });
});
