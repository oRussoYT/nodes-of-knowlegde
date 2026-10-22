"use client";

import { motionAllowed } from "./motion";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

// The four Onward steps travel sideways while the page scrolls down (the
// section is pinned). Below 768px, or with reduced motion, they simply stack.
export interface Step {
  title: string;
  body: string;
}

export function HorizontalSteps({ steps, intro }: { steps: readonly Step[]; intro: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const decide = () => setPinned(wide.matches && motionAllowed());
    const t = window.setTimeout(decide, 0);
    wide.addEventListener("change", decide);
    return () => {
      window.clearTimeout(t);
      wide.removeEventListener("change", decide);
    };
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const s = section.current;
    const tr = track.current;
    if (!s || !tr) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = s.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const k = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      const distance = Math.max(0, tr.scrollWidth - window.innerWidth);
      tr.style.transform = `translate3d(${-k * distance}px, 0, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      tr.style.transform = "";
    };
  }, [pinned]);

  return (
    <section
      ref={section}
      aria-labelledby="onward-heading"
      className="relative bg-nk-lime text-nk-ink"
      style={pinned ? { height: `${steps.length * 85 + 100}vh` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden" : "py-20"}>
        <div className="px-6 sm:px-10">{intro}</div>
        <div
          ref={track}
          className={
            pinned
              ? "mt-12 flex w-max gap-6 px-6 will-change-transform sm:px-10"
              : "mt-10 grid gap-4 px-6 sm:px-10"
          }
        >
          {steps.map((step, i) => (
            <article
              key={step.title}
              className={
                "flex flex-col justify-between rounded-3xl bg-nk-ink p-8 text-nk-bone " +
                (pinned ? "h-[52vh] w-[min(34rem,70vw)]" : "min-h-64")
              }
            >
              <span className="font-display text-[7rem] font-bold leading-none tabular-nums text-nk-lime [font-stretch:75%]">
                {i + 1}
              </span>
              <span>
                <h3 className="font-display text-3xl font-bold leading-tight tracking-tight">{step.title}</h3>
                <p className="mt-3 text-lg text-[#c3c8b6]">{step.body}</p>
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
