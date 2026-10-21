import Link from "next/link";

import { describeRecurrenceGroup, revelationSourceRecordLabel } from "../copy";
import type { RecurrenceGroup } from "../types";
import { NodeDoorway } from "./NodeDoorway";
import { RevealedPeriod } from "./RevealedPeriod";
import { RevealedProvenanceFooter } from "./RevealedProvenanceFooter";

// One list of documented recurrences (shared by the person and institution
// surfaces). Each group is a structural phenomenon documented >= 2 times, headed
// by its plain count ("Documented 3 times as Director at ...") -- a count of
// records, NEVER a rank or a measure of importance. Under each heading the
// distinct documented occurrences read in time order (undated last), each
// decomposable: an occurrence carries its own period and provenance, and -- where
// it points at its own canonical record -- a doorway (a contribution links to its
// page; an event shows its title; a role occurrence has no per-occurrence entity,
// its institution being the group's doorway). Groups appear in the read model's
// neutral order (category, then label), never ordered by count. The group heading
// is an h3 (under the section's h2); occurrences are list items, so the outline
// never skips a level. Server Component.

export interface RecurrenceGroupListProps {
  groups: RecurrenceGroup[];
  /** A stable id prefix so each group heading has a unique, section-scoped id. */
  idPrefix: string;
}

export function RecurrenceGroupList({ groups, idPrefix }: RecurrenceGroupListProps) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, index) => {
        const headingId = `${idPrefix}-group-${index}`;
        return (
          <section key={headingId} aria-labelledby={headingId}>
            <h3 id={headingId} className="text-sm font-medium text-foreground">
              {group.category === "role" && group.anchor?.href ? (
                <>
                  Documented {group.count} times as {group.label} at{" "}
                  <Link href={group.anchor.href} className="underline underline-offset-2">
                    {group.anchor.label}
                  </Link>
                  .
                </>
              ) : (
                describeRecurrenceGroup(group)
              )}
            </h3>

            <ul className="mt-2 flex flex-col gap-4">
              {group.occurrences.map((occ) => {
                const recordLabel = revelationSourceRecordLabel(occ.source.type);
                const subject = occ.node ? `the record of ${occ.node.label}` : `this ${recordLabel}`;

                return (
                  <li key={occ.source.id} className="border-l border-border-default pl-4">
                    {occ.node ? (
                      <p className="text-sm text-foreground">
                        <NodeDoorway node={occ.node} />
                      </p>
                    ) : null}
                    <RevealedPeriod temporal={occ.temporal} />
                    <RevealedProvenanceFooter
                      provenance={occ.provenance}
                      subject={subject}
                      sourceRecordType={occ.source.type}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
