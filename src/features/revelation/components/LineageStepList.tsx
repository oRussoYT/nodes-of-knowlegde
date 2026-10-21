import type { LineageStep } from "../types";
import { NodeDoorway } from "./NodeDoorway";
import { RevealedPeriod } from "./RevealedPeriod";
import { RevealedProvenanceFooter } from "./RevealedProvenanceFooter";

// One direction of a documented lineage (antecedents, successors, mentors, or
// students), rendered as a list of decomposable steps. Each step is a single
// directional relationship Assertion read in its own direction -- "{from} is a
// documented {role} of {to}." -- with BOTH endpoints as doorways back into the
// record, the step's own period, and its provenance one keyboard-operable gesture
// away. A provisional/disputed record shows a calm verification Badge. The step
// asserts only the documented directional relation; nothing about transmission,
// cause, or meaning. Order is the read model's neutral order (depth, then name),
// never a ranking. The group heading is an h3 (under the section's h2); steps are
// list items, so the outline never skips a level. Shared by both M8.3 lineage
// lenses (institution succession and person mentorship). Server Component.

export interface LineageStepListProps {
  headingId: string;
  heading: string;
  steps: LineageStep[];
}

export function LineageStepList({ headingId, heading, steps }: LineageStepListProps) {
  if (steps.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-medium text-muted-foreground">
        {heading}
      </h3>
      <ul className="mt-2 flex flex-col gap-4">
        {steps.map((step) => {
          const role = step.kind.sourceRole.toLowerCase();

          return (
            <li key={step.source.id} className="border-l border-border-default pl-4">
              <p className="text-sm text-foreground">
                <NodeDoorway node={step.from} /> is a documented {role} of{" "}
                <NodeDoorway node={step.to} />.
              </p>
              <RevealedPeriod temporal={step.temporal} />
              <RevealedProvenanceFooter
                provenance={step.provenance}
                subject={`the record from ${step.from.label} to ${step.to.label}`}
                sourceRecordType={step.source.type}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
