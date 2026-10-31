// Conflict-of-interest screening: for a set of people (an author and the
// reviewers of a paper, a candidate and a committee), the ties the record
// documents between each pair -- bonds, shared works, overlapping periods at
// the same institution. Facts with years; never a score. Pure, unit-tested.

export interface CheckedPerson {
  personId: string;
  name: string;
  affiliation: string | null;
}

export interface PairTies {
  a: { personId: string; name: string };
  b: { personId: string; name: string };
  bonds: { kind: string; startYear: number | null; endYear: number | null; status: string | null }[];
  sharedWorks: { id: string; title: string; year: number | null }[];
  sharedPlaces: { organization: string; fromYear: number | null; toYear: number | null }[];
}

export interface ConflictCheck {
  people: CheckedPerson[];
  pairs: PairTies[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CHECKED = 15;

function rec(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

/** "a,b,c" from the address -> distinct valid ids, at most 15. */
export function readIds(raw: string | string[] | undefined): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const ids = joined.split(",").map((s) => s.trim()).filter((s) => UUID.test(s));
  return [...new Set(ids)].slice(0, MAX_CHECKED);
}

export function idsParam(ids: string[]): string {
  return ids.join(",");
}

function personRef(v: unknown): { personId: string; name: string } | null {
  const o = rec(v);
  return o && typeof o.personId === "string" && typeof o.name === "string" ? { personId: o.personId, name: o.name } : null;
}

export function parseConflictCheck(data: unknown): ConflictCheck {
  const o = rec(data);
  if (!o) return { people: [], pairs: [] };
  const people: CheckedPerson[] = Array.isArray(o.people)
    ? o.people.flatMap((raw) => {
        const p = rec(raw);
        if (!p || typeof p.personId !== "string" || typeof p.name !== "string") return [];
        return [{ personId: p.personId, name: p.name, affiliation: str(p.affiliation) }];
      })
    : [];
  const pairs: PairTies[] = Array.isArray(o.pairs)
    ? o.pairs.flatMap((raw) => {
        const p = rec(raw);
        const a = personRef(p?.a);
        const b = personRef(p?.b);
        if (!p || !a || !b) return [];
        const list = (v: unknown) => (Array.isArray(v) ? v.map(rec).filter((x): x is Record<string, unknown> => x !== null) : []);
        return [
          {
            a,
            b,
            bonds: list(p.bonds).map((x) => ({ kind: str(x.kind) ?? "Bond", startYear: num(x.startYear), endYear: num(x.endYear), status: str(x.status) })),
            sharedWorks: list(p.sharedWorks).flatMap((x) =>
              typeof x.id === "string" ? [{ id: x.id, title: str(x.title) ?? "Untitled", year: num(x.year) }] : [],
            ),
            sharedPlaces: list(p.sharedPlaces).map((x) => ({ organization: str(x.organization) ?? "An institution", fromYear: num(x.fromYear), toYear: num(x.toYear) })),
          },
        ];
      })
    : [];
  return { people, pairs };
}

function span(from: number | null, to: number | null): string {
  if (from === null) return "dates not recorded";
  if (to === null || to === from) return `${from}`;
  return `${from}–${to}`;
}

/** One plain sentence per kind of tie, for the pair. */
export function pairSentences(p: PairTies): string[] {
  const out: string[] = [];
  for (const b of p.bonds) out.push(`${b.kind}, ${span(b.startYear, b.endYear)}${b.status === "provisional" ? " (not yet confirmed)" : ""}`);
  if (p.sharedWorks.length > 0) {
    const last = p.sharedWorks.map((w) => w.year).filter((y): y is number => y !== null).sort((x, y) => y - x)[0];
    out.push(`${p.sharedWorks.length} ${p.sharedWorks.length === 1 ? "work" : "works"} together${last ? `, the latest in ${last}` : ""}`);
  }
  for (const s of p.sharedPlaces) out.push(`Both at ${s.organization}, ${span(s.fromYear, s.toYear)}`);
  return out;
}

/** People in the check with no documented tie to anyone else in it. */
export function untied(check: ConflictCheck): CheckedPerson[] {
  const tied = new Set(check.pairs.flatMap((p) => [p.a.personId, p.b.personId]));
  return check.people.filter((p) => !tied.has(p.personId));
}
