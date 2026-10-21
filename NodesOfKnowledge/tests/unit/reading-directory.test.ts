import { describe, expect, it } from "vitest";

import { directoryCopy } from "../../src/features/directory/copy";
import { institutionStatusLabel, verificationBadge } from "../../src/features/directory/derive";
import {
  parseContributionsIndex,
  parseInstitutionsIndex,
  parsePeopleIndex,
} from "../../src/features/directory/parse";
import { navigationConfig } from "../../src/lib/navigation/config";

describe("directory parsers fail closed and drop malformed rows", () => {
  it("returns [] for a non-array", () => {
    expect(parsePeopleIndex(null)).toEqual([]);
    expect(parseInstitutionsIndex({})).toEqual([]);
    expect(parseContributionsIndex(undefined)).toEqual([]);
  });

  it("parses people rows and drops rows missing required fields", () => {
    const out = parsePeopleIndex([
      { id: "a", display_name: "Ada", verification_status: "verified_admin", is_deceased: true },
      { id: "b", display_name: "Bo", verification_status: "provisional", is_deceased: false },
      { display_name: "no id", verification_status: "provisional" },
      "nope",
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      id: "a",
      displayName: "Ada",
      verificationStatus: "verified_admin",
      isDeceased: true,
    });
  });

  it("parses institutions including nullable short_name/type label", () => {
    const out = parseInstitutionsIndex([
      {
        id: "o",
        name: "Inst",
        short_name: null,
        organization_type_label: null,
        status: "closed",
        verification_status: "provisional",
      },
    ]);
    expect(out[0]).toEqual({
      id: "o",
      name: "Inst",
      shortName: null,
      typeLabel: null,
      status: "closed",
      verificationStatus: "provisional",
    });
  });

  it("parses contributions", () => {
    const out = parseContributionsIndex([
      { id: "c", title: "T", contribution_kind_label: "Kind", verification_status: "disputed" },
    ]);
    expect(out[0]).toEqual({ id: "c", title: "T", kindLabel: "Kind", verificationStatus: "disputed" });
  });
});

describe("verification badge maps status to an honest label + tone", () => {
  it("covers the entity and person verification values", () => {
    expect(verificationBadge("verified_admin")).toEqual({ label: "Verified", tone: "success" });
    expect(verificationBadge("verified_self")).toEqual({ label: "Verified", tone: "success" });
    expect(verificationBadge("claim_pending")).toEqual({ label: "Claim pending", tone: "info" });
    expect(verificationBadge("disputed")).toEqual({ label: "Disputed", tone: "warning" });
    expect(verificationBadge("provisional")).toEqual({ label: "Provisional", tone: "neutral" });
  });

  it("never exposes a raw enum for an unknown status", () => {
    const badge = verificationBadge("something_unexpected");
    expect(badge.tone).toBe("neutral");
    expect(badge.label).toBe("Provisional");
  });

  it("maps institution lifecycle status to its label", () => {
    expect(institutionStatusLabel("closed")).toBe("Closed");
    expect(institutionStatusLabel("active")).toBe("Active");
    expect(institutionStatusLabel("weird")).toBe("weird");
  });
});

describe("directory copy is honest and Node-neutral", () => {
  it("has honest empty states and no engagement filler", () => {
    const all = JSON.stringify(directoryCopy).toLowerCase();
    for (const term of ["get started", "complete your", "sign up now", "don't miss"]) {
      expect(all).not.toContain(term);
    }
    expect(directoryCopy.people.empty.title.toLowerCase()).toContain("no people");
    expect(directoryCopy.institutions.empty.title.toLowerCase()).toContain("no institutions");
    expect(directoryCopy.contributions.empty.title.toLowerCase()).toContain("no contributions");
  });

  it("contains no single vertical's vocabulary", () => {
    const all = JSON.stringify(directoryCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "amazônica", "forest", "manaus", "mateiro"]) {
      expect(all).not.toContain(term);
    }
  });
});

describe("navigation exposes the reading experience", () => {
  it("has available People/Institutions/Contributions/Explore entries in the authenticated nav", () => {
    const byId = Object.fromEntries(navigationConfig.map((entry) => [entry.id, entry]));
    const expected: Array<[string, string]> = [
      ["explore", "/explore"],
      ["people", "/people"],
      ["institutions", "/institutions"],
      ["contributions", "/contributions"],
    ];
    for (const [id, href] of expected) {
      const entry = byId[id];
      expect(entry, `nav entry ${id}`).toBeDefined();
      expect(entry?.href).toBe(href);
      expect(entry?.availability.status).toBe("available");
      expect(entry?.groups).toContain("protected-primary");
    }
  });
});
