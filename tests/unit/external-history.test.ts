import { describe, expect, it } from "vitest";

import {
  MAX_WORKS,
  affiliationsFromAuthor,
  openAlexShortId,
  rorDetails,
  rorKey,
  worksFromResponse,
} from "@/features/external/history";

describe("public-source history parsing", () => {
  it("reads identifiers", () => {
    expect(openAlexShortId("https://openalex.org/A5023888391")).toBe("A5023888391");
    expect(openAlexShortId("a12")).toBe("A12");
    expect(openAlexShortId("https://example.org/x")).toBeNull();
    expect(rorKey("https://ror.org/01pxwe438")).toBe("01pxwe438");
    expect(rorKey("not-a-ror")).toBeNull();
  });

  it("reads affiliations with their years, dropping unusable ones", () => {
    const affs = affiliationsFromAuthor({
      affiliations: [
        {
          institution: { id: "https://openalex.org/I1", display_name: "McGill University", ror: "https://ror.org/01pxwe438", type: "education", country_code: "CA" },
          years: [2018, 2016, 2017, 2016],
        },
        { institution: { id: "https://openalex.org/I2", display_name: "No years" }, years: [] },
        { institution: { display_name: "No id" }, years: [2010] },
      ],
    });
    expect(affs).toEqual([
      { openalexId: "https://openalex.org/I1", name: "McGill University", ror: "01pxwe438", type: "education", country: "CA", years: [2016, 2017, 2018] },
    ]);
    expect(affiliationsFromAuthor(null)).toEqual([]);
  });

  it("reads works with title, year, type, venue and DOI", () => {
    const works = worksFromResponse({
      results: [
        {
          id: "https://openalex.org/W9",
          display_name: "Birds in fragments",
          publication_year: 2018,
          type: "dissertation",
          doi: "https://doi.org/10.1/x",
          primary_location: { source: { display_name: "eScholarship@McGill" } },
        },
        { id: "https://openalex.org/W10", display_name: "No DOI", doi: "10.1/bad" },
        { id: "W11", display_name: "Bad id" },
        { id: "https://openalex.org/W12" },
      ],
    });
    expect(works).toEqual([
      { openalexId: "https://openalex.org/W9", title: "Birds in fragments", year: 2018, type: "dissertation", venue: "eScholarship@McGill", doi: "https://doi.org/10.1/x" },
      { openalexId: "https://openalex.org/W10", title: "No DOI", year: null, type: null, venue: null, doi: null },
    ]);
    const many = { results: Array.from({ length: MAX_WORKS + 5 }, (_, i) => ({ id: `https://openalex.org/W${i}`, display_name: `T${i}` })) };
    expect(worksFromResponse(many)).toHaveLength(MAX_WORKS);
  });

  it("reads ROR status, founding year and other names", () => {
    expect(
      rorDetails({
        status: "inactive",
        established: 1979,
        names: [
          { value: "Old Institute", types: ["ror_display", "label"] },
          { value: "OI", types: ["acronym"] },
          { value: "Instituto Antigo", types: ["label"], lang: "pt" },
          { value: "The Old One", types: ["alias"] },
        ],
      }),
    ).toEqual({
      rorStatus: "inactive",
      established: 1979,
      names: [
        { name: "OI", kind: "acronym", language: null },
        { name: "Instituto Antigo", kind: "label", language: "pt" },
        { name: "The Old One", kind: "alias", language: null },
      ],
    });
    expect(rorDetails(null)).toEqual({});
  });
});
