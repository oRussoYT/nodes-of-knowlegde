import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { LineageScrub } from "@/features/home/LineageScrub";
import { cn } from "@/lib/ui/cn";

// Public landing -- the front door (docs/PRODUTO.md). Built around one
// orchestrated moment (a lineage that draws itself as you scroll) with the
// headline rising in on load. Display type is Archivo, whose width axis is
// part of the identity; everything around it stays quiet. Motion never hides
// readable text and disappears under prefers-reduced-motion (globals.css).
//
// Statically rendered (no cookies()/Supabase call). The example record and
// the lineage are fictional and say so.

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
    body: "Each name is matched to public research records, with the reason shown. A person decides every match — nothing is accepted automatically.",
  },
  {
    title: "Graduates confirm or correct",
    body: "Each graduate gets a private link to confirm where they went, correct it, or ask to be left out. Their answer wins.",
  },
  {
    title: "Outcomes you can publish",
    body: "Where your graduates went, by sector, country and decade — exportable, and publishable as a programme page with no names on it.",
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

// The fictional example record in the hero: lanes are periods at an
// institution, positioned on a 1985–2026 axis (percent of width).
const EXAMPLE_LANES = [
  { place: "Alpha Station", spans: [{ left: 4, width: 16, delay: 600 }, { left: 34, width: 66, delay: 1100 }] },
  { place: "Beta Institute", spans: [{ left: 18, width: 14, delay: 800 }] },
  { place: "Coastal Lab", spans: [{ left: 28, width: 5, delay: 1000, faint: true }] },
] as const;

const fillButton = "nk-fill rounded-full px-6 py-3 text-[15px]";

function ExampleRecord() {
  return (
    <figure className="min-w-0 rounded-2xl border border-border-default bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="size-10 shrink-0 rounded-full bg-accent/85" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Helena A. Costa</p>
          <p className="text-sm text-muted-foreground">Ecologist, fictional example</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2.5" aria-hidden="true">
        {EXAMPLE_LANES.map((lane) => (
          <div key={lane.place} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{lane.place}</span>
            <span className="relative h-3 rounded-sm bg-surface-sunken">
              {lane.spans.map((span) => (
                <span
                  key={span.left}
                  className={cn("nk-bar absolute inset-y-0 rounded-sm bg-accent", "faint" in span && span.faint && "opacity-50")}
                  style={{ left: `${span.left}%`, width: `${span.width}%`, animationDelay: `${span.delay}ms` }}
                />
              ))}
            </span>
          </div>
        ))}
        <div className="ml-[calc(7rem+0.75rem)] flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>1985</span>
          <span>2005</span>
          <span>2026</span>
        </div>
      </div>
      <figcaption className="mt-5 border-t border-border-default pt-4 text-sm">
        <span className="text-muted-foreground">Documented alongside her in 1989</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {["Ana Ribeiro", "José Camargo", "Rui Moreira", "and 2 more"].map((name) => (
            <span key={name} className="rounded-full border border-border-default bg-background px-2.5 py-0.5 text-foreground">
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
    <main id="main-content" tabIndex={-1} className="flex-1">
      {/* Hero */}
      <section className="px-6 pb-16 pt-16 sm:pt-24">
        <Container width="shell" padded={false}>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span aria-hidden="true" className="nk-live-dot" />
                {SITE_NAME}, demonstration data
              </p>
              <h1 className="mt-5 max-w-[17ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-[-0.025em] text-foreground sm:text-6xl">
                {HEADLINE.map((text, i) => (
                  <span key={text} className="nk-line">
                    <span style={{ animationDelay: `${i * 120}ms` }}>{text}</span>
                  </span>
                ))}
              </h1>
              <p className="mt-7 max-w-[52ch] text-lg text-muted-foreground">
                A reading record of scientific lives, the institutions they worked through, and the
                contributions they made — each with its history, its sources, and its honest gaps.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className={cn(buttonVariants({ emphasis: "primary", size: "md" }), fillButton)}>
                  Create an account to read
                </Link>
                <Link href="/login" className={cn(buttonVariants({ emphasis: "secondary", size: "md" }), fillButton)}>
                  Sign in
                </Link>
              </div>
            </div>
            <ExampleRecord />
          </div>
        </Container>
      </section>

      {/* Roles the record keeps -- decorative; the same roles are named in the text below. */}
      <div aria-hidden="true" className="nk-ribbon border-y border-border-default py-4">
        <div className="nk-ribbon-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center">
              {ROLES.map((role) => (
                <span key={`${copy}-${role}`} className="flex items-center font-display text-xl font-medium text-foreground sm:text-2xl">
                  <span className="px-6">{role}</span>
                  <span className="text-accent">✳</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* The gap */}
      <section aria-labelledby="gap-heading" className="px-6 py-24">
        <Container width="shell" padded={false}>
          <h2 id="gap-heading" className="max-w-[22ch] font-display text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
            Everyone records the paper. Nobody records the people.
          </h2>
          <dl className="mt-10 border-t-2 border-foreground">
            {GAP.map((row) => (
              <div
                key={row.who}
                className={cn(
                  "grid gap-1 py-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8",
                  "isGap" in row ? "border-b-2 border-accent" : "border-b border-border-default",
                )}
              >
                <dt className={cn("text-sm", "isGap" in row ? "font-semibold text-accent" : "text-muted-foreground")}>
                  {row.who}
                </dt>
                <dd className={cn("font-display text-xl leading-snug tracking-tight sm:text-2xl", "isGap" in row ? "font-bold" : "font-medium")}>
                  {row.what}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-prose text-sm text-muted-foreground">{SITE_DESCRIPTION}.</p>
        </Container>
      </section>

      {/* The orchestrated moment */}
      <div className="px-6">
        <Container width="shell" padded={false}>
          <LineageScrub />
        </Container>
      </div>

      {/* For universities */}
      <section aria-labelledby="onward-heading" className="bg-foreground px-6 py-24 text-background">
        <Container width="shell" padded={false}>
          <p className="text-sm opacity-80">For universities</p>
          <h2 id="onward-heading" className="mt-3 max-w-[20ch] font-display text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Know where your graduates went, and show it honestly.
          </h2>
          <p className="mt-5 max-w-[60ch] text-lg opacity-85">
            Programmes are asked where their graduates went, and the answer is usually a survey few people
            return. Onward builds it from the documented record instead, and lets every graduate check it.
          </p>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-background/20 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-foreground p-6">
                <p className="font-display text-4xl font-bold tabular-nums text-accent-muted [font-stretch:80%]">{i + 1}</p>
                <h3 className="mt-6 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm opacity-80">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/programmes" className="font-medium underline decoration-2 underline-offset-[6px]">
              Published programme pages
            </Link>
            <Link href="/p" className="font-medium underline decoration-2 underline-offset-[6px]">
              Public person pages
            </Link>
          </div>
        </Container>
      </section>

      {/* Rules */}
      <section aria-labelledby="rules-heading" className="px-6 py-24">
        <Container width="shell" padded={false}>
          <h2 id="rules-heading" className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
            Three things that do not change
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-10 border-t border-border-default pt-10 md:grid-cols-3">
            {RULES.map((rule) => (
              <div key={rule.title}>
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground">{rule.title}</h3>
                <p className="mt-3 text-muted-foreground">{rule.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Closing */}
      <section aria-labelledby="close-heading" className="border-t border-border-default px-6 pb-12 pt-24">
        <Container width="shell" padded={false}>
          <h2
            id="close-heading"
            className="font-display text-5xl font-bold leading-none tracking-[-0.03em] text-foreground [font-stretch:85%] sm:text-7xl"
          >
            <span className="nk-stretch">Find</span> <span className="nk-stretch">your</span>{" "}
            <span className="nk-stretch text-accent">people.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/register" className={cn(buttonVariants({ emphasis: "primary", size: "md" }), fillButton)}>
              Create your account
            </Link>
            <Link href="/programmes" className={cn(buttonVariants({ emphasis: "secondary", size: "md" }), fillButton)}>
              See published programmes
            </Link>
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            This platform is under development. Reading requires a free account, and the record currently
            holds demonstration data only.
          </p>

          <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border-default pt-6 text-sm text-muted-foreground">
            <p>{SITE_NAME}, a Node of Nodes of Knowledge</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-5">
              <Link href="/programmes" className="hover:text-foreground">
                Programmes
              </Link>
              <Link href="/p" className="hover:text-foreground">
                Public pages
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
              <Link href="/register" className="hover:text-foreground">
                Register
              </Link>
            </nav>
          </footer>
        </Container>
      </section>
    </main>
  );
}
