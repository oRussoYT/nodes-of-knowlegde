// The Observatory of a Node: counts and their evolution, and where people
// went next. Aggregates only -- no person is named or ranked. Pure.

export interface Observatory {
  node: { slug: string; name: string; shortName: string | null };
  totals: {
    people: number;
    institutions: number;
    works: number;
    bonds: number;
    historyItems: number;
    firstYear: number | null;
    peopleWhoWentOn: number;
    institutionsReached: number;
    countriesReached: number;
  };
  byYear: { year: number; active: number; arrived: number }[];
  worksByDecade: { decade: number; works: number }[];
  diffusionByKind: { kind: string; label: string; institutions: number; people: number }[];
  diffusionByCountry: { countryCode: string; people: number }[];
  institutionsReachedList: { id: string; name: string; people: number }[];
  method: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function n(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function s(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}
function list<T>(v: unknown, f: (r: Record<string, unknown>) => T | null): T[] {
  return Array.isArray(v) ? v.filter(isRecord).map(f).filter((x): x is T => x !== null) : [];
}

export function parseObservatory(data: unknown): Observatory | null {
  if (!isRecord(data) || !isRecord(data.node) || !s(data.node.slug)) return null;
  const t = isRecord(data.totals) ? data.totals : {};
  return {
    node: { slug: data.node.slug as string, name: s(data.node.name) ?? "", shortName: s(data.node.shortName) },
    totals: {
      people: n(t.people),
      institutions: n(t.institutions),
      works: n(t.works),
      bonds: n(t.bonds),
      historyItems: n(t.historyItems),
      firstYear: typeof t.firstYear === "number" ? t.firstYear : null,
      peopleWhoWentOn: n(t.peopleWhoWentOn),
      institutionsReached: n(t.institutionsReached),
      countriesReached: n(t.countriesReached),
    },
    byYear: list(data.byYear, (r) => (typeof r.year === "number" ? { year: r.year, active: n(r.active), arrived: n(r.arrived) } : null)),
    worksByDecade: list(data.worksByDecade, (r) => (typeof r.decade === "number" ? { decade: r.decade, works: n(r.works) } : null)),
    diffusionByKind: list(data.diffusionByKind, (r) => (s(r.kind) ? { kind: r.kind as string, label: s(r.label) ?? (r.kind as string), institutions: n(r.institutions), people: n(r.people) } : null)),
    diffusionByCountry: list(data.diffusionByCountry, (r) => (s(r.countryCode) ? { countryCode: r.countryCode as string, people: n(r.people) } : null)),
    institutionsReachedList: list(data.institutionsReachedList, (r) => (s(r.id) && s(r.name) ? { id: r.id as string, name: r.name as string, people: n(r.people) } : null)),
    method: Array.isArray(data.method) ? data.method.filter((m): m is string => typeof m === "string") : [],
  };
}

/** Bars for a year series, as SVG rects in a 0..width x 0..height box. */
export function yearBars(series: { year: number; value: number }[], width: number, height: number): { year: number; value: number; x: number; y: number; w: number; h: number }[] {
  if (series.length === 0) return [];
  const max = Math.max(1, ...series.map((p) => p.value));
  const w = width / series.length;
  return series.map((p, i) => {
    const h = (p.value / max) * height;
    return { year: p.year, value: p.value, x: i * w, y: height - h, w: Math.max(w - Math.min(1, w * 0.2), 0.5), h };
  });
}

/** The year with the most people active (first one when tied), or null. */
export function busiestYear(byYear: { year: number; active: number }[]): { year: number; active: number } | null {
  return byYear.reduce<{ year: number; active: number } | null>((best, y) => (y.active > (best?.active ?? 0) ? y : best), null);
}
