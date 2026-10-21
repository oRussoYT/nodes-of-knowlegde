import { describe, expect, it } from "vitest";

import { formatMinutes, outcomesToCsv, parseOutcomeExport, parseOutcomes, readOutcomeParams } from "../../src/features/outcomes/parse";

const doc = {
  organizationId: "o1",
  filters: { programme: "Ecology", fromYear: 2015, toYear: null },
  totals: { graduates: 3, found: 1, probable: 1, needsPerson: 1, demo: 0 },
  timeSaved: { minutesPerPerson: 10, minutes: 10, minutesRemaining: 20, basis: "Benchmark … An estimate, not a measurement." },
  byYear: [{ year: 2015, graduates: 1, found: 1 }],
  byProgramme: [{ programme: "Ecology", graduates: 2, found: 1 }],
  byDegree: [{ degree: "PhD", graduates: 2, found: 1 }],
  bySector: [{ sector: "company", people: 1 }],
  byCountry: [{ country: "CA", people: 1 }],
  destinations: [{ institution: "Delta Labs", people: 1 }, { institution: "", people: 2 }],
  programmes: ["Botany", "Ecology"],
};

describe("parseOutcomes", () => {
  it("parses the panel", () => {
    const parsed = parseOutcomes(doc);
    expect(parsed?.totals.found).toBe(1);
    expect(parsed?.filters.programme).toBe("Ecology");
    expect(parsed?.destinations).toEqual([{ institution: "Delta Labs", people: 1 }]);
  });

  it("fails closed without totals", () => {
    expect(parseOutcomes({ ...doc, totals: {} })).toBeNull();
    expect(parseOutcomes(null)).toBeNull();
  });
});

describe("outcomesToCsv", () => {
  const rows = parseOutcomeExport([
    {
      person_id: "p1", display_name: "Ada, Found", graduation_year: 2015, programme: "Ecology", degree: "PhD", status: "found",
      destination_institution: 'Delta "Labs"', destination_type: "company", destination_country: "CA", destination_year: 2024,
      destination_source: "openalex", confirmed_at: "2026-10-17T00:00:00Z", orcid: "https://orcid.org/0000", is_demo: false,
    },
    { person_id: "p2", display_name: "=HYPERLINK(\"x\")", status: "needs_person", is_demo: true },
    { display_name: "no id" },
  ]);

  it("writes one line per graduate with provenance, quoting where needed", () => {
    const csv = outcomesToCsv(rows);
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Destination institution");
    expect(lines[1]).toContain('"Ada, Found"');
    expect(lines[1]).toContain('"Delta ""Labs"""');
    expect(lines[1]).toContain("openalex");
    expect(lines[1]).toContain("Found");
  });

  it("neutralises spreadsheet formulas", () => {
    const csv = outcomesToCsv(rows);
    expect(csv).not.toMatch(/\r\n=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK");
  });

  it("starts with a byte-order mark so spreadsheets read accents correctly", () => {
    expect(outcomesToCsv([]).startsWith("﻿")).toBe(true);
  });
});

describe("helpers", () => {
  it("formats minutes for people", () => {
    expect(formatMinutes(40)).toBe("40 min");
    expect(formatMinutes(90)).toBe("1.5 h");
    expect(formatMinutes(600)).toBe("10 h");
  });

  it("reads filters from the address and ignores junk", () => {
    const params = new URLSearchParams("org=not-a-uuid&from=20x5&to=2020&programme=%20Ecology%20");
    expect(readOutcomeParams((k) => params.get(k))).toEqual({
      org: null,
      filters: { programme: "Ecology", fromYear: undefined, toYear: 2020 },
    });
  });
});
