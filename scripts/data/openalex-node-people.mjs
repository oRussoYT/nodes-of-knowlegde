// Gathers real, published people of a Node from OpenAlex (open scholarly
// index). Two ways, tried in order:
//   1. authors whose publications list the Node's institution (if OpenAlex
//      knows the institution);
//   2. authors of publications that name the Node in their title or abstract
//      (e.g. "Biological Dynamics of Forest Fragments").
// For each person: their affiliations over time and the Node-related works.
// Runs on GitHub Actions; the output is reviewed and turned into a migration
// -- every record provisional, with its source.
//
// usage: node openalex-node-people.mjs <slug> "<institution search>" "<works phrase>" [maxAuthors]

import fs from "node:fs";

const [slug, instSearch, phrase, maxArg] = process.argv.slice(2);
const MAX = Number(maxArg ?? 150);
const MAILTO = "mailto=nodes-of-knowledge@example.org";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (id) => id.replace("https://openalex.org/", "");

async function get(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + MAILTO).catch(() => null);
    if (r && r.ok) return r.json();
    console.error("retry", r ? r.status : "network", url.slice(0, 160));
    await sleep(1500 * (i + 1));
  }
  throw new Error(`failed ${url}`);
}

// 1. The institution, if OpenAlex knows it.
const inst = await get(`https://api.openalex.org/institutions?search=${encodeURIComponent(instSearch)}&per-page=5`);
console.error("institution candidates:", inst.results.map((i) => `${i.id} ${i.display_name} (${i.works_count} works)`).join(" | ") || "none");
const chosen = inst.results.find((i) => i.works_count > 20) ?? null;

// 2. Works: by institution, or naming the Node.
const filter = chosen ? `institutions.id:${short(chosen.id)}` : `title_and_abstract.search:${encodeURIComponent(`"${phrase}"`)}`;
console.error("works filter:", filter);
const works = [];
// Plain pages (deep cursors need an API key).
for (let n = 1; n <= 20 && works.length < 2000; n++) {
  const page = await get(`https://api.openalex.org/works?filter=${filter}&per-page=100&page=${n}&select=id,display_name,publication_year,type,doi,primary_location,authorships`);
  works.push(...page.results);
  if (page.results.length < 100) break;
  await sleep(150);
}
console.error("works:", works.length);

// Authors by how many Node works they appear on (used only to choose whom to fetch).
const byAuthor = new Map();
for (const w of works) {
  for (const a of w.authorships ?? []) {
    if (!a.author?.id || !a.author?.display_name) continue;
    const e = byAuthor.get(a.author.id) ?? { id: a.author.id, name: a.author.display_name, works: [] };
    e.works.push(w);
    byAuthor.set(a.author.id, e);
  }
}
const picked = [...byAuthor.values()].sort((x, y) => y.works.length - x.works.length).slice(0, MAX);

// Full author records (affiliations over time), 50 at a time.
const full = new Map();
for (let i = 0; i < picked.length; i += 50) {
  const ids = picked.slice(i, i + 50).map((p) => short(p.id)).join("|");
  const page = await get(`https://api.openalex.org/authors?filter=openalex:${ids}&per-page=50`);
  for (const a of page.results) full.set(a.id, a);
  await sleep(150);
}

const people = picked.map((p) => {
  const a = full.get(p.id) ?? {};
  const years = p.works.map((w) => w.publication_year).filter((y) => Number.isInteger(y)).sort((x, y) => x - y);
  return {
    authorId: p.id,
    displayName: a.display_name ?? p.name,
    orcid: a.orcid ? a.orcid.replace("https://orcid.org/", "") : null,
    nodeWorks: p.works.length,
    nodeYears: years.length ? [years[0], years[years.length - 1]] : null,
    affiliations: (a.affiliations ?? [])
      .filter((x) => x.institution?.id && x.institution?.display_name && Array.isArray(x.years) && x.years.length > 0)
      .map((x) => ({
        openalexId: x.institution.id,
        name: x.institution.display_name,
        ror: x.institution.ror ? x.institution.ror.replace("https://ror.org/", "") : null,
        type: x.institution.type ?? null,
        country: x.institution.country_code ?? null,
        years: x.years,
      })),
    works: p.works.slice(0, 40).map((w) => ({
      openalexId: w.id,
      title: w.display_name,
      year: w.publication_year,
      type: w.type,
      doi: w.doi,
      venue: w.primary_location?.source?.display_name ?? null,
    })),
  };
});

const out = {
  slug,
  method: chosen ? "institution" : "phrase",
  institution: chosen ? { id: chosen.id, name: chosen.display_name, ror: chosen.ror } : null,
  phrase: chosen ? null : phrase,
  worksFound: works.length,
  retrievedAt: new Date().toISOString(),
  people,
};
fs.writeFileSync(`openalex-${slug}.json`, JSON.stringify(out));
console.error(`${slug}: ${people.length} people, ${works.length} works`);
