// Gathers real, published people of a Node from OpenAlex (open scholarly
// index): authors whose publications list one of the Node's institutions,
// with their affiliations over time and the works linked to that institution.
// Runs on GitHub Actions (which reaches the open web); the output is reviewed
// and turned into a migration -- every record provisional, with its source.
//
// usage: node scripts/data/openalex-node-people.mjs <node-slug> "<institution search>" [maxAuthors]

const [slug, search, maxArg] = process.argv.slice(2);
const MAX = Number(maxArg ?? 150);
const MAILTO = "mailto=nodes-of-knowledge@example.org";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + MAILTO);
    if (r.ok) return r.json();
    await sleep(1500 * (i + 1));
  }
  throw new Error(`failed ${url}`);
}

const inst = await get(`https://api.openalex.org/institutions?search=${encodeURIComponent(search)}&per-page=5`);
console.error("institution candidates:", inst.results.map((i) => `${i.id} ${i.display_name} (${i.works_count} works)`).join(" | "));
const chosen = inst.results[0];
if (!chosen) throw new Error("no institution found");
const instId = chosen.id.replace("https://openalex.org/", "");

const authors = [];
let cursor = "*";
while (authors.length < MAX && cursor) {
  const page = await get(`https://api.openalex.org/authors?filter=affiliations.institution.id:${instId}&per-page=100&cursor=${cursor}&sort=works_count:desc`);
  authors.push(...page.results);
  cursor = page.meta.next_cursor;
  await sleep(150);
}

const people = [];
for (const a of authors.slice(0, MAX)) {
  const works = await get(
    `https://api.openalex.org/works?filter=author.id:${a.id.replace("https://openalex.org/", "")},institutions.id:${instId}&per-page=25&sort=publication_year:asc&select=id,display_name,publication_year,type,doi,primary_location`,
  );
  await sleep(120);
  people.push({
    authorId: a.id,
    displayName: a.display_name,
    orcid: a.orcid ? a.orcid.replace("https://orcid.org/", "") : null,
    worksCount: a.works_count,
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
    works: works.results.map((w) => ({
      openalexId: w.id,
      title: w.display_name,
      year: w.publication_year,
      type: w.type,
      doi: w.doi,
      venue: w.primary_location?.source?.display_name ?? null,
    })),
  });
}

const out = { slug, institution: { id: chosen.id, name: chosen.display_name, ror: chosen.ror }, retrievedAt: new Date().toISOString(), people };
await import("node:fs").then((fs) => fs.writeFileSync(`openalex-${slug}.json`, JSON.stringify(out)));
console.error(`${slug}: ${people.length} people from ${chosen.display_name}`);
