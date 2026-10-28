// Maps: places, people counts in time, movements. Pure -- unit-tested.
// Projection: equirectangular, x = lon + 180, y = 90 - lat (same as the
// basemap at /maps/world.svg, viewBox 0 0 360 180).

export interface MapPlace {
  id: string;
  name: string;
  shortName: string | null;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  city: string | null;
  people: number;
  everPeople: number;
}

export interface MapItem {
  id: string;
  title: string;
  kind: string;
  latitude: number;
  longitude: number;
}

export interface MapDocument {
  year: number | null;
  places: MapPlace[];
  items: MapItem[];
  withoutLocation: number;
  years: { min: number | null; max: number | null };
}

export interface Movement {
  fromId: string;
  fromName: string;
  from: [number, number];
  toId: string;
  toName: string;
  to: [number, number];
  people: number;
  firstYear: number | null;
  lastYear: number | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export function parseMap(data: unknown): MapDocument {
  const d = isRecord(data) ? data : {};
  const years = isRecord(d.years) ? d.years : {};
  return {
    year: num(d.year),
    places: Array.isArray(d.places)
      ? d.places.filter(isRecord).flatMap((p) => {
          const lat = num(p.latitude);
          const lon = num(p.longitude);
          if (!str(p.id) || !str(p.name) || lat === null || lon === null) return [];
          return [
            {
              id: p.id as string,
              name: p.name as string,
              shortName: str(p.shortName),
              latitude: lat,
              longitude: lon,
              countryCode: str(p.countryCode),
              city: str(p.city),
              people: num(p.people) ?? 0,
              everPeople: num(p.everPeople) ?? 0,
            },
          ];
        })
      : [],
    items: Array.isArray(d.items)
      ? d.items.filter(isRecord).flatMap((i) => {
          const lat = num(i.latitude);
          const lon = num(i.longitude);
          return str(i.id) && str(i.title) && lat !== null && lon !== null ? [{ id: i.id as string, title: i.title as string, kind: str(i.kind) ?? "", latitude: lat, longitude: lon }] : [];
        })
      : [],
    withoutLocation: num(d.withoutLocation) ?? 0,
    years: { min: num(years.min), max: num(years.max) },
  };
}

export function parseMovements(data: unknown): Movement[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((m) => {
    const a = [num(m.fromLongitude), num(m.fromLatitude)];
    const b = [num(m.toLongitude), num(m.toLatitude)];
    if (!str(m.fromId) || !str(m.toId) || a.includes(null) || b.includes(null)) return [];
    return [
      {
        fromId: m.fromId as string,
        fromName: str(m.fromName) ?? "",
        from: a as [number, number],
        toId: m.toId as string,
        toName: str(m.toName) ?? "",
        to: b as [number, number],
        people: num(m.people) ?? 0,
        firstYear: num(m.firstYear),
        lastYear: num(m.lastYear),
      },
    ];
  });
}

export function project(lon: number, lat: number): [number, number] {
  return [lon + 180, 90 - lat];
}

/** A viewBox around the points, padded, never narrower than `minSpan` degrees, kept at 2:1. */
export function viewBoxFor(points: [number, number][], minSpan = 8): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { x: 0, y: 0, w: 360, h: 180 };
  const xs = points.map(([lon]) => lon + 180);
  const ys = points.map(([, lat]) => 90 - lat);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  const pad = Math.max((x1 - x0) * 0.15, (y1 - y0) * 0.15, minSpan / 2);
  x0 -= pad;
  x1 += pad;
  y0 -= pad;
  y1 += pad;
  let w = x1 - x0;
  let h = y1 - y0;
  if (w < h * 2) {
    const extra = h * 2 - w;
    x0 -= extra / 2;
    w = h * 2;
  } else {
    const extra = w / 2 - h;
    y0 -= extra / 2;
    h = w / 2;
  }
  if (w > 360) return { x: 0, y: 0, w: 360, h: 180 };
  x0 = Math.min(Math.max(x0, 0), 360 - w);
  y0 = Math.min(Math.max(y0, 0), 180 - h);
  const r = (n: number) => Math.round(n * 100) / 100;
  return { x: r(x0), y: r(y0), w: r(w), h: r(h) };
}

/** Dot radius in viewBox units: grows with the square root of the count. */
export function radius(count: number, viewWidth: number): number {
  const base = viewWidth / 160;
  return Math.round((base * (1 + Math.sqrt(Math.max(count, 0)))) * 1000) / 1000;
}

/** A gentle arc between two projected points (quadratic curve). */
export function arcPath(a: [number, number], b: [number, number]): string {
  const [x1, y1] = project(a[0], a[1]);
  const [x2, y2] = project(b[0], b[1]);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * 0.2;
  const cy = my + dx * 0.2;
  const f = (n: number) => Math.round(n * 100) / 100;
  return `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`;
}

/** "In 1994, 37 people were at 4 places." */
export function yearSentence(doc: MapDocument): string {
  const people = doc.places.reduce((n, p) => n + p.people, 0);
  const where = doc.places.filter((p) => p.people > 0).length;
  const peopleWord = people === 1 ? "1 person was" : `${people} people were`;
  const placeWord = where === 1 ? "1 place" : `${where} places`;
  return doc.year === null ? `Today, the record places ${people === 1 ? "1 person" : `${people} people`} at ${placeWord}.` : `In ${doc.year}, ${peopleWord} at ${placeWord} in the record.`;
}
