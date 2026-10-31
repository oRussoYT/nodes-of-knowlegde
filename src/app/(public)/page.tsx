import Link from "next/link";

import { SITE_NAME } from "@/config/site";
import { nodeLabel } from "@/features/nodes/parse";
import { listNodes } from "@/features/nodes/read";
import { Cursor } from "@/features/home/Cursor";
import { HorizontalSteps } from "@/features/home/HorizontalSteps";
import { LineageScrub } from "@/features/home/LineageScrub";
import { LitStatement } from "@/features/home/LitStatement";
import { MotionToggle } from "@/features/home/MotionToggle";
import { PhotoRail, type RailPhoto } from "@/features/home/PhotoRail";
import { Preloader } from "@/features/home/Preloader";
import { RevealImage } from "@/features/home/RevealImage";
import { SmoothScroll } from "@/features/home/SmoothScroll";
import { cn } from "@/lib/ui/cn";

// Public landing -- the front door of Nodes of Knowledge (docs/PRODUTO.md): one
// engine, many Nodes (the PDBFF was the first), told the way
// a racing driver's site tells a season. Ink and bone bands, a lime signal,
// full-bleed photographs of the forest that wipe in and drift, an opening
// counter, inertial scrolling, a trailing cursor, magnetic buttons, letters
// that drop into place, words that light up, a lineage that draws itself,
// photos and steps that travel sideways, rules that stack.
//
// Motion is the identity of this page, so it runs even when the operating
// system asks for less motion; instead the page has its own visible "Motion
// off" switch (MotionToggle) that stops all of it. Text is never left
// unreadable mid-animation. Photos: Wikimedia Commons, free licences, credited
// in the footer. The example record and the lineage are fictional.

const HEADLINE = ["Who you did it with.", "Who taught you.", "Where you all were."] as const;
const LETTER_MS = 28;
const HEADLINE_START_MS = 1350;

// Letter-by-letter timing, computed once: each line starts after the previous.
const HEADLINE_LINES = HEADLINE.map((text, line) => {
  const before = HEADLINE.slice(0, line).reduce((n, t) => n + t.length * LETTER_MS + 60, 0);
  const start = HEADLINE_START_MS + before;
  const words = text.split(" ");
  const offsets = words.map((_, w) => words.slice(0, w).reduce((n, word) => n + word.length, 0));
  return {
    text,
    words: words.map((word, w) => ({
      word,
      last: w === words.length - 1,
      letters: Array.from(word).map((ch, c) => ({ ch, delay: start + (offsets[w]! + c) * LETTER_MS })),
    })),
  };
});

const ROLES = [
  "Field assistant",
  "Thesis supervisor",
  "Boat pilot",
  "Parataxonomist",
  "Plot technician",
  "Doctoral student",
  "Camp cook",
  "Herbarium curator",
  "Visiting researcher",
  "Translator",
  "Data manager",
  "Mateiro",
] as const;

const RAIL: readonly RailPhoto[] = [
  {
    src: "camp",
    alt: "A black-and-white photograph of a research camp of tents in a cleared area of the Amazon forest.",
    place: "The camp",
    caption: "Where students, mateiros and cooks lived for weeks at a time. Rarely in a paper's author list.",
  },
  {
    src: "canopy",
    alt: "Looking down from a canopy walkway into the crowns of tall rainforest trees.",
    place: "The canopy",
    caption: "Towers and walkways built and climbed by people whose names live only in field notebooks.",
    tall: true,
  },
  {
    src: "river",
    alt: "An aerial view of a dark river winding between islands of dense forest.",
    place: "The river",
    caption: "The boat pilots who brought every team in and out, season after season.",
  },
  {
    src: "flooded",
    alt: "Flooded forest with thin trunks standing in still water.",
    place: "The igapó",
    caption: "Plots measured by hand, tree by tree, year after year — often by the same people for decades.",
    tall: true,
  },
  {
    src: "mist",
    alt: "A misty, black-and-white view of a rainforest stream at dawn.",
    place: "The long run",
    caption: "Generations of students passed through. Who taught whom is the thread this record keeps.",
  },
];

const GAP = [
  { who: "ORCID", what: "records who you are." },
  { who: "Crossref, OpenAlex", what: "record what you published." },
  { who: "Nothing", what: "records who you did it with, who taught you, and where you all were.", isGap: true },
] as const;

const STEPS = [
  { title: "Bring your graduate list", body: "A spreadsheet with names, degrees, programmes and years. Nothing else is needed to start." },
  { title: "We find the documented trail", body: "Each name is matched to public research records, with the reason shown. A person decides every match." },
  { title: "Graduates confirm or correct", body: "Each graduate gets a private link to confirm where they went, correct it, or ask to be left out." },
  { title: "Outcomes you can publish", body: "Where your graduates went, by sector, country and decade. Exportable, and publishable with no names on it." },
] as const;

const RULES = [
  {
    title: "Documented, not declared",
    body: "Every link between two people exists because something documents it — a thesis, an overlapping affiliation, a project record. Nobody adds a connection with a click, and every connection opens to its sources.",
  },
  {
    title: "People who are not users",
    body: "Technicians, field assistants, the retired and the dead belong in the record as much as anyone. A person's page exists before they ever sign in.",
  },
  {
    title: "Known and guessed never blur",
    body: "The system may propose; only a person confirms. A proposal is always labelled, always explained, and changes nothing until someone accepts it. Nothing is ranked.",
  },
] as const;

const CREDITS = [
  { what: "Aerial view of the Amazon rainforest", who: "lubasi", licence: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_the_Amazon_Rainforest.jpg" },
  { what: "Amazon rainforest from the ISS", who: "Alexander Gerst / ESA", licence: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Amazon_rainforest_(Satellite_picture)_-_3.jpg" },
  { what: "Camp in a cleared area of the Amazon forest", who: "José Rosael, Hélio Nobre / Museu Paulista da USP", licence: "Public domain", url: "https://commons.wikimedia.org/wiki/File:Acampamento_em_%C3%81rea_Devassada_da_Floresta_Amaz%C3%B4nica_-_813,_Acervo_do_Museu_Paulista_da_USP.jpg" },
  { what: "ACTS canopy walkway", who: "Jason Hollinger", licence: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:ACTS_Canopy_Walkway_-_Flickr_-_pellaea_(3).jpg" },
  { what: "Amazon from the air", who: "Neil Palmer / CIAT", licence: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Amazon_CIAT_(3).jpg" },
  { what: "Clouds over the Amazon", who: "Neil Palmer / CIAT", licence: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Amazon_CIAT_(5).jpg" },
  { what: "Floresta Amazônica, Iranduba", who: "Alcimar Nascimento", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Floresta_Amaz%C3%B4nica_-_Iranduba.jpeg" },
  { what: "Floresta amazônica", who: "Djalma Armelin", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Floresta_amaz%C3%B4nica.jpg" },
] as const;

const pill =
  "nk-fill inline-flex items-center justify-center rounded-full px-7 py-4 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-lime focus-visible:ring-offset-2 focus-visible:ring-offset-nk-ink";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en");

export default async function HomePage() {
  const nodes = await listNodes();
  return (
    <main id="main-content" tabIndex={-1} data-motion="on" className="nk-motion flex-1 overflow-x-clip bg-nk-ink text-nk-bone">
      <Preloader />
      <Cursor />
      <SmoothScroll />
      <MotionToggle />

      {/* Hero: the forest, full bleed, with the question over it. */}
      <section data-theme="dark" className="relative isolate flex min-h-[calc(100svh-4.5rem)] flex-col justify-between overflow-hidden px-6 pb-10 pt-10 sm:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- self-hosted hero photo with srcset */}
          <img
            src="/photos/aerial-1920.jpg"
            srcSet="/photos/aerial-960.jpg 960w, /photos/aerial-1920.jpg 1920w"
            sizes="100vw"
            alt=""
            className="nk-hero-photo size-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,14,0.6)_0%,rgba(17,20,14,0.35)_40%,rgba(17,20,14,0.92)_100%)]" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-nk-bone">
          <p className="flex items-center gap-3">
            <span aria-hidden="true" className="nk-live-dot" />
            {SITE_NAME} — the people behind science, one Node at a time
          </p>
          <Link href="/nodes" className="hidden rounded-full bg-nk-ink/70 px-3 py-1 backdrop-blur hover:text-nk-lime sm:block">
            {nodes.length} {nodes.length === 1 ? "Node" : "Nodes"} on the engine
          </Link>
        </div>

        <h1
          aria-label={HEADLINE.join(" ")}
          className="my-12 font-display text-[clamp(2.4rem,9.6vw,13rem)] font-bold leading-[0.92] tracking-[-0.035em]"
        >
          {HEADLINE_LINES.map((line) => (
            <span key={line.text} aria-hidden="true" className="nk-line">
              {line.words.map((w) => (
                <span key={w.word} className="inline-block whitespace-nowrap">
                  {w.letters.map((l) => (
                    <span key={l.delay} className="nk-letter" style={{ animationDelay: `${l.delay}ms` }}>
                      {l.ch}
                    </span>
                  ))}
                  {w.last ? null : " "}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <p className="text-lg text-nk-bone sm:text-xl">
              A reading record of scientific lives, the institutions they worked through, and the
              contributions they made — each with its history, its sources, and its honest gaps.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" data-magnetic className={cn(pill, "bg-nk-lime text-nk-ink [--nk-fill:var(--nk-bone)]")}>
                Create an account to read
              </Link>
              <Link
                href="/login"
                data-magnetic
                className={cn(pill, "border border-nk-bone/40 bg-nk-ink/60 text-nk-bone backdrop-blur [--nk-fill:var(--nk-lime)]")}
              >
                Sign in
              </Link>
            </div>
          </div>
          <p aria-hidden="true" className="hidden items-center gap-3 text-sm text-nk-bone sm:flex">
            Scroll
            <span className="relative block h-12 w-px overflow-hidden bg-nk-bone/30">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[nk-scrollcue_1.6s_ease-in-out_infinite] bg-nk-lime" />
            </span>
          </p>
        </div>
      </section>

      {/* Ribbon of roles the record keeps. Decorative; the roles are named in the captions too. */}
      <div aria-hidden="true" className="nk-ribbon border-y border-nk-ink-3 py-6">
        <div className="nk-ribbon-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center">
              {ROLES.map((role, i) => (
                <span
                  key={`${copy}-${role}`}
                  className={cn("flex items-center font-display text-4xl font-bold tracking-tight sm:text-6xl", i % 2 === 1 ? "nk-outline" : "text-nk-bone")}
                >
                  <span className="px-8">{role}</span>
                  <span className="size-3 rounded-full bg-nk-lime" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* The Nodes: one engine, many institutions. */}
      <section aria-labelledby="nodes-heading" className="px-6 py-24 sm:px-10 sm:py-36">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-nk-lime">The Nodes</p>
            <h2 id="nodes-heading" className="mt-4 font-display text-4xl font-bold leading-[1] tracking-[-0.025em] sm:text-6xl">
              One engine. Each institution, its own Node.
            </h2>
          </div>
          <p className="max-w-xl text-lg text-[#c3c8b6]">
            A Node is a research institution, a field project or a museum, with its own people, history and stewards. All
            Nodes share one record, so a person who passed through two of them is one person with one history.
          </p>
        </div>
        <ul className="mt-14 grid gap-5 md:grid-cols-2">
          {nodes.map((n) => (
            <li key={n.slug} className="flex flex-col justify-between rounded-3xl border border-nk-ink-3 bg-nk-ink-2 p-8">
              <div>
                <p className="text-sm text-nk-moss">{n.plan === "pro_bono" ? "Conservation research — pro bono" : "Institutional plan"}</p>
                <h3 className="mt-3 font-display text-4xl font-bold tracking-tight">{nodeLabel(n)}</h3>
                <p className="mt-1 text-nk-bone">{n.name}</p>
                {n.tagline ? <p className="mt-4 text-[#c3c8b6]">{n.tagline}</p> : null}
              </div>
              <div className="mt-8">
                <dl className="grid grid-cols-3 gap-4 border-t border-nk-ink-3 pt-6">
                  {[
                    { v: n.counts.people, l: "people" },
                    { v: n.counts.institutions, l: "institutions" },
                    { v: n.counts.works, l: "works" },
                  ].map((c) => (
                    <div key={c.l}>
                      <dt className="font-display text-3xl font-bold tabular-nums [font-stretch:85%]">{nf.format(c.v)}</dt>
                      <dd className="text-sm text-nk-moss">{c.l}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
                  <Link href={`/n/${n.slug}`} className="underline decoration-nk-lime decoration-2 underline-offset-[6px]">
                    Open {nodeLabel(n)}
                  </Link>
                  <Link href={`/n/${n.slug}/observatory`} className="underline decoration-2 underline-offset-[6px]">
                    Observatory
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-lg">
          <Link href="/compare" className="font-semibold underline decoration-2 underline-offset-[6px]">
            Compare Nodes
          </Link>
          <Link href="/plans" className="font-semibold underline decoration-2 underline-offset-[6px]">
            Bring your institution
          </Link>
        </div>
      </section>

      {/* Statement that lights up word by word, over the forest. */}
      <section aria-label="Why this exists" className="relative isolate overflow-hidden px-6 py-32 sm:px-10 sm:py-48">
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-30">
          <RevealImage src="clouds" alt="" className="size-full" drift={120} sizes="100vw" />
        </div>
        <LitStatement
          className="relative max-w-6xl font-display text-[clamp(1.8rem,4.4vw,4.8rem)] font-bold leading-[1.06] tracking-[-0.02em]"
          text="Everyone records the paper. Nobody records the people who were there — the field assistant who knew every plot, the boat pilot, the supervisor, the student who stayed for a season and left for good."
        />
      </section>

      {/* Photos travel sideways: the places, and who worked there. */}
      <PhotoRail
        photos={RAIL}
        heading={
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="rail-heading" className="max-w-[14ch] font-display text-4xl font-bold leading-[0.98] tracking-tight sm:text-7xl">
              Who was there
            </h2>
            <p className="max-w-md text-lg text-[#c3c8b6]">Every place in this forest had people in it. The record starts with them.</p>
          </div>
        }
      />

      {/* The gap, on bone. */}
      <section aria-labelledby="gap-heading" className="bg-nk-bone px-6 py-24 text-nk-ink sm:px-10 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <h2 id="gap-heading" className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
            The missing line in the record of science
          </h2>
          <dl className="border-t-2 border-nk-ink">
            {GAP.map((row) => (
              <div
                key={row.who}
                className={cn(
                  "grid gap-2 py-7 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8",
                  "isGap" in row ? "-mx-4 rounded-2xl bg-nk-lime px-4" : "border-b border-nk-bone-2",
                )}
              >
                <dt className={cn("text-sm", "isGap" in row ? "font-semibold" : "text-[#4f5446]")}>{row.who}</dt>
                <dd className={cn("font-display text-2xl leading-snug tracking-tight sm:text-3xl", "isGap" in row ? "font-bold" : "font-medium")}>
                  {row.what}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The lineage draws itself. */}
      <div data-theme="dark" className="px-6 sm:px-10">
        <LineageScrub />
      </div>

      {/* Onward: steps travel sideways. */}
      <HorizontalSteps
        steps={STEPS}
        intro={
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold">For universities</p>
              <h2 id="onward-heading" className="mt-3 max-w-[16ch] font-display text-4xl font-bold leading-[0.98] tracking-tight sm:text-7xl">
                Know where your graduates went.
              </h2>
            </div>
            <p className="max-w-md text-lg">
              Not a survey few people return: Onward builds it from the documented record, and lets every graduate check it.
            </p>
          </div>
        }
      />

      {/* Rules stack as you scroll. */}
      <section aria-labelledby="rules-heading" className="bg-nk-bone px-6 py-24 text-nk-ink sm:px-10 sm:py-32">
        <h2 id="rules-heading" className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Three things that do not change
        </h2>
        <div className="mt-12">
          {RULES.map((rule, i) => (
            <article
              key={rule.title}
              className="sticky mb-6 grid gap-6 rounded-3xl border border-nk-bone-2 bg-white p-8 shadow-[0_-10px_40px_-20px_rgba(17,20,14,0.25)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:p-12"
              style={{ top: `${6 + i * 2}rem` }}
            >
              <h3 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{rule.title}</h3>
              <p className="text-lg text-[#3d4136]">{rule.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-lg">
          <Link href="/programmes" className="font-semibold underline decoration-2 underline-offset-[6px]">
            Published programme pages
          </Link>
          <Link href="/p" className="font-semibold underline decoration-2 underline-offset-[6px]">
            Public person pages
          </Link>
        </div>
      </section>

      {/* Closing. */}
      <section data-theme="dark" aria-labelledby="close-heading" className="px-6 pt-28 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <h2 id="close-heading" className="font-display text-[clamp(3rem,9vw,11rem)] font-bold leading-[0.9] tracking-[-0.04em] [font-stretch:85%]">
            <span className="nk-stretch">Find</span> <span className="nk-stretch">your</span>
            <br />
            <span className="nk-stretch text-nk-lime">people.</span>
          </h2>
          <Link
            href="/register"
            data-magnetic
            className="nk-fill grid size-44 shrink-0 place-items-center rounded-full bg-nk-lime p-6 text-center font-display text-lg font-bold leading-tight text-nk-ink [--nk-fill:var(--nk-bone)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-bone sm:size-56 sm:text-xl"
          >
            Create your account
          </Link>
        </div>
        <p className="mt-12 max-w-2xl text-[#c3c8b6]">
          Reading requires a free account. Conservation research institutions use the engine free of charge;
          universities, research centres and museums subscribe. Everything in the record has a source.
        </p>

        <footer className="mt-24 border-t border-nk-ink-3 pt-8">
          <div className="flex flex-wrap items-start justify-between gap-8 text-sm text-nk-moss">
            <p>{SITE_NAME}</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-6">
              <Link href="/nodes" className="hover:text-nk-bone">
                Nodes
              </Link>
              <Link href="/plans" className="hover:text-nk-bone">
                Plans
              </Link>
              <Link href="/programmes" className="hover:text-nk-bone">
                Programmes
              </Link>
              <Link href="/p" className="hover:text-nk-bone">
                Public pages
              </Link>
              <Link href="/login" className="hover:text-nk-bone">
                Log in
              </Link>
              <Link href="/register" className="hover:text-nk-bone">
                Register
              </Link>
            </nav>
          </div>
          <details className="mt-8 text-sm text-nk-moss">
            <summary className="cursor-pointer hover:text-nk-bone">Photo credits</summary>
            <span className="mt-3 flex flex-col gap-1.5">
              {CREDITS.map((c) => (
                <a key={c.url} href={c.url} className="hover:text-nk-bone" rel="noreferrer" target="_blank">
                  {c.what} — {c.who}, {c.licence}, via Wikimedia Commons
                </a>
              ))}
            </span>
          </details>
          <p
            aria-hidden="true"
            className="nk-outline mt-10 select-none whitespace-nowrap font-display text-[8.4vw] font-extrabold leading-[0.8] tracking-[-0.045em] [--nk-stroke-w:2px] [--nk-stroke:var(--nk-moss)] [font-stretch:80%]"
          >
            NODES OF KNOWLEDGE
          </p>
        </footer>
      </section>
    </main>
  );
}
