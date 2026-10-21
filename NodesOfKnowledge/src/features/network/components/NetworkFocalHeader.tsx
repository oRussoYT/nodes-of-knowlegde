import Link from "next/link";

import { connectionCountLabel, networkCopy, nodeTypeNoun } from "../copy";
import type { ProjectedNode } from "../types";

// The focal record band for a network page: the record the neighbourhood is
// centred on, a plain statement of what the network currently shows, an honest
// count of documented connections, and a link back into the full canonical
// reading page (so the network deepens the reading flow rather than dead-ending).
// The focal label is the page's single h1. Server Component.
export interface NetworkFocalHeaderProps {
  focal: ProjectedNode;
  connectionCount: number;
  whatThisShows: string;
}

export function NetworkFocalHeader({ focal, connectionCount, whatThisShows }: NetworkFocalHeaderProps) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {networkCopy.index.title}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{focal.label}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{whatThisShows}</p>
      <p className="mt-2 text-sm text-muted-foreground">{connectionCountLabel(connectionCount)}</p>
      {focal.href ? (
        <p className="mt-3">
          <Link href={focal.href} className="text-sm font-medium text-foreground underline underline-offset-2">
            Read the full {nodeTypeNoun(focal.type)} record
          </Link>
        </p>
      ) : null}
    </header>
  );
}
