import Link from "next/link";

import type { ProjectedNode } from "@/features/network/types";

// The one shared doorway primitive for every revelation lens: a revealed canonical
// node rendered as a link back to its record when it has one, or as plain text
// when it does not (an event carries its title but has no page). Every lens
// previously redeclared this identical helper locally (Doorway / StepEndpoint /
// PersonDoorway / OccurrenceTitle); centralising it means the constitutional
// "every projected node is a doorway back to the record" contract -- and its
// exact rendering -- lives in exactly one place. Server Component.
export function NodeDoorway({ node }: { node: ProjectedNode }) {
  return node.href ? (
    <Link href={node.href} className="underline underline-offset-2">
      {node.label}
    </Link>
  ) : (
    <span>{node.label}</span>
  );
}
