import { describe, expect, it } from "vitest";

import { explainCandidate, nameKey, normalizeOpenAlexAuthor, proposeFromOpenAlex } from "../../src/features/external/openalex";
import { parseExternalBatch } from "../../src/features/external/parse";

const author = (over: Record<string, unknown> = {}) => ({
  id: "https://openalex.org/A1",
  display_name: "Lia Quennel",
  orcid: "https://orcid.org/0000-0001-0000-0001",
  works_count: 12,
  display_name_alternatives: ["L. Quennel", "Lía Quennel"],
  affiliations: [
    { institution: { display_name: "Alpha University", country_code: "BR" }, years: [2016, 2012] },
    { institution: { display_name: "Gamma Institute", country_code: "CA" }, years: [2019, 2023] },
  ],
  last_known_institutions: [{ display_name: "Gamma Institute", country_code: "CA" }],
  ...over,
});

describe("nameKey", () => {
  it("ignores case, accents, dots and spacing", () => {
    expect(nameKey("  José  M. Silva ")).toBe(nameKey("jose m silva"));
  });
});

describe("normalizeOpenAlexAuthor", () => {
  it("keeps what the steward needs, years sorted", () => {
    const n = normalizeOpenAlexAuthor(author());
    expect(n?.lastKnownInstitution).toBe("Gamma Institute");
    expect(n?.lastKnownCountry).toBe("CA");
    expect(n?.affiliations[0]).toEqual({ institution: "Alpha University", years: [2012, 2016] });
  });

  it("drops unusable records", () => {
    expect(normalizeOpenAlexAuthor({ display_name: "No id" })).toBeNull();
  });
});

describe("explainCandidate", () => {
  const row = { givenName: "Lia", familyName: "Quennel", graduationYear: 2016 };

  it("explains a strong match with every reason", () => {
    const n = normalizeOpenAlexAuthor(author())!;
    expect(explainCandidate(row, n, "Alpha University")).toEqual([
      "same_name",
      "affiliated_with_importing_institution",
      "affiliated_around_graduation",
    ]);
  });

  it("accepts an alternative name, accent-insensitively", () => {
    const n = normalizeOpenAlexAuthor(author({ display_name: "L. Q. Quennel", display_name_alternatives: ["Lía Quennel"] }))!;
    expect(explainCandidate(row, n, null)).toEqual(["alternative_name"]);
  });

  it("never proposes someone whose name does not match, whatever the affiliation", () => {
    const n = normalizeOpenAlexAuthor(author({ display_name: "Someone Else", display_name_alternatives: [] }))!;
    expect(explainCandidate(row, n, "Alpha University")).toEqual([]);
  });
});

describe("proposeFromOpenAlex", () => {
  it("orders by how much explains them, then alphabetically, at most five", () => {
    const response = {
      results: [
        author({ id: "https://openalex.org/A2", affiliations: [], last_known_institutions: [] }),
        author(),
        author({ id: "https://openalex.org/A3", display_name: "Unrelated Person", display_name_alternatives: [] }),
      ],
    };
    const proposals = proposeFromOpenAlex(response, { givenName: "Lia", familyName: "Quennel", graduationYear: 2016 }, "Alpha University");
    expect(proposals.map((p) => p.externalId)).toEqual(["https://openalex.org/A1", "https://openalex.org/A2"]);
  });

  it("returns nothing for an unrecognizable response", () => {
    expect(proposeFromOpenAlex(null, { givenName: "A", familyName: "B", graduationYear: null }, null)).toEqual([]);
  });
});

describe("parseExternalBatch", () => {
  it("parses rows and matches, dropping malformed ones", () => {
    const doc = parseExternalBatch({
      batchId: "b1",
      rows: [
        {
          id: "r1", rowNumber: 1, givenName: "Lia", familyName: "Quennel", graduationYear: 2016, status: "created", personId: "p1",
          matches: [
            { id: "m1", source: "openalex", externalId: "https://openalex.org/A1", displayName: "Lia Quennel", status: "proposed",
              affiliations: [{ institution: "Gamma Institute", years: [2019, 2023] }], reasons: ["same_name"] },
            { id: "m2", source: "scraper", externalId: "x", displayName: "x", status: "proposed" },
          ],
        },
        { id: "bad" },
      ],
    });
    expect(doc?.rows).toHaveLength(1);
    expect(doc?.rows[0].matches.map((m) => m.id)).toEqual(["m1"]);
  });

  it("fails closed", () => {
    expect(parseExternalBatch(null)).toBeNull();
  });
});
