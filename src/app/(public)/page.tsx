import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

// Public landing -- the front door (docs/PRODUTO.md). Says in one screen what
// the product is: the third line nobody records (who you did it with, who
// taught you, where you all were), and the three properties that separate it
// from everything adjacent. Quiet by design: no statistics, no metrics, no
// feed. Reading itself is still authenticated (deny-by-default security is
// unchanged), so the entrance is honest that a free account is needed.
//
// Statically rendered (no cookies()/Supabase call).

const GAP = [
  { who: "ORCID", what: "records who you are." },
  { who: "Crossref, OpenAlex", what: "record what you published." },
  { who: "Nothing", what: "records who you did it with, who taught you, and where you all were.", isGap: true },
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

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-6 py-20 sm:py-28">
      <Container width="content" padded={false}>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{SITE_NAME}</p>

        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Who you did it with. Who taught you. Where you all were.
        </h1>

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
        </div>

        <section aria-labelledby="gap-heading" className="mt-20">
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

        <section aria-labelledby="properties-heading" className="mt-16">
          <h2 id="properties-heading" className="text-sm font-medium text-foreground">
            Three things that do not change
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {PROPERTIES.map((property) => (
              <div key={property.title} className="rounded-md border border-border-default bg-surface px-4 py-4">
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
      </Container>
    </main>
  );
}
