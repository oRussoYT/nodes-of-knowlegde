import { formatTemporal } from "@/features/shared/temporal";

import { NAME_TYPE_LABELS, institutionCopy } from "../copy";
import type { OrganizationName } from "../types";

// Historical, former, alternative, acronym, Indigenous, local, and translated
// names -- each shown with its type, the period it was used, and its language
// where known. A name is a first-class historical assertion, never a disposable
// search synonym; the institution did not always have its current name. Server
// Component.
export function InstitutionalNameHistory({ names }: { names: OrganizationName[] }) {
  return (
    <section aria-labelledby="names-heading">
      <h2 id="names-heading" className="text-sm font-medium text-foreground">
        {institutionCopy.nameHistory.heading}
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {names.map((name) => {
          const period = formatTemporal(name.temporal);
          const detail = [NAME_TYPE_LABELS[name.nameType], name.language, period.isUnknown ? null : period.label].filter(
            (part): part is string => Boolean(part),
          );
          return (
            <li key={name.id} className="border-l border-border-default pl-4">
              <p className="text-base font-medium text-foreground">{name.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{detail.join(" · ")}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
