import Link from "next/link";

import type { RevelationHighlight } from "../highlights";

const nf = new Intl.NumberFormat("en");

// The revelations of a person's record, made visible at the top of the page:
// a few large documented facts, each a door to the section that shows its
// records. Facts, not a score.
export function RevelationHighlights({ highlights, personName }: { highlights: RevelationHighlight[]; personName: string }) {
  if (highlights.length === 0) return null;
  return (
    <section
      aria-labelledby="revelations-heading"
      data-theme="dark"
      className="mt-8 overflow-hidden rounded-3xl bg-nk-ink px-6 py-7 text-nk-bone sm:px-8"
    >
      <h2 id="revelations-heading" className="flex items-center gap-3 text-sm font-medium text-[#c3c8b6]">
        <span aria-hidden="true" className="size-2 rounded-full bg-nk-lime" />
        What the record reveals about {personName}
      </h2>
      <ul className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((h) => (
          <li key={h.key}>
            <Link href={h.href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-lime">
              <span className="block font-display text-5xl font-bold leading-none tabular-nums text-nk-lime [font-stretch:80%]">
                {nf.format(h.value)}
              </span>
              <span className="mt-2 block text-[15px] text-nk-bone group-hover:underline group-hover:underline-offset-4">{h.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-[#c3c8b6]">
        Counted only from documented records, each one open below with its source. Nothing here is ranked or compared.
      </p>
    </section>
  );
}
