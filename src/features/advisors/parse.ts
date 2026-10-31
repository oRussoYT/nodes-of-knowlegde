// "Find an advisor": mentors in the record and what happened to their
// advisees -- documented facts, alphabetical, never a ranking. Pure.

export interface Advisor {
  personId: string;
  name: string;
  advisees: number;
  years: [number | null, number | null];
  topics: string[];
  whereAdviseesWent: string[];
  adviseesWithLaterPeriods: number;
}

export function parseAdvisors(data: unknown): Advisor[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((r) => {
    if (typeof r !== "object" || r === null) return [];
    const o = r as Record<string, unknown>;
    if (typeof o.personId !== "string" || typeof o.name !== "string") return [];
    const y = Array.isArray(o.years) ? o.years : [];
    const num = (v: unknown) => (typeof v === "number" ? v : null);
    return [
      {
        personId: o.personId,
        name: o.name,
        advisees: num(o.advisees) ?? 0,
        years: [num(y[0]), num(y[1])],
        topics: Array.isArray(o.topics) ? o.topics.filter((t): t is string => typeof t === "string") : [],
        whereAdviseesWent: Array.isArray(o.whereAdviseesWent) ? o.whereAdviseesWent.filter((t): t is string => typeof t === "string") : [],
        adviseesWithLaterPeriods: num(o.adviseesWithLaterPeriods) ?? 0,
      },
    ];
  });
}

/** "3 advisees documented, 1998–2010; 2 have later periods in the record." */
export function advisorSentence(a: Advisor): string {
  const years = a.years[0] === null ? "" : a.years[1] !== null && a.years[1] !== a.years[0] ? `, ${a.years[0]}–${a.years[1]}` : `, ${a.years[0]}`;
  const first = `${a.advisees} ${a.advisees === 1 ? "advisee" : "advisees"} documented${years}`;
  const later = a.adviseesWithLaterPeriods > 0 ? `; ${a.adviseesWithLaterPeriods} with later periods in the record` : "";
  return `${first}${later}.`;
}
