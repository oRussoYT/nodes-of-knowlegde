// Comparing two Nodes side by side, from their public Observatories.
// Counts only; the comparison describes histories, it ranks nobody. Pure.

import type { Observatory } from "./parse";

export interface CompareRow {
  label: string;
  a: string;
  b: string;
}

const nf = new Intl.NumberFormat("en");

export function compareRows(a: Observatory, b: Observatory): CompareRow[] {
  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
  const peakOf = (o: Observatory) => {
    const p = o.byYear.reduce<{ year: number; active: number } | null>((best, y) => (y.active > (best?.active ?? 0) ? y : best), null);
    return p ? `${p.year} (${p.active})` : "—";
  };
  return [
    { label: "Documented since", a: a.totals.firstYear ? String(a.totals.firstYear) : "—", b: b.totals.firstYear ? String(b.totals.firstYear) : "—" },
    { label: "People documented", a: nf.format(a.totals.people), b: nf.format(b.totals.people) },
    { label: "Institutions in the Node", a: nf.format(a.totals.institutions), b: nf.format(b.totals.institutions) },
    { label: "Works", a: nf.format(a.totals.works), b: nf.format(b.totals.works) },
    { label: "Documented bonds", a: nf.format(a.totals.bonds), b: nf.format(b.totals.bonds) },
    { label: "History items", a: nf.format(a.totals.historyItems), b: nf.format(b.totals.historyItems) },
    { label: "Year with most people active", a: peakOf(a), b: peakOf(b) },
    { label: "Went on to other institutions", a: `${nf.format(a.totals.peopleWhoWentOn)} (${pct(a.totals.peopleWhoWentOn, a.totals.people)})`, b: `${nf.format(b.totals.peopleWhoWentOn)} (${pct(b.totals.peopleWhoWentOn, b.totals.people)})` },
    { label: "Institutions reached", a: nf.format(a.totals.institutionsReached), b: nf.format(b.totals.institutionsReached) },
    { label: "Countries reached", a: nf.format(a.totals.countriesReached), b: nf.format(b.totals.countriesReached) },
  ];
}

/** Institutions reached by people of both Nodes (alphabetical). */
export function sharedDestinations(a: Observatory, b: Observatory): string[] {
  const names = new Set(b.institutionsReachedList.map((i) => i.name));
  return a.institutionsReachedList.map((i) => i.name).filter((n) => names.has(n)).sort((x, y) => x.localeCompare(y));
}
