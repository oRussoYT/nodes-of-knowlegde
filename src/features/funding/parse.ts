// Calls and grants matched with a person's or a Node's history. Every match
// says why; the order is the deadline (a calendar, not a ranking). Pure.

export interface FundingCall {
  id: string;
  title: string;
  funder: string;
  url: string;
  summary: string | null;
  opensOn: string | null;
  closesOn: string | null;
  amount: string | null;
  themes: string[];
  eligibleCountries: string[];
  careerStages: string[];
  scope: "national" | "international";
  source: "manual" | "grants_gov" | "ai_page";
  reasons: { sharedThemes: (string | { label: string; people: number })[]; country: string | null; careerStage: string | null } | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function parseCalls(data: unknown): FundingCall[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((c) => {
    const id = str(c.id);
    const title = str(c.title);
    const url = str(c.url);
    if (!id || !title || !url) return [];
    const r = isRecord(c.reasons) ? c.reasons : null;
    return [
      {
        id,
        title,
        funder: str(c.funder) ?? "",
        url,
        summary: str(c.summary),
        opensOn: str(c.opensOn),
        closesOn: str(c.closesOn),
        amount: str(c.amount),
        themes: strings(c.themes),
        eligibleCountries: strings(c.eligibleCountries),
        careerStages: strings(c.careerStages),
        scope: c.scope === "national" ? "national" : "international",
        source: c.source === "grants_gov" || c.source === "ai_page" ? c.source : "manual",
        reasons: r
          ? {
              sharedThemes: Array.isArray(r.sharedThemes)
                ? r.sharedThemes.flatMap((t): (string | { label: string; people: number })[] =>
                    typeof t === "string" ? [t] : isRecord(t) && typeof t.label === "string" ? [{ label: t.label, people: Number(t.people) || 0 }] : [],
                  )
                : [],
              country: str(r.country),
              careerStage: str(r.careerStage),
            }
          : null,
      },
    ];
  });
}

const STAGE: Record<string, string> = { student: "students", early_career: "early-career researchers", established: "established researchers", any: "any career stage" };

/** The reasons in plain words. */
export function matchReasons(c: FundingCall): string[] {
  if (!c.reasons) return [];
  const out: string[] = [];
  const themes = c.reasons.sharedThemes.map((t) => (typeof t === "string" ? t : `${t.label} (${t.people} ${t.people === 1 ? "person" : "people"})`));
  if (themes.length > 0) out.push(`Shares ${themes.length === 1 ? "the theme" : "the themes"} ${themes.join(", ")}`);
  if (c.reasons.country === "any") out.push("Open to any country");
  else if (c.reasons.country) out.push(`Open to applicants in ${c.reasons.country}`);
  if (c.reasons.careerStage) out.push(`For ${STAGE[c.reasons.careerStage] ?? c.reasons.careerStage}`);
  return out;
}

/** Days left until the deadline (negative = past), or null. */
export function daysLeft(closesOn: string | null, today = new Date()): number | null {
  if (!closesOn || !/^\d{4}-\d{2}-\d{2}/.test(closesOn)) return null;
  const end = Date.UTC(Number(closesOn.slice(0, 4)), Number(closesOn.slice(5, 7)) - 1, Number(closesOn.slice(8, 10)));
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((end - now) / 86_400_000);
}

export type CallFormResult = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

export function parseCallForm(form: FormData): CallFormResult {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const title = get("title");
  const funder = get("funder");
  const url = get("url");
  if (title.length < 3) return { ok: false, error: "Write the call's title." };
  if (funder.length < 2) return { ok: false, error: "Write who funds it." };
  if (!/^https?:\/\/\S+$/i.test(url)) return { ok: false, error: "Give the call's web page (https://…)." };
  const date = (v: string) => (v === "" ? null : /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "bad");
  const opens = date(get("opensOn"));
  const closes = date(get("closesOn"));
  if (opens === "bad" || closes === "bad") return { ok: false, error: "Dates as YYYY-MM-DD." };
  if (opens && closes && closes < opens) return { ok: false, error: "The deadline is before the opening date." };
  const list = (v: string) => v.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const themes = list(get("themes")).slice(0, 30);
  if (themes.length === 0) return { ok: false, error: "Give at least one theme, so the call can be matched." };
  const countries = list(get("eligibleCountries")).map((c) => c.toUpperCase());
  if (countries.some((c) => !/^[A-Z]{2}$/.test(c))) return { ok: false, error: "Countries as two letters, e.g. BR, US." };
  const stages = form.getAll("careerStages").map(String).filter((s) => ["student", "early_career", "established", "any"].includes(s));
  return {
    ok: true,
    payload: {
      title,
      funder,
      url,
      summary: get("summary") || null,
      opensOn: opens,
      closesOn: closes,
      amount: get("amount") || null,
      themes,
      eligibleCountries: countries,
      careerStages: stages,
      scope: get("scope") === "national" ? "national" : "international",
      source: "manual",
    },
  };
}

// ---- Grants.gov (public search API) ----------------------------------

function usDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

export function callsFromGrantsGov(raw: unknown, theme: string): Record<string, unknown>[] {
  const data = isRecord(raw) && isRecord(raw.data) ? raw.data : null;
  const hits = data && Array.isArray(data.oppHits) ? data.oppHits.filter(isRecord) : [];
  return hits.flatMap((h) => {
    const id = h.id === undefined || h.id === null ? null : String(h.id);
    const title = str(h.title);
    if (!id || !title) return [];
    return [
      {
        title: title.slice(0, 400),
        funder: (str(h.agency) ?? str(h.agencyCode) ?? "US federal agency").slice(0, 200),
        url: `https://www.grants.gov/search-results-detail/${encodeURIComponent(id)}`,
        summary: `Opportunity ${str(h.number) ?? id} on Grants.gov. Check eligibility for non-US applicants on its page.`,
        opensOn: usDate(h.openDate),
        closesOn: usDate(h.closeDate),
        themes: [theme],
        eligibleCountries: [],
        careerStages: [],
        scope: "international",
        source: "grants_gov",
        externalId: id,
      },
    ];
  });
}

// ---- A call's own page, read by AI -------------------------------------

/** Visible text of an HTML page (scripts/styles removed), capped. */
export function pageText(html: string, max = 30_000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function callPrompt(url: string, text: string): string {
  return [
    `Below is the text of a funding call's web page (${url}). Extract the call. Do not guess: leave fields empty when the page does not say.`,
    'Answer with JSON only: {"title":"","funder":"","summary":"(2 sentences)","opensOn":"YYYY-MM-DD","closesOn":"YYYY-MM-DD","amount":"","themes":["research themes it funds"],"eligibleCountries":["two-letter codes, empty if any"],"careerStages":["student|early_career|established|any"],"scope":"national|international"}',
    "",
    text,
  ].join("\n");
}

export function callFromAi(raw: unknown, url: string): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const title = str(raw.title);
  const funder = str(raw.funder);
  if (!title || !funder) return null;
  const d = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  let opens = d(raw.opensOn);
  const closes = d(raw.closesOn);
  if (opens && closes && closes < opens) opens = null;
  return {
    title: title.slice(0, 400),
    funder: funder.slice(0, 200),
    url,
    summary: str(raw.summary)?.slice(0, 1000) ?? null,
    opensOn: opens,
    closesOn: closes,
    amount: str(raw.amount)?.slice(0, 200) ?? null,
    themes: strings(raw.themes).slice(0, 20),
    eligibleCountries: strings(raw.eligibleCountries).filter((c) => /^[A-Za-z]{2}$/.test(c)),
    careerStages: strings(raw.careerStages).filter((s) => ["student", "early_career", "established", "any"].includes(s)),
    scope: raw.scope === "national" ? "national" : "international",
    source: "ai_page",
    externalId: url.slice(0, 500),
  };
}
