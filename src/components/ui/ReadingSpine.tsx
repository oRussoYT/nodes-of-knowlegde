import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

// The canonical reading spine (Production Experience Phase I — page composition).
// Every canonical reading page — Person, Institution, Contribution — lays its
// sections out through THIS one primitive, so the vertical rhythm from the
// identity band down through the documented engines is identical on all three,
// and a reader moving between records feels one continuous historical narrative
// rather than a stack of separate software modules.
//
// It is pure vertical rhythm and nothing else: it imposes no heading, card,
// border, or visual style, and it NEVER flattens the sections it holds. Each
// engine keeps its own <section>, its own quiet heading, its own semantics and
// provenance — Biography stays narrative, Timeline stays chronology,
// Participation stays institutional history, Relationships stay explicit
// assertions, Contributions stay contributions, evidence stays evidence. The
// spine only makes their succession feel like the movements of one document.
// Consolidating the rhythm here (instead of repeating `mt-10` per block on each
// page) also means the reading rhythm can never drift between the three pages.
// Server Component: no interactivity.
export function ReadingSpine({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mt-10 flex flex-col gap-10", className)}>{children}</div>;
}
