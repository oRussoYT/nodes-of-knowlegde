import { describePathwayStepRelation } from "../copy";
import type { PathwayStep } from "../types";
import { NodeDoorway } from "./NodeDoorway";
import { RevealedPeriod } from "./RevealedPeriod";
import { RevealedProvenanceFooter } from "./RevealedProvenanceFooter";

// The ordered steps of ONE documented pathway. Each step is a single explicit
// assertion linking two entities, read in traversal order: "{from} — documented
// {category} ({label}) — {to}", with BOTH endpoints as doorways back into the
// record, the step's own period, and its provenance one keyboard gesture away.
// The list is the chain and nothing more; its order is traversal order, never a
// rank. The chain asserts nothing about its two ends beyond the literal steps
// shown (the endpoint rule) -- that framing lives in the section's summary and
// limits, so each step here reads plainly and structurally. An ordered list (ol)
// makes the sequence legible; steps are list items under the section's headings,
// so the outline never skips a level. Server Component.

export interface PathwayStepListProps {
  steps: PathwayStep[];
}

export function PathwayStepList({ steps }: PathwayStepListProps) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={`${step.source.type}-${step.source.id}-${index}`} className="border-l border-border-default pl-4">
          <p className="text-sm text-foreground">
            <NodeDoorway node={step.from} /> — {describePathwayStepRelation(step)} —{" "}
            <NodeDoorway node={step.to} />.
          </p>
          <RevealedPeriod temporal={step.temporal} />
          <RevealedProvenanceFooter
            provenance={step.provenance}
            subject={`the record linking ${step.from.label} and ${step.to.label}`}
            sourceRecordType={step.source.type}
          />
        </li>
      ))}
    </ol>
  );
}
