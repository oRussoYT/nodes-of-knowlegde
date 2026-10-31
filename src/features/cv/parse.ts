// A person's record as a CV, and the points of their trajectory. Pure.

export interface CvPeriod {
  organizationId: string;
  organization: string;
  role: string;
  startYear: number | null;
  endYear: number | null;
  ongoing: boolean;
  status: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Cv {
  id: string;
  name: string;
  verificationStatus: string;
  orcid: string | null;
  topics: string[];
  periods: CvPeriod[];
  works: { id: string; title: string; year: number | null; kind: string | null; url: string | null }[];
  bonds: { personId: string; name: string; kind: string | null }[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const s = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseCv(data: unknown): Cv | null {
  if (!isRecord(data) || !s(data.id) || !s(data.name)) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);
  return {
    id: data.id as string,
    name: data.name as string,
    verificationStatus: s(data.verificationStatus) ?? "provisional",
    orcid: s(data.orcid),
    topics: Array.isArray(data.topics) ? data.topics.filter((t): t is string => typeof t === "string") : [],
    periods: list(data.periods).flatMap((p) =>
      s(p.organizationId) && s(p.organization)
        ? [
            {
              organizationId: p.organizationId as string,
              organization: p.organization as string,
              role: s(p.role) ?? "",
              startYear: n(p.startYear),
              endYear: n(p.endYear),
              ongoing: p.ongoing === true,
              status: s(p.status) ?? "provisional",
              note: s(p.note),
              latitude: n(p.latitude),
              longitude: n(p.longitude),
            },
          ]
        : [],
    ),
    works: list(data.works).flatMap((w) => (s(w.id) && s(w.title) ? [{ id: w.id as string, title: w.title as string, year: n(w.year), kind: s(w.kind), url: s(w.url) }] : [])),
    bonds: list(data.bonds).flatMap((b) => (s(b.personId) && s(b.name) ? [{ personId: b.personId as string, name: b.name as string, kind: s(b.kind) }] : [])),
  };
}

export function span(p: { startYear: number | null; endYear: number | null; ongoing: boolean }): string {
  if (p.startYear === null) return "date unknown";
  if (p.ongoing) return `${p.startYear}–present`;
  if (p.endYear !== null && p.endYear !== p.startYear) return `${p.startYear}–${p.endYear}`;
  return String(p.startYear);
}

/** Located places in order, merged per institution, and the moves between them. */
export function trajectoryPoints(periods: CvPeriod[]) {
  const located = periods.filter((p) => p.latitude !== null && p.longitude !== null);
  const places = new Map<string, { id: string; label: string; latitude: number; longitude: number; count: number }>();
  for (const p of located) {
    const e = places.get(p.organizationId) ?? { id: p.organizationId, label: p.organization, latitude: p.latitude!, longitude: p.longitude!, count: 0 };
    e.count += 1;
    places.set(p.organizationId, e);
  }
  const moves: { fromId: string; fromName: string; from: [number, number]; toId: string; toName: string; to: [number, number]; people: number; firstYear: number | null; lastYear: number | null }[] = [];
  for (let i = 1; i < located.length; i++) {
    const a = located[i - 1]!;
    const b = located[i]!;
    if (a.organizationId === b.organizationId) continue;
    moves.push({ fromId: a.organizationId, fromName: a.organization, from: [a.longitude!, a.latitude!], toId: b.organizationId, toName: b.organization, to: [b.longitude!, b.latitude!], people: 1, firstYear: b.startYear, lastYear: b.startYear });
  }
  return { places: [...places.values()], moves };
}
