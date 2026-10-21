import { describe, expect, it } from "vitest";

import { parseGraduateCsv, splitCsv } from "../../src/features/import/csv";
import { parseImportBatches, parseImportCandidates } from "../../src/features/import/parse";

describe("splitCsv", () => {
  it("honours quotes, doubled quotes and line breaks inside quotes", () => {
    expect(splitCsv('a,"b, c","say ""hi"""\n1,"two\nlines",3', ",")).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "two\nlines", "3"],
    ]);
  });
});

describe("parseGraduateCsv", () => {
  it("reads English headers with commas", () => {
    const result = parseGraduateCsv("Given Name,Family Name,Degree,Programme,Graduation Year,Student ID\nAna,Lima,PhD,Ecology,2018,123\n");
    expect(result.problems).toEqual([]);
    expect(result.rows).toEqual([
      { givenName: "Ana", familyName: "Lima", degree: "PhD", programme: "Ecology", graduationYear: "2018", externalRef: "123" },
    ]);
  });

  it("reads Portuguese headers with semicolons (pt-BR spreadsheets)", () => {
    const result = parseGraduateCsv("Nome;Sobrenome;Ano de conclusão\nJoão;Silva;2020\r\nMaria;Souza;2021");
    expect(result.problems).toEqual([]);
    expect(result.rows.map((r) => `${r.givenName} ${r.familyName} ${r.graduationYear}`)).toEqual([
      "João Silva 2020",
      "Maria Souza 2021",
    ]);
  });

  it("splits a single full-name column, including 'Family, Given'", () => {
    const result = parseGraduateCsv('name,year\nAna Maria Lima,2019\n"Souza, Bruno",2020');
    expect(result.rows).toEqual([
      { givenName: "Ana Maria", familyName: "Lima", graduationYear: "2019" },
      { givenName: "Bruno", familyName: "Souza", graduationYear: "2020" },
    ]);
  });

  it("treats a lone 'Nome' column as the full name", () => {
    expect(parseGraduateCsv("Nome;Ano\nAna Lima;2018").rows).toEqual([{ givenName: "Ana", familyName: "Lima", graduationYear: "2018" }]);
  });

  it("reports problems with the spreadsheet line number", () => {
    const result = parseGraduateCsv("given name,family name,year\nAna,,2018\nBia,Costa,20x9\nCaio,Reis,2017");
    expect(result.problems).toEqual([
      "Line 2: a given name and a family name are needed.",
      'Line 3: the year "20x9" is not a four-digit year.',
    ]);
    expect(result.rows).toHaveLength(1);
  });

  it("refuses a file without recognizable name columns", () => {
    expect(parseGraduateCsv("foo,bar\n1,2").problems[0]).toMatch(/must name the columns/);
  });

  it("refuses an empty file and a header with no people", () => {
    expect(parseGraduateCsv("").problems).toEqual(["The file is empty."]);
    expect(parseGraduateCsv("given name,family name\n").problems).toEqual(["The file has a header but no people."]);
  });

  it("ignores a byte-order mark and blank lines", () => {
    const result = parseGraduateCsv("﻿first name,last name\n\nAna,Lima\n\n");
    expect(result.rows).toEqual([{ givenName: "Ana", familyName: "Lima" }]);
  });
});

describe("import parsers", () => {
  it("parses candidates and drops malformed ones", () => {
    const doc = parseImportCandidates({
      batchId: "b1",
      organizationId: null,
      rows: [
        {
          id: "r2", rowNumber: 2, givenName: "Bia", familyName: "Costa", degree: null, programme: null, graduationYear: 2019, externalRef: null,
          candidates: [
            { personId: "p1", displayName: "Bia Costa", reason: "same_name", documentedAtInstitution: true, isDemo: false },
            { personId: "p2", displayName: "B. Costa", reason: "score_92" },
          ],
        },
        { id: "r1", rowNumber: 1, givenName: "Ana", familyName: "Lima", candidates: [] },
        { id: "bad" },
      ],
    });
    expect(doc?.rows.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(doc?.rows[1].candidates).toHaveLength(1);
    expect(doc?.rows[1].candidates[0].documentedAtInstitution).toBe(true);
  });

  it("fails closed on an unrecognizable document", () => {
    expect(parseImportCandidates(null)).toBeNull();
    expect(parseImportCandidates({ rows: [] })).toBeNull();
  });

  it("parses the batch list", () => {
    expect(
      parseImportBatches([
        { id: "b1", label: "PhD 2020", organization_id: null, organization_name: null, created_at: "2026-10-17T00:00:00Z", total: 4, pending: 1, matched: 1, created: 1, skipped: 1 },
        { id: "b2" },
      ]),
    ).toHaveLength(1);
  });
});
