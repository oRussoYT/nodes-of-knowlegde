"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { trajectoryCopy } from "../copy";
import { presentInYear, type PresenceRow } from "../derive";

// Screen 10, "stop at a year": choose a year and see who the record documents
// at the same institution at the same time. Only documented co-presence
// (cohort overlaps), grouped by institution, alphabetical -- never ranked.
// The smallest possible client boundary: the rows are computed server-side
// and handed over as plain serializable data.
export function YearExplorer({
  rows,
  minYear,
  maxYear,
  initialYear,
}: {
  rows: PresenceRow[];
  minYear: number;
  maxYear: number;
  initialYear: number;
}) {
  const [year, setYear] = useState(initialYear);
  const inputId = useId();
  const groups = useMemo(() => presentInYear(rows, year), [rows, year]);
  const total = groups.reduce((n, g) => n + g.people.length, 0);

  return (
    <section aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} className="text-sm font-medium text-foreground">
        {trajectoryCopy.year.heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{trajectoryCopy.year.description}</p>

      <div className="mt-4 flex items-center gap-4">
        <label htmlFor={inputId} className="text-sm text-foreground">
          {trajectoryCopy.year.label}
        </label>
        <input
          id={inputId}
          type="range"
          min={minYear}
          max={maxYear}
          step={1}
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="flex-1 accent-[var(--color-accent)]"
        />
        <output htmlFor={inputId} className="w-14 text-right text-lg font-semibold tabular-nums text-foreground">
          {year}
        </output>
      </div>

      <p className="mt-4 text-sm text-foreground" aria-live="polite">
        {total === 0 ? trajectoryCopy.year.nobody : trajectoryCopy.year.countSuffix(total)}
      </p>

      {groups.length > 0 ? (
        <div className="mt-3 flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.organizationId} className="rounded-md border border-border-default bg-surface px-4 py-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.organizationLabel}
              </h3>
              <ul className="mt-2 flex flex-col gap-1">
                {group.people.map((person) => (
                  <li key={person.personId} className="text-sm">
                    {person.personHref ? (
                      <Link href={person.personHref} className="underline underline-offset-2">
                        {person.personLabel}
                      </Link>
                    ) : (
                      person.personLabel
                    )}
                    <span className="text-muted-foreground"> · {person.capacityLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
