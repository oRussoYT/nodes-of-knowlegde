import Link from "next/link";

import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { Cursor } from "@/features/home/Cursor";
import { HorizontalSteps } from "@/features/home/HorizontalSteps";
import { LineageScrub } from "@/features/home/LineageScrub";
import { LitStatement } from "@/features/home/LitStatement";
import { Preloader } from "@/features/home/Preloader";
import { cn } from "@/lib/ui/cn";

// Public landing -- the front door (docs/PRODUTO.md), in the spirit of a
// racing driver's site: ink and bone bands, a lime signal, display type that
// fills the width, an opening counter, a trailing cursor, magnetic buttons,
// words that light up as you scroll, a lineage that draws itself, steps that
// travel sideways, rules that stack, and a closing wordmark edge to edge.
//
// The page keeps a fixed palette (theme-independent); ink bands carry
// data-theme="dark" so any shared component inside reads the dark tokens.
// Motion never leaves text unreadable and disappears with reduced motion.
// Statically rendered. The example record and the lineage are fictional.

const HEADLINE = ["Who you did it with.", "Who taught you.", "Where you all were."] as const;

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

const GAP = [
  { who: "ORCID", what: "records who you are." },
  { who: "Crossref, OpenAlex", what: "record what you published." },
  { who: "Nothing", what: "records who you did it with, who taught you, and where you all were.", isGap: true },
] as const;

const STEPS = [
  {
    title: "Bring your graduate list",
    body: "A spreadsheet with names, degrees, programmes and years. Nothing else is needed to start.",
  },
  {
    title: "We find the documented trail",
    body: "Each name is matched to public research records, with the reason shown. A person decides every match.",
  },
  {
    title: "Graduates confirm or correct",
    body: "Each graduate gets a private link to confirm where they went, correct it, or ask to be left out. Their answer wins.",
  },
  {
    title: "Outcomes you can publish",
    body: "Where your graduates went, by sector, country and decade. Exportable, and publishable with no names on it.",
  },
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

const EXAMPLE_LANES = [
  { place: "Alpha Station", spans: [{ left: 4, width: 16, delay: 1500 }, { left: 34, width: 66, delay: 1900 }] },
  { place: "Beta Institute", spans: [{ left: 18, width: 14, delay: 1700 }] },
  { place: "Coastal Lab", spans: [{ left: 28, width: 5, delay: 1800 }] },
] as const;

const pill =
  "nk-fill inline-flex items-center justify-center rounded-full px-7 py-4 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-lime focus-visible:ring-offset-2 focus-visible:ring-offset-nk-ink";

function ExampleRecord() {
  return (
    <figure className="w-full max-w-md rounded-3xl border border-nk-ink-3 bg-nk-ink-2 p-6 text-nk-bone">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="size-11 shrink-0 rounded-full bg-nk-lime" />
        <div className="min-w-0">
          <p className="font-semibold">Helena A. Costa</p>
          <p className="text-sm text-nk-moss">Ecologist, fictional example</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3" aria-hidden="true">
        {EXAMPLE_LANES.map((lane) => (
          <div key={lane.place} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-xs text-nk-moss">
            <span className="truncate">{lane.place}</span>
            <span className="relative h-3 rounded-full bg-nk-ink-3">
              {lane.spans.map((span) => (
                <span
                  key={span.left}
                  className="nk-bar absolute inset-y-0 rounded-full bg-nk-lime"
                  style={{ left: `${span.left}%`, width: `${span.width}%`, animationDelay: `${span.delay}ms` }}
                />
              ))}
            </span>
          </div>
        ))}
        <div className="ml-[calc(6.5rem+0.75rem)] flex justify-between text-[11px] tabular-nums text-nk-moss">
          <span>1985</span>
          <span>2005</span>
          <span>2026</span>
        </div>
      </div>
      <figcaption className="mt-6 border-t border-nk-ink-3 pt-4 text-sm">
        <span className="text-nk-moss">Documented alongside her in 1989</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {["Ana Ribeiro", "José Camargo", "Rui Moreira", "and 2 more"].map((name) => (
            <span key={name} className="rounded-full border border-nk-ink-3 px-3 py-1">
              {name}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-clip bg-nk-ink text-nk-bone">
      <Preloader />
      <Cursor />

      {/* Hero: full screen, edge to edge. */}
      <section data-theme="dark" className="relative flex min-h-[calc(100svh-4.5rem)] flex-col justify-between px-6 pb-10 pt-12 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-nk-moss">
          <p className="flex items-center gap-3">
            <span aria-hidden="true" className="nk-live-dot" />
            <span className="text-nk-bone">{SITE_NAME}</span> — demonstration data
          </p>
          <p className="hidden sm:block">Forest fragments, Amazonia, since 1979</p>
        </div>

        <h1 className="my-10 font-display text-[clamp(2.4rem,7.6vw,10rem)] font-bold leading-[0.95] tracking-[-0.035em]">
          {HEADLINE.map((text, i) => (
            <span key={text} className="nk-line sm:whitespace-nowrap">
              <span style={{ animationDelay: `${1300 + i * 110}ms` }}>{text}</span>
            </span>
          ))}
        </h1>

        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-2xl">
            <p className="text-lg text-[#c3c8b6] sm:text-xl">
              A reading record of scientific lives, the institutions they worked through, and the
              contributions they made — each with its history, its sources, and its honest gaps.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                data-magnetic
                className={cn(pill, "bg-nk-lime text-nk-ink [--nk-fill:var(--nk-bone)]")}
              >
                Create an account to read
              </Link>
              <Link
                href="/login"
                data-magnetic
                className={cn(pill, "border border-nk-ink-3 text-nk-bone [--nk-fill:var(--nk-lime)]")}
              >
                Sign in
              </Link>
            </div>
          </div>
          <ExampleRecord />
        </div>
      </section>

      {/* Ribbon of roles the record keeps. Decorative; they are named below too. */}
      <div aria-hidden="true" className="nk-ribbon border-y border-nk-ink-3 py-6">
        <div className="nk-ribbon-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center">
              {ROLES.map((role, i) => (
                <span
                  key={`${copy}-${role}`}
                  className={cn(
                    "flex items-center font-display text-4xl font-bold tracking-tight sm:text-6xl",
                    i % 2 === 1 ? "nk-outline text-nk-bone" : "text-nk-bone",
                  )}
                >
                  <span className="px-8">{role}</span>
                  <span className="size-3 rounded-full bg-nk-lime" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Statement that lights up word by word. */}
      <section aria-label="Why this exists" className="px-6 py-28 sm:px-10 sm:py-40">
        <LitStatement
          className="max-w-6xl font-display text-[clamp(1.8rem,4.2vw,4.5rem)] font-bold leading-[1.08] tracking-[-0.02em]"
          text="Everyone records the paper. Nobody records the people who were there — the field assistant who knew every plot, the boat pilot, the supervisor, the student who stayed for a season and left for good."
        />
      </section>

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
              Not a survey few people return: Onward builds it from the documented record, and lets every
              graduate check it.
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
          <h2
            id="close-heading"
            className="font-display text-[clamp(3rem,9vw,11rem)] font-bold leading-[0.9] tracking-[-0.04em] [font-stretch:85%]"
          >
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
          This platform is under development. Reading requires a free account, and the record currently holds
          demonstration data only. {SITE_DESCRIPTION}.
        </p>

        <footer className="mt-24 border-t border-nk-ink-3 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-nk-moss">
            <p>{SITE_NAME}, a Node of Nodes of Knowledge</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-6">
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
          <p
            aria-hidden="true"
            className="nk-outline mt-10 select-none whitespace-nowrap font-display text-[15.2vw] font-extrabold leading-[0.8] tracking-[-0.045em] text-nk-moss [font-stretch:80%]"
          >
            NODES BDFFP
          </p>
        </footer>
      </section>
    </main>
  );
}
