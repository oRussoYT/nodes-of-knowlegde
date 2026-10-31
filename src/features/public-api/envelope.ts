// The public, read-only API (ROTEIRO, "Depois"): what is already public on
// the site, as JSON for other systems. People appear only when their page
// was deliberately made public; institutions carry ROR and Wikidata ids.
// Pure, unit-tested.

export const API_VERSION = "v1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export interface Envelope {
  api: string;
  source: string;
  note: string;
  data: unknown;
}

export function envelope(data: unknown, siteUrl: string): Envelope {
  return {
    api: `Nodes of Knowledge public API ${API_VERSION}`,
    source: siteUrl,
    note: "Read-only. Only records their people or stewards chose to make public. Provisional entries say so in their verification status.",
    data,
  };
}

export const API_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300",
  "Content-Type": "application/json; charset=utf-8",
};

export function apiIndex(base: string) {
  return {
    endpoints: [
      { path: `${base}/nodes`, description: "Every active Node, its counts and its institutions (with ROR and Wikidata ids when known)." },
      { path: `${base}/organizations/{id}`, description: "One institution: name, country, coordinates, ROR and Wikidata ids." },
      { path: `${base}/people`, description: "People whose page is public, alphabetical." },
      { path: `${base}/people/{id}`, description: "One public person page: name and documented periods, each with its provenance." },
    ],
  };
}

/** External links for an institution's identifiers. */
export function identifierUrls(org: { ror?: unknown; wikidata?: unknown }): { ror: string | null; wikidata: string | null } {
  const ror = typeof org.ror === "string" && org.ror.trim() !== "" ? org.ror.trim() : null;
  const wd = typeof org.wikidata === "string" && /^Q\d+$/.test(org.wikidata.trim()) ? org.wikidata.trim() : null;
  return {
    ror: ror === null ? null : ror.startsWith("http") ? ror : `https://ror.org/${ror}`,
    wikidata: wd === null ? null : `https://www.wikidata.org/wiki/${wd}`,
  };
}
