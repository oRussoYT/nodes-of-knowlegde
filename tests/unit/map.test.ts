import { describe, expect, it } from "vitest";

import { COUNTRY_POINTS } from "../../src/features/map/countries";
import { arcPath, parseMap, parseMovements, project, radius, viewBoxFor, yearSentence } from "../../src/features/map/parse";
import { bestRorMatch, rorLocation } from "../../src/features/map/ror";

describe("map", () => {
  it("projects like the basemap", () => {
    expect(project(-180, 90)).toEqual([0, 0]);
    const [x, y] = project(-59.9, -2.4);
    expect(x).toBeCloseTo(120.1, 6);
    expect(y).toBeCloseTo(92.4, 6);
  });

  it("frames the points at 2:1 and never beyond the world", () => {
    const vb = viewBoxFor([[-59.9, -2.4], [-60.1, -2.5]]);
    expect(vb.w).toBeCloseTo(vb.h * 2, 5);
    expect(vb.w).toBeGreaterThanOrEqual(8);
    expect(viewBoxFor([])).toEqual({ x: 0, y: 0, w: 360, h: 180 });
    expect(viewBoxFor([[-170, 80], [170, -80]])).toEqual({ x: 0, y: 0, w: 360, h: 180 });
  });

  it("sizes dots by the square root of the count and draws arcs", () => {
    expect(radius(4, 160)).toBe(3);
    expect(radius(0, 160)).toBe(1);
    expect(arcPath([-60, -2], [-73.6, 45.5])).toMatch(/^M120 92 Q[\d.]+ [\d.]+ 106.4 44.5$/);
  });

  it("reads places and movements, and says the year plainly", () => {
    const doc = parseMap({
      year: 1994,
      places: [
        { id: "a", name: "Camp 41", latitude: -2.4, longitude: -59.9, people: 37 },
        { id: "b", name: "Lab", latitude: 1, longitude: 1, people: 0 },
        { id: "c", name: "Nowhere" },
      ],
      years: { min: 1979, max: 2024 },
    });
    expect(doc.places).toHaveLength(2);
    expect(yearSentence(doc)).toBe("In 1994, 37 people were at 1 place in the record.");
    expect(parseMovements([{ fromId: "a", toId: "b", fromLatitude: 1, fromLongitude: 2, toLatitude: 3, toLongitude: 4, people: 2 }, { fromId: "x" }])).toHaveLength(1);
  });

  it("has a point for Brazil", () => {
    expect(COUNTRY_POINTS.BR?.name).toBe("Brazil");
  });
});

describe("ROR locations (suggestions only)", () => {
  const org = {
    id: "https://ror.org/01xe86309",
    names: [{ value: "INPA", types: ["acronym"] }, { value: "Instituto Nacional de Pesquisas da Amazônia", types: ["ror_display"] }],
    locations: [{ geonames_details: { lat: -3.1, lng: -60.02, country_code: "br", name: "Manaus" } }],
  };

  it("reads a record's location", () => {
    expect(rorLocation(org)).toEqual({
      rorId: "https://ror.org/01xe86309",
      matchedName: "Instituto Nacional de Pesquisas da Amazônia",
      latitude: -3.1,
      longitude: -60.02,
      countryCode: "BR",
      city: "Manaus",
    });
    expect(rorLocation({ id: "x", locations: [] })).toBeNull();
  });

  it("takes only a chosen or very close match", () => {
    expect(bestRorMatch({ items: [{ chosen: false, score: 0.5, organization: org }] })).toBeNull();
    expect(bestRorMatch({ items: [{ chosen: true, score: 0.8, organization: org }] })?.city).toBe("Manaus");
  });
});
