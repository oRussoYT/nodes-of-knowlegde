import { describe, expect, it } from "vitest";

import { buildOrganizationContinuityView } from "../../src/features/revelation/derive";
import type {
  CoverageSpan,
  OrganizationContinuityDocument,
  Practice,
  StatusCategory,
} from "../../src/features/revelation/types";

// Pure derivation tests for M8.4. The read model has already composed the
// coverage; derive only reads the honest states from the structure: continuation
// (latest span open), a status signal (terminal/dormant/historical or a closure),
// and honest emptiness. It fabricates nothing and fills nothing.

function span(startYear: number, endYear: number | null, isOpen: boolean): CoverageSpan {
  return {
    startYear,
    endYear,
    isOpen,
    participations: [
      {
        person: {
          type: "person",
          id: "p1",
          label: "Ana",
          secondaryLabel: null,
          href: "/people/p1",
          verificationStatus: "provisional",
        },
        temporal: {
          startDate: `${startYear}-01-01`,
          startPrecision: "year",
          endDate: endYear === null ? null : `${endYear}-12-31`,
          endPrecision: endYear === null ? null : "year",
          isApproximate: false,
          isOngoing: isOpen,
          dateIsUnknown: false,
          dateIsUncertain: false,
        },
        provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
        source: { type: "participations", id: "pa1" },
      },
    ],
  };
}

function practice(key: string, spans: CoverageSpan[]): Practice {
  return { capacity: { key, label: key }, spans, gaps: [] };
}

function doc(
  category: StatusCategory,
  key: string,
  closure: OrganizationContinuityDocument["closure"],
  practices: Practice[],
): OrganizationContinuityDocument {
  return {
    organizationId: "org1",
    organization: {
      type: "organization",
      id: "org1",
      label: "Focal",
      secondaryLabel: null,
      href: "/institutions/org1",
      verificationStatus: "provisional",
    },
    status: { key, category },
    closure,
    practices,
  };
}

describe("buildOrganizationContinuityView", () => {
  it("reads a null document as an honest, non-signalling absence", () => {
    const v = buildOrganizationContinuityView(null);
    expect(v.isEmpty).toBe(true);
    expect(v.hasStatusSignal).toBe(false);
    expect(v.practices.length).toBe(0);
    expect(v.closureYear).toBeNull();
  });

  it("treats an all-default active institution with no coverage as an honest absence", () => {
    const v = buildOrganizationContinuityView(doc("active", "active", null, []));
    expect(v.isEmpty).toBe(true);
    expect(v.hasStatusSignal).toBe(false);
  });

  it("is NOT empty when a terminal status speaks, even with no coverage (the record speaks to continuity)", () => {
    const v = buildOrganizationContinuityView(
      doc("ended", "closed", { date: "1998-06-01", precision: "month" }, []),
    );
    expect(v.isEmpty).toBe(false);
    expect(v.hasStatusSignal).toBe(true);
    expect(v.closureYear).toBe(1998);
  });

  it("treats a recorded closure as a status signal even when the category is not terminal", () => {
    const v = buildOrganizationContinuityView(
      doc("active", "active", { date: "2001-01-01", precision: "year" }, []),
    );
    expect(v.hasStatusSignal).toBe(true);
    expect(v.closureYear).toBe(2001);
  });

  it("reads continuation only from an open LATEST span; a closed latest span is an unknown outcome", () => {
    const open = buildOrganizationContinuityView(
      doc("active", "active", null, [practice("technician", [span(1990, null, true)])]),
    );
    expect(open.isEmpty).toBe(false);
    expect(open.practices[0].latestIsOpen).toBe(true);

    const closed = buildOrganizationContinuityView(
      doc("active", "active", null, [
        practice("director", [span(1960, 1965, false), span(1980, 1985, false)]),
      ]),
    );
    expect(closed.practices[0].latestIsOpen).toBe(false);
  });
});
