import { describe, expect, it } from "vitest";

import { buildOrganizationGenerationsView } from "../../src/features/revelation/derive";
import type { GenerationAnchor, OrganizationGenerationsDocument } from "../../src/features/revelation/types";

function anchor(personId: string, label: string): GenerationAnchor {
  return {
    person: {
      type: "person",
      id: personId,
      label,
      secondaryLabel: null,
      href: `/people/${personId}`,
      verificationStatus: "provisional",
    },
    participations: [
      {
        id: `part-${personId}`,
        capacity: { key: "researcher", label: "Researcher" },
        temporal: {
          startDate: "1990-01-01",
          startPrecision: "year",
          endDate: null,
          endPrecision: null,
          isApproximate: false,
          isOngoing: true,
          dateIsUnknown: false,
          dateIsUncertain: false,
        },
        provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
      },
    ],
    coPresent: [
      {
        person: {
          type: "person",
          id: "other",
          label: "Other Person",
          secondaryLabel: null,
          href: "/people/other",
          verificationStatus: "provisional",
        },
        capacity: { key: "researcher", label: "Researcher" },
        temporal: {
          startDate: "1991-01-01",
          startPrecision: "year",
          endDate: null,
          endPrecision: null,
          isApproximate: false,
          isOngoing: true,
          dateIsUnknown: false,
          dateIsUncertain: false,
        },
        provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
        source: { type: "participations", id: "src-1" },
      },
    ],
  };
}

function doc(anchors: GenerationAnchor[]): OrganizationGenerationsDocument {
  return {
    organizationId: "o1",
    organization: {
      type: "organization",
      id: "o1",
      label: "Alpha Institute",
      secondaryLabel: null,
      href: "/institutions/o1",
      verificationStatus: "provisional",
    },
    anchors,
  };
}

describe("buildOrganizationGenerationsView", () => {
  it("treats a null document as an honest absence (never an error)", () => {
    const view = buildOrganizationGenerationsView(null);
    expect(view.isEmpty).toBe(true);
    expect(view.anchors).toEqual([]);
  });

  it("treats an empty anchors array as an honest absence", () => {
    const view = buildOrganizationGenerationsView(doc([]));
    expect(view.isEmpty).toBe(true);
  });

  it("preserves the read model's anchor order exactly (no re-ranking)", () => {
    const view = buildOrganizationGenerationsView(doc([anchor("a", "Ada"), anchor("b", "Bea")]));
    expect(view.isEmpty).toBe(false);
    expect(view.anchors.map((a) => a.person.id)).toEqual(["a", "b"]);
  });
});
