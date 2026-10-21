import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isDevOnlyRouteBlocked } from "@/lib/dev-only-route";

import { Alert } from "@/components/ui/Alert";
import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Surface } from "@/components/ui/Surface";

import {
  type ExhibitionLink,
  exhibitionCopy,
  exhibitionJourneys,
  exhibitionSections,
} from "./content";

// Internal-only, development-time doorway into every completed M6 engine
// (see docs/m6-system-exhibition.md). It links to a fictional world loaded
// by supabase/seeds/m6_exhibition.sql; it is a development aid, not a
// product feature, and follows the same production-exclusion contract as
// src/app/dev/design-system/page.tsx:
//   1. NOT LINKED from any product page, nav, or sitemap (only a
//      dev-to-dev link from /dev/design-system references it).
//   2. RUNTIME-BLOCKED — isDevOnlyRouteBlocked() returns true for anything
//      other than NODE_ENV=development, and this component then calls
//      notFound(), returning a real 404 status.
//   3. It still appears in the build route manifest (a documented App
//      Router limitation, identical to the design-system route); the
//      robots metadata below keeps it out of any index if that 404
//      enforcement were ever bypassed.
export const metadata: Metadata = {
  title: "M6 system exhibition (dev only)",
  robots: { index: false, follow: false },
};

function LinkList({ links }: { links: ExhibitionLink[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {links.map((link) => (
        <li key={`${link.href}::${link.label}`}>
          <Link
            href={link.href}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {link.label}
          </Link>
          {link.note ? (
            <span className="mt-0.5 block text-sm text-muted-foreground">{link.note}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function ExhibitionDevPage() {
  if (isDevOnlyRouteBlocked(process.env.NODE_ENV)) {
    notFound();
  }

  return (
    <Container width="shell">
      <Section spacing="lg">
        <PageHeader
          title={exhibitionCopy.title}
          description={exhibitionCopy.intro}
        />
      </Section>

      <Section spacing="sm">
        <Alert tone="info" title="Fictional development data">
          {exhibitionCopy.fictionalNotice}
        </Alert>
        <p className="mt-4 text-sm text-muted-foreground">
          Looking for the normal reading experience? Enter the application at{" "}
          <Link
            href={exhibitionCopy.exploreHref}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Explore
          </Link>
          . This page is for engineering inspection.
        </p>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Start here — guided journeys</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated paths through the system, as a reader would experience it. These are links and
          explanatory copy only.
        </p>
        {exhibitionJourneys.map((journey) => (
          <div key={journey.id} className="mt-6">
            <h3 className="text-base font-semibold text-foreground">{journey.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{journey.description}</p>
            <ol className="mt-3 space-y-3">
              {journey.steps.map((step, index) => (
                <li key={`${step.href}::${step.label}`}>
                  <span className="text-sm text-muted-foreground">{index + 1}. </span>
                  <Link
                    href={step.href}
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    {step.label}
                  </Link>
                  {step.note ? (
                    <span className="mt-0.5 block text-sm text-muted-foreground">{step.note}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </Section>

      <Divider />

      {exhibitionSections.map((section) => (
        <Section key={section.id} spacing="md">
          <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
          {section.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          ) : null}
          <LinkList links={section.links} />
          {section.id === "reviewer-auth" ? (
            <p className="mt-4 text-sm text-muted-foreground">{exhibitionCopy.authNote}</p>
          ) : null}
        </Section>
      ))}

      <Divider />

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Reset instructions</h2>
        <p className="mt-1 text-sm text-muted-foreground">{exhibitionCopy.resetIntro}</p>
        <Surface bordered rounded className="mt-4 p-4">
          {/* Keyboard-focusable so the horizontally-scrollable region is
              reachable and scrollable without a mouse (axe
              scrollable-region-focusable); labelled so its purpose is
              announced on focus. */}
          <pre
            tabIndex={0}
            aria-label="Commands to reset and open the exhibition"
            className="overflow-x-auto text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <code>
              {exhibitionCopy.resetCommands.join("\n")}
              {"\n# then open:\n"}
              {exhibitionCopy.url}
            </code>
          </pre>
        </Surface>
      </Section>

      <Section spacing="sm">
        <p className="text-sm text-muted-foreground">
          Related dev route:{" "}
          <Link
            href={exhibitionCopy.designSystemHref}
            className="font-medium text-foreground underline underline-offset-2"
          >
            design-system foundations
          </Link>
          .
        </p>
      </Section>
    </Container>
  );
}
