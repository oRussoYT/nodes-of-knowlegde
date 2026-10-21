import { EmptyState } from "@/components/ui/EmptyState";

import { describePathwaySummary, revelationCopy } from "../copy";
import { buildPersonPathwayView } from "../derive";
import type { PersonPathwayDocument } from "../types";
import { PathwayStepList } from "./PathwayStepList";

// The person-surface bounded-pathway revelation (M8.6) -- the LAST and highest-
// interpretive-risk lens. Given a focal person and a SELECTED target entity
// (chosen via ?pathwayTo, e.g. from a person revealed above), it reveals the
// shortest documented chain of >= 2 explicit-assertion steps connecting them
// through intermediaries, over the heterogeneous canonical assertion graph,
// bounded to a small hop cap. It reads INLINE in the biography's reading spine
// (after the co-presence, lineage, and recurrence engines) -- a vantage that
// opens within the reading; not a destination, no navigation, no console, no
// graph.
//
// It is governed by the ENDPOINT RULE (Spec §3.2): a chain of steps asserts
// NOTHING about its two ends beyond the literal existence of the chain. The
// summary states "a documented chain of N steps connects A and B" and NEVER "A
// is connected to B"; the length is a fact, never a rank; a longer chain is given
// more reserve, not more weight. Four honest states, never collapsed: no target
// chosen; the target is not a readable record; the target is readable but no
// chain within the bound links them (an honest absence, never "not connected");
// or the chain is shown, decomposable step by step. Server Component.
export interface PersonPathwayProps {
  document: PersonPathwayDocument | null;
}

export function PersonPathway({ document }: PersonPathwayProps) {
  const view = buildPersonPathwayView(document);
  const copy = revelationCopy.personPathway;

  return (
    <section aria-labelledby="person-pathway-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="person-pathway-heading" className="text-xl font-medium text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.whatThisShows}</p>
      </div>

      {view.state === "no-target" ? (
        <EmptyState title={copy.noTarget.title} description={copy.noTarget.description} />
      ) : view.state === "target-not-found" ? (
        <EmptyState title={copy.targetNotFound.title} description={copy.targetNotFound.description} />
      ) : view.state === "no-chain" ? (
        <EmptyState title={copy.noChain.title} description={copy.noChain.description} />
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            {view.document ? describePathwaySummary(view.document) : null}
          </p>
          <section aria-labelledby="person-pathway-chain-heading" className="flex flex-col gap-3">
            <h3 id="person-pathway-chain-heading" className="text-sm font-medium text-muted-foreground">
              {copy.chainHeading}
            </h3>
            <PathwayStepList steps={view.document?.steps ?? []} />
          </section>
          <section aria-labelledby="person-pathway-limits-heading" className="mt-2">
            <h3
              id="person-pathway-limits-heading"
              className="text-sm font-medium text-foreground"
            >
              {copy.limitsHeading}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{copy.limits}</p>
          </section>
        </>
      )}
    </section>
  );
}
