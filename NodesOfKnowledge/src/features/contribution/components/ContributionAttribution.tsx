import Link from "next/link";

import { contributionCopy } from "../copy";
import { ContributionProvenance } from "./ContributionProvenance";

// One contributor's attribution, seen from the contribution: the actor (person
// or institution) as the headline (an h4 under the capacity group's h3), an
// optional historically precise note, and the attribution's OWN provenance
// (distinct from the contribution record's). The actor name links to its page
// (discovery). Every attribution, of every capacity, is given equal dignity --
// no share, no percentage, no rank. Server Component.
export interface ContributionAttributionProps {
  href: string;
  name: string;
  secondary?: string | null;
  attributionNote?: string | null;
  provenanceSubject: string;
  sourceLabel: string;
  statusLabel: string;
}

export function ContributionAttribution({
  href,
  name,
  secondary,
  attributionNote,
  provenanceSubject,
  sourceLabel,
  statusLabel,
}: ContributionAttributionProps) {
  return (
    <li className="border-l border-border-default pl-4">
      <h4 className="text-base font-medium text-foreground">
        <Link
          href={href}
          className="rounded-sm underline decoration-dotted underline-offset-2 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {name}
        </Link>
        {secondary ? <span className="ml-2 text-xs font-normal text-muted-foreground">({secondary})</span> : null}
      </h4>
      {attributionNote ? (
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {contributionCopy.attributedAs}: {attributionNote}
        </p>
      ) : null}
      <div className="mt-2">
        <ContributionProvenance subject={provenanceSubject} sourceLabel={sourceLabel} statusLabel={statusLabel} />
      </div>
    </li>
  );
}
