import { describe, expect, it } from "vitest";

import { PLANS } from "../../src/config/plans";
import {
  capesToCsv,
  parseCapesRows,
  parsePlanRequestForm,
  parsePlanRequests,
  parseUniversityReport,
  rankingIndicators,
  share,
} from "../../src/features/university/parse";

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

describe("university report", () => {
  const report = parseUniversityReport({
    homeCountry: "BR",
    levels: [{ key: "doctorate", label: "Doctorate", labelPt: "Doutorado", isPostgraduate: true, graduates: 4, found: 2, academia: 1, abroad: 1, medianYearsToDestination: 3 }, { label: "no key" }],
    totals: { graduates: 10, found: 4, academia: 2, beyondAcademia: 2, abroad: 1, countries: 2, institutions: 3 },
    method: ["Counts only…", 5],
  })!;

  it("reads levels and totals, dropping malformed parts", () => {
    expect(report.levels).toHaveLength(1);
    expect(report.levels[0]!.business).toBe(0);
    expect(report.method).toEqual(["Counts only…"]);
  });

  it("states shares with their base", () => {
    expect(share(1, 4)).toBe("1 of 4 (25%)");
    expect(share(0, 0)).toBe("—");
  });

  it("describes the institution, with what each figure counts", () => {
    const ind = rankingIndicators(report);
    expect(ind[0]).toEqual({ label: "Graduates with a known destination", value: "4 of 10 (40%)", counts: expect.any(String) });
    expect(ind.find((i) => i.label === "Working outside BR")?.value).toBe("1 of 4 (25%)");
  });

  it("returns null for nothing", () => {
    expect(parseUniversityReport(null)).toBeNull();
  });
});

describe("CAPES export", () => {
  it("writes Portuguese headers, semicolons and guards formulas", () => {
    const rows = parseCapesRows([
      { display_name: "=Ada; Found", level_pt: "Doutorado", programme: "Ecologia", graduation_year: 2015, destination_category: "Setor empresarial", years_after: 3, is_demo: false },
      { level_pt: "x" },
    ]);
    expect(rows).toHaveLength(1);
    const csv = capesToCsv(rows);
    expect(csv.startsWith("﻿Nome;ORCID;Nível")).toBe(true);
    expect(csv).toContain(`"'=Ada; Found";;Doutorado;Ecologia;2015;Setor empresarial`);
    expect(csv).toContain(";não\r\n");
  });
});

describe("plans", () => {
  it("has a pro bono plan for conservation research and paid plans for the rest", () => {
    expect(PLANS.map((p) => p.key)).toEqual(["pro_bono", "university", "institution"]);
    expect(PLANS[0]!.price).toMatch(/free/i);
  });

  it("validates a plan request", () => {
    expect(parsePlanRequestForm(form({ institutionName: "Museu", institutionKind: "museum", contactName: "Rita" })).ok).toBe(true);
    expect(parsePlanRequestForm(form({ institutionName: "Museu", institutionKind: "zoo", contactName: "Rita" })).ok).toBe(false);
    expect(parsePlanRequestForm(form({ institutionName: "Museu", institutionKind: "museum", contactName: "R" })).ok).toBe(false);
    expect(parsePlanRequestForm(form({ institutionName: "Museu", institutionKind: "museum", contactName: "Rita", peopleEstimate: "many" })).ok).toBe(false);
  });

  it("reads requests", () => {
    const list = parsePlanRequests([{ id: "1", institutionName: "M", createdAt: "2026", plan: "weird", status: "approved" }, { id: "2" }]);
    expect(list).toEqual([expect.objectContaining({ plan: "institution", status: "approved" })]);
  });
});
