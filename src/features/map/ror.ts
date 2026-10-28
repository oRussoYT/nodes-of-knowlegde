// Finding an institution's location in ROR (Research Organization Registry).
// Only a SUGGESTION: a steward accepts or rejects each one.

export interface RorLocation {
  rorId: string;
  matchedName: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  city: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Location of one ROR v2 organization record. */
export function rorLocation(raw: unknown): RorLocation | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !Array.isArray(raw.locations)) return null;
  const loc = raw.locations.find(isRecord);
  const g = loc && isRecord(loc.geonames_details) ? loc.geonames_details : null;
  if (!g || typeof g.lat !== "number" || typeof g.lng !== "number") return null;
  const names = Array.isArray(raw.names) ? raw.names.filter(isRecord) : [];
  const display = names.find((n) => Array.isArray(n.types) && n.types.includes("ror_display")) ?? names[0];
  return {
    rorId: raw.id,
    matchedName: typeof display?.value === "string" ? display.value : raw.id,
    latitude: g.lat,
    longitude: g.lng,
    countryCode: typeof g.country_code === "string" ? g.country_code.toUpperCase() : null,
    city: typeof g.name === "string" ? g.name : null,
  };
}

/** Best candidate from a ROR v2 search (?affiliation= gives a "chosen" flag). */
export function bestRorMatch(raw: unknown): RorLocation | null {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return null;
  const items = raw.items.filter(isRecord);
  const chosen = items.find((i) => i.chosen === true) ?? items.find((i) => typeof i.score === "number" && i.score >= 0.9);
  const org = chosen && isRecord(chosen.organization) ? chosen.organization : null;
  return org ? rorLocation(org) : null;
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function findRorLocation(name: string, rorId: string | null): Promise<RorLocation | null> {
  if (rorId) {
    const key = rorId.replace(/^https?:\/\/ror\.org\//i, "");
    const direct = rorLocation(await getJson(`https://api.ror.org/v2/organizations/${encodeURIComponent(key)}`));
    if (direct) return direct;
  }
  return bestRorMatch(await getJson(`https://api.ror.org/v2/organizations?affiliation=${encodeURIComponent(name)}`));
}
