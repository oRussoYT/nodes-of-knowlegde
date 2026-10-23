// A person's history from public sources: OpenAlex (affiliations over the
// years, theses, articles, datasets) and ROR (whether an institution closed,
// when it was founded, the other names it had). The pure normalizers are
// unit-tested; the fetches are thin adapters that return null on failure.
//
// Nothing here decides anything: it only shapes what the database function
// steward_record_openalex_history() records as provisional, with its link.

export interface HistoryAffiliation {
  openalexId: string;
  name: string;
  ror: string | null;
  type: string | null;
  country: string | null;
  years: number[];
  rorStatus?: string | null;
  established?: number | null;
  names?: { name: string; kind: "acronym" | "label" | "alias"; language: string | null }[];
}

export interface HistoryWork {
  openalexId: string;
  title: string;
  year: number | null;
  type: string | null;
  venue: string | null;
  doi: string | null;
}

export interface HistoryPayload {
  authorId: string;
  affiliations: HistoryAffiliation[];
  works: HistoryWork[];
}

export const MAX_WORKS = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** "https://ror.org/03yrm5c26" -> "03yrm5c26". */
export function rorKey(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  const key = s.replace(/^https?:\/\/ror\.org\//i, "");
  return /^0[a-z0-9]{8}$/i.test(key) ? key.toLowerCase() : null;
}

/** "https://openalex.org/A5023888391" -> "A5023888391". */
export function openAlexShortId(value: string): string | null {
  const match = /(?:^|\/)([AIW]\d+)$/i.exec(value.trim());
  return match ? match[1]!.toUpperCase() : null;
}

/** Affiliations from an OpenAlex /authors/{id} response. */
export function affiliationsFromAuthor(raw: unknown): HistoryAffiliation[] {
  if (!isRecord(raw) || !Array.isArray(raw.affiliations)) return [];
  const out: HistoryAffiliation[] = [];
  for (const a of raw.affiliations) {
    if (!isRecord(a) || !isRecord(a.institution)) continue;
    const inst = a.institution;
    const openalexId = str(inst.id);
    const name = str(inst.display_name);
    const years = Array.isArray(a.years)
      ? [...new Set(a.years.filter((y): y is number => Number.isInteger(y) && y >= 1800 && y <= 2100))].sort((x, y) => x - y)
      : [];
    if (!openalexId || !name || years.length === 0) continue;
    out.push({ openalexId, name, ror: rorKey(inst.ror), type: str(inst.type), country: str(inst.country_code), years });
  }
  return out;
}

/** Works from an OpenAlex /works response, newest first, at most MAX_WORKS. */
export function worksFromResponse(raw: unknown): HistoryWork[] {
  if (!isRecord(raw) || !Array.isArray(raw.results)) return [];
  const out: HistoryWork[] = [];
  for (const w of raw.results) {
    if (!isRecord(w)) continue;
    const openalexId = str(w.id);
    const title = str(w.display_name) ?? str(w.title);
    if (!openalexId || !/^https:\/\/openalex\.org\/W\d+$/i.test(openalexId) || !title) continue;
    const year = Number.isInteger(w.publication_year) ? (w.publication_year as number) : null;
    const venue =
      isRecord(w.primary_location) && isRecord(w.primary_location.source) ? str(w.primary_location.source.display_name) : null;
    const doi = str(w.doi);
    out.push({
      openalexId,
      title: title.slice(0, 1000),
      year,
      type: str(w.type),
      venue,
      doi: doi && /^https:\/\/doi\.org\//i.test(doi) ? doi : null,
    });
  }
  return out.slice(0, MAX_WORKS);
}

/** Status, founding year and other names from a ROR v2 organization record. */
export function rorDetails(raw: unknown): Pick<HistoryAffiliation, "rorStatus" | "established" | "names"> {
  if (!isRecord(raw)) return {};
  const names: NonNullable<HistoryAffiliation["names"]> = [];
  if (Array.isArray(raw.names)) {
    for (const n of raw.names) {
      if (!isRecord(n)) continue;
      const value = str(n.value);
      const types = Array.isArray(n.types) ? n.types.filter((t): t is string => typeof t === "string") : [];
      if (!value || types.includes("ror_display")) continue;
      const kind = types.includes("acronym") ? "acronym" : types.includes("label") ? "label" : types.includes("alias") ? "alias" : null;
      if (kind) names.push({ name: value, kind, language: str(n.lang) });
    }
  }
  const established = Number.isInteger(raw.established) ? (raw.established as number) : null;
  return { rorStatus: str(raw.status), established, names: names.slice(0, 20) };
}

async function getJson(url: string, timeoutMs = 9000): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function withMailto(params: URLSearchParams): string {
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) params.set("mailto", mailto);
  return params.toString();
}

/** Fetches everything for one accepted OpenAlex author. Null if OpenAlex failed. */
export async function fetchOpenAlexHistory(authorId: string): Promise<HistoryPayload | null> {
  const short = openAlexShortId(authorId);
  if (!short || !short.startsWith("A")) return null;

  const [author, works] = await Promise.all([
    getJson(`https://api.openalex.org/authors/${short}?${withMailto(new URLSearchParams({ select: "id,affiliations" }))}`),
    getJson(
      `https://api.openalex.org/works?${withMailto(
        new URLSearchParams({
          filter: `author.id:${short}`,
          "per-page": String(MAX_WORKS),
          sort: "publication_year:desc",
          select: "id,doi,display_name,publication_year,type,primary_location",
        }),
      )}`,
    ),
  ]);
  if (author === null) return null;

  const affiliations = affiliationsFromAuthor(author);
  // ROR: closed or renamed institutions, founding year, other names.
  const withRor = await Promise.all(
    affiliations.map(async (a) => {
      if (!a.ror) return a;
      const ror = await getJson(`https://api.ror.org/v2/organizations/${a.ror}`, 6000);
      return ror === null ? a : { ...a, ...rorDetails(ror) };
    }),
  );

  return { authorId, affiliations: withRor, works: worksFromResponse(works) };
}
