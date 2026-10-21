import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

// Public landing -- the front door (docs/PRODUTO.md). One screen says what the
// product is (the line nobody records: who you did it with, who taught you,
// where you all were); below it, what an institution gets (Onward: graduate
// outcomes from a documented record), and the rules that never change.
//
// Motion is CSS only (ADR-0005) and only moves things -- it never hides text,
// so nothing is unreadable mid-animation; prefers-reduced-motion removes it
// (globals.css). Quiet by design: no statistics, no feed, no ranking.
//
// Statically rendered (no cookies()/Supabase call).

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

const PROPERTIES = [
  {
    title: "Documented, not declared",
    body: "Every link between two people exists because something documents it — a thesis, an overlapping affiliation, a project record. Nobody adds a connection with a click, and every connection can be opened to its sources.",
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

// A small, decorative drawing of a documented network: dots are people, lines
// are documented links that draw themselves in. Fixed coordinates, no data.
const NODES = [
  [40, 120], [110, 60], [150, 150], [230, 90], [290, 170], [330, 50], [400, 120], [470, 70], [520, 160],
] as const;
const LINKS = [
  [0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [3, 4], [4, 6], [5, 6], [6, 7], [6, 8], [7, 8],
] as const;

function NetworkDrawing() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 560 210"
      className="home-network mt-14 h-auto w-full max-w-3xl text-muted-foreground"
    >
      {LINKS.map(([a, b], i) => {
        const from = NODES[a];
        const to = NODES[b];
        if (!from || !to) return null;
        return (
          <line
            key={`${a}-${b}`}
            x1={from[0]}
            y1={from[1]}
            x2={to[0]}
            y2={to[1]}
            pathLength={1}
            className="home-network-link"
            style={{ animationDelay: `${150 + i * 90}ms` }}
          />
        );
      })}
      {NODES.map(([x, y], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={i === 3 || i === 6 ? 7 : 5}
          className={i === 3 || i === 6 ? "home-network-node is-accent" : "home-network-node"}
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </svg>
  );
}

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-6 py-20 sm:py-28">
      <Container width="content" padded={false}>
        <div className="home-rise">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{SITE_NAME}</p>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Who you did it with. Who taught you. Where you all were.
          </h1>
        </div>

        <div className="home-rise" style={{ animationDelay: "80ms" }}>
          <p className="mt-6 max-w-prose text-base text-foreground sm:text-lg">
            A reading record of scientific lives, the institutions they worked through, and the
            contributions they made — each with its history, its sources, and its honest gaps.
          </p>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">{SITE_DESCRIPTION}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className={buttonVariants({ emphasis: "primary", size: "md" })}>
              Create an account to read
            </Link>
            <Link href="/login" className={buttonVariants({ emphasis: "secondary", size: "md" })}>
              Sign in
            </Link>
            <Link
              href="/programmes"
              className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              See published programmes
            </Link>
          </div>
        </div>

        <NetworkDrawing />

        <section aria-labelledby="gap-heading" className="mt-16">
          <h2 id="gap-heading" className="text-sm font-medium text-foreground">
            The missing line in the record of science
          </h2>
          <dl className="mt-4 border-t border-border-default">
            {GAP.map((row) => (
              <div
                key={row.who}
                className={
                  "grid gap-1 border-b py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 " +
                  ("isGap" in row ? "border-accent" : "border-border-default")
                }
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.who}</dt>
                <dd className={"isGap" in row ? "font-semibold text-foreground" : "text-foreground"}>{row.what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="onward-heading" className="mt-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">For universities</p>
          <h2 id="onward-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Know where your graduates went — and show it honestly.
          </h2>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            Programmes are asked where their graduates went, and the answer is usually a survey few
            people return. Onward builds it from the documented record instead, and lets every
            graduate check it.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="home-step rounded-md border border-border-default bg-surface px-4 py-4">
                <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/programmes" className="text-foreground underline underline-offset-4">
              Published programme pages
            </Link>
            <Link href="/p" className="text-foreground underline underline-offset-4">
              Public person pages
            </Link>
          </div>
        </section>

        <section aria-labelledby="properties-heading" className="mt-20">
          <h2 id="properties-heading" className="text-sm font-medium text-foreground">
            Three things that do not change
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {PROPERTIES.map((property) => (
              <div key={property.title} className="home-step rounded-md border border-border-default bg-surface px-4 py-4">
                <h3 className="text-sm font-semibold text-foreground">{property.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{property.body}</p>
              </div>
            ))}
          </div>
        </section>

        <Alert tone="neutral" className="mt-16">
          This platform is under development. Reading requires a free account, and the record
          currently holds demonstration data only.
        </Alert>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border-default pt-6 text-xs text-muted-foreground">
          <p>
            {SITE_NAME} · a Node of Nodes of Knowledge
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/programmes" className="hover:text-foreground">Programmes</Link>
            <Link href="/p" className="hover:text-foreground">Public pages</Link>
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </nav>
        </footer>
      </Container>
    </main>
  );
}
