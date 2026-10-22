"use client";

import { motionAllowed } from "./motion";

import { useEffect, useRef, useState } from "react";

// The home page's one orchestrated moment: scrolling through this section
// draws a fictional lineage from a field station's founder (1979) to four
// generations of documented students (2026). Every line stands for a thesis
// or a documented period. Fictional demonstration data -- no real people.
// With reduced motion the finished drawing is shown, no scrolling needed.

interface Node {
  id: string;
  x: number;
  y: number;
  year: number;
  from?: string;
  label?: string;
}

const NODES: Node[] = [
  { id: "a", x: 500, y: 60, year: 1979, label: "Station founder" },
  { id: "b", x: 270, y: 170, year: 1986, from: "a" },
  { id: "c", x: 500, y: 170, year: 1989, from: "a" },
  { id: "d", x: 730, y: 170, year: 1993, from: "a" },
  { id: "e", x: 150, y: 285, year: 1997, from: "b" },
  { id: "f", x: 330, y: 285, year: 2001, from: "b" },
  { id: "g", x: 500, y: 285, year: 2003, from: "c" },
  { id: "h", x: 660, y: 285, year: 2006, from: "d" },
  { id: "i", x: 850, y: 285, year: 2009, from: "d" },
  { id: "j", x: 90, y: 400, year: 2011, from: "e" },
  { id: "k", x: 230, y: 400, year: 2014, from: "e" },
  { id: "l", x: 400, y: 400, year: 2016, from: "f" },
  { id: "m", x: 560, y: 400, year: 2018, from: "g" },
  { id: "n", x: 700, y: 400, year: 2020, from: "h" },
  { id: "o", x: 840, y: 400, year: 2022, from: "i" },
  { id: "p", x: 950, y: 400, year: 2025, from: "i" },
];

const FIRST = 1979;
const LAST = 2026;
const BY_ID = new Map(NODES.map((n) => [n.id, n]));

function curve(n: Node): string | null {
  const f = n.from ? BY_ID.get(n.from) : undefined;
  if (!f) return null;
  const my = (f.y + n.y) / 2;
  return `M${f.x} ${f.y} C ${f.x} ${my}, ${n.x} ${my}, ${n.x} ${n.y}`;
}

export function LineageScrub() {
  const sectionRef = useRef<HTMLElement>(null);
  const [year, setYear] = useState(LAST);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    // Reduced motion: keep the finished drawing (the initial state).
    if (!motionAllowed()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const k = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      setYear(FIRST + k * (LAST - FIRST));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const shown = NODES.filter((n) => year >= n.year).length;

  return (
    <section ref={sectionRef} aria-labelledby="lineage-heading" className="relative h-[200vh]">
      <div className="sticky top-0 flex min-h-screen flex-col justify-center py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="lineage-heading" className="max-w-[22ch] font-display text-3xl font-bold leading-[1.02] tracking-tight text-nk-bone sm:text-5xl">
            Scroll to watch a lineage being documented
          </h2>
          <p
            aria-hidden="true"
            className="font-display text-6xl font-bold leading-none tabular-nums text-nk-lime [font-stretch:75%] sm:text-8xl"
          >
            {Math.round(year)}
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-nk-ink-3 bg-nk-ink-2">
          <svg
            viewBox="0 0 1000 460"
            role="img"
            aria-label="A fictional field station in 1979 with one supervisor; by 2026, four generations of documented students, each line a thesis."
            className="block h-auto max-h-[60vh] w-full"
          >
            <g fill="none" stroke="var(--nk-lime)" strokeWidth={2.4} strokeLinecap="round">
              {NODES.map((n) => {
                const d = curve(n);
                if (!d) return null;
                const k = Math.min(1, Math.max(0, (year - n.year + 3) / 3));
                return <path key={n.id} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />;
              })}
            </g>
            {NODES.map((n) => {
              const on = year >= n.year;
              return (
                <g key={n.id} style={{ transition: "opacity 300ms", opacity: on ? 1 : 0 }}>
                  <circle cx={n.x} cy={n.y} r={n.from ? 9 : 13} fill="var(--nk-bone)" />
                  <text
                    x={n.x}
                    y={n.y - 18}
                    textAnchor="middle"
                    fontSize={20}
                    fill="var(--nk-moss)"
                  >
                    {n.label ?? n.year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm text-nk-moss">
          <p>Every line is a thesis or a documented period. Fictional example.</p>
          <p aria-hidden="true" className="tabular-nums">
            {shown === 1 ? "1 person" : `${shown} people, ${shown - 1} documented links`}
          </p>
        </div>
      </div>
    </section>
  );
}
