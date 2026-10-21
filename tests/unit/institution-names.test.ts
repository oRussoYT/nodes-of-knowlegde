import { describe, expect, it } from "vitest";

import { describePeriod, parseCuratedNames, readNameForm } from "../../src/features/institution-names/parse";

describe("institution names", () => {
  it("parses rows and drops unknown kinds", () => {
    const names = parseCuratedNames([
      { id: "n1", name: "Old College", name_type: "former", language: "en", start_year: 1950, end_year: 1987, verification_status: "provisional" },
      { id: "n2", name: "Nick", name_type: "nickname" },
      null,
    ]);
    expect(names).toHaveLength(1);
    expect(names[0]?.verified).toBe(false);
    expect(parseCuratedNames(null)).toEqual([]);
  });

  it("describes periods in plain words", () => {
    expect(describePeriod(1950, 1987)).toBe("1950–1987");
    expect(describePeriod(1950, null)).toBe("from 1950");
    expect(describePeriod(null, 1987)).toBe("until 1987");
    expect(describePeriod(null, null)).toBe("");
  });

  it("validates the form", () => {
    const base = { name: "  INPA  ", nameType: "acronym", language: "", startYear: "", endYear: "" };
    expect(readNameForm(base)).toEqual({ ok: true, value: { name: "INPA", nameType: "acronym", language: null, startYear: null, endYear: null } });
    expect(readNameForm({ ...base, name: " " }).ok).toBe(false);
    expect(readNameForm({ ...base, nameType: "nickname" }).ok).toBe(false);
    expect(readNameForm({ ...base, startYear: "52" }).ok).toBe(false);
    expect(readNameForm({ ...base, startYear: "2000", endYear: "1990" }).ok).toBe(false);
  });
});
