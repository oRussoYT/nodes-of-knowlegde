import { describe, expect, it } from "vitest";

import {
  buildOrganizationLineageView,
  buildPersonMentorshipLineageView,
} from "../../src/features/revelation/derive";
import type { LineageStep } from "../../src/features/revelation/types";

function step(id: string, direction: "upstream" | "downstream"): LineageStep {
  return {
    source: { type: "organization_relationships", id },
    kind: { key: "succession", label: "Succession", sourceRole: "Predecessor" },
    from: {
      type: "organization",
      id: `${id}-from`,
      label: "From Org",
      secondaryLabel: null,
      href: `/institutions/${id}-from`,
      verificationStatus: "provisional",
    },
    to: {
      type: "organization",
      id: `${id}-to`,
      label: "To Org",
      secondaryLabel: null,
      href: `/institutions/${id}-to`,
      verificationStatus: "provisional",
    },
    temporal: {
      startDate: "1970-01-01",
      startPrecision: "year",
      endDate: null,
      endPrecision: null,
      isApproximate: false,
      isOngoing: false,
      dateIsUnknown: false,
      dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    direction,
    depth: 1,
  };
}

describe("buildOrganizationLineageView / buildPersonMentorshipLineageView", () => {
  it("treats a null document as an honest absence", () => {
    const view = buildOrganizationLineageView(null);
    expect(view.isEmpty).toBe(true);
    expect(view.upstream).toEqual([]);
    expect(view.downstream).toEqual([]);
  });

  it("treats both-directions-empty as an honest absence", () => {
    const view = buildOrganizationLineageView({
      organizationId: "o1",
      organization: step("x", "upstream").from,
      upstream: [],
      downstream: [],
    });
    expect(view.isEmpty).toBe(true);
  });

  it("preserves the read model's step order and both directions when non-empty", () => {
    const view = buildOrganizationLineageView({
      organizationId: "o1",
      organization: step("x", "upstream").from,
      upstream: [step("a", "upstream")],
      downstream: [step("b", "downstream")],
    });
    expect(view.isEmpty).toBe(false);
    expect(view.upstream.map((s) => s.source.id)).toEqual(["a"]);
    expect(view.downstream.map((s) => s.source.id)).toEqual(["b"]);
  });

  it("is non-empty when only one direction has steps", () => {
    const view = buildPersonMentorshipLineageView({
      personId: "p1",
      person: step("x", "upstream").from,
      upstream: [],
      downstream: [step("d", "downstream")],
    });
    expect(view.isEmpty).toBe(false);
    expect(view.downstream.length).toBe(1);
  });
});
