import Link from "next/link";

// The honest entry point into a record's local network neighbourhood, added to
// each canonical Person / Institution / Contribution reading page so the
// museum-like reading flow deepens rather than dead-ends. It links only to the
// record's own one-hop network (an explicit, documented surface) and never
// implies unsupported relationships or fabricates "related reading". Server
// Component.
export interface NetworkEntryLinkProps {
  href: string;
  recordNoun: string;
}

export function NetworkEntryLink({ href, recordNoun }: NetworkEntryLinkProps) {
  const headingId = "network-entry-heading";
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        Knowledge Network
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        See how this {recordNoun} connects to the people, institutions, and contributions preserved
        on this platform, through the explicit records that link them.
      </p>
      <p className="mt-3">
        <Link href={href} className="text-sm font-medium text-foreground underline underline-offset-2">
          Open the network for this {recordNoun}
        </Link>
      </p>
    </section>
  );
}
